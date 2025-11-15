import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { RawSalesDataRow } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { CustomYAxisTick } from './charts/CustomYAxisTick';

interface ComparisonColumnProps {
    entity: ComparisonEntity;
    data: RawSalesDataRow[];
    onRemove: () => void;
    allRawData: RawSalesDataRow[]; // For calculating total for contribution
}

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

const KPICard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-700/50 p-4 rounded-lg text-center">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
        <div className="text-white">{children}</div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-lg shadow-lg text-sm">
                <p className="font-bold text-green-300 mb-1">{label}</p>
                <p className="text-teal-400">2025 Sales: {formatNumberAbbreviated(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

const ComparisonColumn: React.FC<ComparisonColumnProps> = ({ entity, data, onRemove, allRawData }) => {

    const stats = useMemo(() => {
        const result = data.reduce((acc, row) => {
            acc.sales2024 += row.SALES2024;
            acc.sales2025 += row.SALES2025;
            if(row.SALES2025 > 0) acc.activeItems.add(row['ITEM DESCRIPTION']);
            return acc;
        }, { sales2024: 0, sales2025: 0, activeItems: new Set<string>() });

        const totalSales2025 = allRawData.reduce((sum, row) => sum + row.SALES2025, 0);

        return {
            ...result,
            growth: calculateGrowth(result.sales2025, result.sales2024),
            itemCount: result.activeItems.size,
            contribution: totalSales2025 > 0 ? (result.sales2025 / totalSales2025) * 100 : 0
        };
    }, [data, allRawData]);

    const breakdownData = useMemo(() => {
        if (!entity || data.length === 0) return [];
        
        let breakdownKey: keyof RawSalesDataRow;
        switch (entity.type) {
            case 'divisions': breakdownKey = 'DEPARTMENT'; break;
            case 'departments': breakdownKey = 'CATEGORY'; break;
            case 'categories': breakdownKey = 'BRAND'; break;
            default: breakdownKey = 'ITEM DESCRIPTION'; // Brands, Branches, Items break down to items
        }

        const breakdownMap = new Map<string, number>();
        data.forEach(row => {
            const key = row[breakdownKey];
            if (key) {
                breakdownMap.set(key, (breakdownMap.get(key) || 0) + row.SALES2025);
            }
        });

        return Array.from(breakdownMap.entries())
            .map(([name, sales2025]) => ({ name, sales2025 }))
            .sort((a, b) => b.sales2025 - a.sales2025)
            .slice(0, 10); // Cap at top 10 for performance and clarity
    }, [entity, data]);

    const entityTypeLabel = entity.type.slice(0, -1);

    return (
        <div className="bg-slate-800/50 p-4 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-4 h-full">
            <div className="flex items-start justify-between">
                <div>
                    <span className="text-xs uppercase font-bold text-sky-400">{entityTypeLabel}</span>
                    <h3 className="text-lg font-extrabold text-white truncate" title={entity.name}>{entity.name}</h3>
                </div>
                <button onClick={onRemove} className="filter-pill-remove" aria-label={`Remove ${entity.name}`}>&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <KPICard title="Total Sales (2025)">
                    <p className="text-2xl font-bold">{formatNumberAbbreviated(stats.sales2025)}</p>
                </KPICard>
                <KPICard title="YoY Growth %">
                    <GrowthIndicator value={stats.growth} className="text-2xl" />
                </KPICard>
                 <KPICard title="Active Items">
                    <p className="text-2xl font-bold">{formatNumber(stats.itemCount)}</p>
                </KPICard>
                 <KPICard title="Contrib. to Total Sales">
                    <p className="text-2xl font-bold">{stats.contribution.toFixed(2)}%</p>
                </KPICard>
            </div>
             <div className="flex-1 h-[350px]">
                <h4 className="text-sm font-bold text-slate-300 text-center mb-2">Top {breakdownData.length} Contributors (2025 Sales)</h4>
                {breakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={breakdownData} margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                            <XAxis type="number" stroke="#9ca3af" tickFormatter={formatNumberAbbreviated} tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" stroke="#9ca3af" width={80} tick={<CustomYAxisTick maxChars={12} />} interval={0} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }} />
                            <Bar dataKey="sales2025" name="2025 Sales" >
                                {breakdownData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={'#38bdf8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">No breakdown data available.</div>
                )}
            </div>
        </div>
    );
};

export default ComparisonColumn;