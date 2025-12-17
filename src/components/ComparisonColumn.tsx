import React, { useMemo } from 'react';
import { RawSalesDataRow } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonColumnProps {
    entity: ComparisonEntity;
    allRawData: RawSalesDataRow[];
    onDrilldown: (entity: ComparisonEntity) => void;
    drilldownPath: ComparisonEntity[];
}

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

const KPICard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-slate-700/20 backdrop-blur-sm p-3 rounded-xl text-center h-full flex flex-col justify-center border border-slate-700/30 hover:border-slate-600/50 transition-colors ${className}`}>
        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 truncate" title={title}>{title}</h4>
        <div className="text-white relative z-10">{children}</div>
    </div>
);


const ComparisonColumn: React.FC<ComparisonColumnProps> = ({ entity, allRawData, onDrilldown, drilldownPath }) => {

    const { stats, parentTypeLabel } = useMemo(() => {
        const defaultStats = {
            sales2024: 0, sales2025: 0, growth: 0,
            cash2024: 0, cash2025: 0, cashGrowth: 0,
            credit2024: 0, credit2025: 0, creditGrowth: 0,
            itemCount2024: 0, itemCount2025: 0, totalItemsForEntity: 0,
            contribution: 0,
            pareto: { topCount: 0, salesPercent: 0 },
            newItems: { count: 0, sales: 0 },
            lostItems: { count: 0, sales2024: 0 },
            assortmentShare: 0,
        };

        let contextualData = allRawData;
        drilldownPath.forEach(pathEntity => {
            const pathKey: keyof RawSalesDataRow = pathEntity.type === 'divisions' ? 'DIVISION' : pathEntity.type === 'departments' ? 'DEPARTMENT' : pathEntity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            contextualData = contextualData.filter(row => row[pathKey] === pathEntity.name);
        });
        
        const key: keyof RawSalesDataRow = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : entity.type === 'brands' ? 'BRAND' : entity.type === 'branches' ? 'BRANCH NAME' : 'ITEM DESCRIPTION';
        const data = contextualData.filter(row => row[key] === entity.name);

        if (data.length === 0) {
            return { stats: defaultStats, parentTypeLabel: 'Total' };
        }

        const items: { [key: string]: { s24: number, s25: number } } = {};
        let totalSales2024 = 0, totalCash2024 = 0, totalCredit2024 = 0;
        let totalSales2025 = 0, totalCash2025 = 0, totalCredit2025 = 0;
        
        data.forEach(row => {
            totalSales2024 += row['SALES2024'];
            totalCash2024 += row['SALES2024_CASH'] || 0;
            totalCredit2024 += row['SALES2024_CREDIT'] || 0;

            totalSales2025 += row['SALES2025'];
            totalCash2025 += row['SALES2025_CASH'] || 0;
            totalCredit2025 += row['SALES2025_CREDIT'] || 0;

            if (row['ITEM DESCRIPTION']) {
                items[row['ITEM DESCRIPTION']] = items[row['ITEM DESCRIPTION']] || { s24: 0, s25: 0 };
                items[row['ITEM DESCRIPTION']].s24 += row['SALES2024'];
                items[row['ITEM DESCRIPTION']].s25 += row['SALES2025'];
            }
        });

        const items24 = new Set(Object.entries(items).filter(([,d]) => d.s24 > 0).map(([name]) => name));
        const items25 = new Set(Object.entries(items).filter(([,d]) => d.s25 > 0).map(([name]) => name));

        let parentData: RawSalesDataRow[] = allRawData;
        let parentTypeLabel = 'Company';
        const parentEntity = drilldownPath.length > 0 ? drilldownPath[drilldownPath.length - 1] : null;

        if (parentEntity) {
            parentData = contextualData; // The parent's scope is the current context
            parentTypeLabel = parentEntity.type.charAt(0).toUpperCase() + parentEntity.type.slice(1, -1);
        }
        
        const parentSales2025 = parentData.reduce((sum, row) => sum + row.SALES2025, 0);
        const parentItems25 = new Set(parentData.filter(r => r.SALES2025 > 0 && r['ITEM DESCRIPTION']).map(r => r['ITEM DESCRIPTION'])).size;

        const sortedItems = Object.values(items).map(item => item.s25).filter(sales => sales > 0).sort((a, b) => b - a);
        const totalItemContributors = sortedItems.length;
        const top20PercentCount = totalItemContributors > 0 ? Math.max(1, Math.ceil(totalItemContributors * 0.20)) : 0;
        const count = Math.min(top20PercentCount, totalItemContributors);
        const salesFromTop20Percent = sortedItems.slice(0, count).reduce((sum, sales) => sum + sales, 0);
        const paretoSalesPercent = totalSales2025 > 0 ? (salesFromTop20Percent / totalSales2025) * 100 : 0;

        let newItemsCount = 0, newItemsSales = 0, lostItemsCount = 0, lostItemsSales2024 = 0;
        Object.values(items).forEach(({s24, s25}) => {
            if(s25 > 0 && s24 === 0) { newItemsCount++; newItemsSales += s25; }
            if(s24 > 0 && s25 === 0) { lostItemsCount++; lostItemsSales2024 += s24; }
        });

        const totalItemsForEntity = new Set(data.filter(row => row['ITEM DESCRIPTION']).map(row => row['ITEM DESCRIPTION'])).size;

        const finalStats = {
            sales2024: totalSales2024, sales2025: totalSales2025,
            growth: calculateGrowth(totalSales2025, totalSales2024),
            cash2024: totalCash2024, cash2025: totalCash2025, cashGrowth: calculateGrowth(totalCash2025, totalCash2024),
            credit2024: totalCredit2024, credit2025: totalCredit2025, creditGrowth: calculateGrowth(totalCredit2025, totalCredit2024),
            itemCount2024: items24.size, itemCount2025: items25.size,
            totalItemsForEntity, contribution: parentSales2025 > 0 ? (totalSales2025 / parentSales2025) * 100 : 0,
            pareto: { topCount: count, salesPercent: paretoSalesPercent },
            newItems: { count: newItemsCount, sales: newItemsSales },
            lostItems: { count: lostItemsCount, sales2024: lostItemsSales2024 },
            assortmentShare: parentItems25 > 0 ? (items25.size / parentItems25) * 100 : 0,
        };
        return { stats: finalStats, parentTypeLabel };
    }, [entity, allRawData, drilldownPath]);

    const entityTypeLabel = entity.type.slice(0, -1);
    const isDrillable = entity.type !== 'items';

    const renderEntityName = () => {
        const content = (
             <div className="flex flex-col">
                <span className="text-[9px] uppercase font-black tracking-[0.3em] text-sky-500/80 mb-1">{entityTypeLabel}</span>
                <h3 className="text-lg font-black text-white truncate tracking-tight leading-tight group-hover:text-sky-300 transition-colors" title={entity.name}>{entity.name}</h3>
             </div>
        );

        if (isDrillable) {
            return (
                 <button 
                    onClick={() => onDrilldown(entity)} 
                    className="text-left w-full h-full p-4 rounded-2xl hover:bg-slate-700/40 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 group relative overflow-hidden"
                    title={`Drill down into ${entity.name}`}
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                    {content}
                 </button>
            );
        }
        return <div className="p-4" title={entity.name}>{content}</div>;
    };

    return (
        <div className="bg-gradient-to-r from-slate-800/40 to-slate-900/40 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-700/40 flex flex-col md:flex-row items-stretch gap-4 w-full hover:border-sky-500/40 transition-all hover:shadow-sky-500/5">
            <div className="flex-shrink-0 w-full md:w-56 flex items-center border-r border-slate-700/30 pr-2">
                {renderEntityName()}
            </div>
            <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
                <KPICard title="Current Revenue">
                    <p className="text-xl font-numeric font-black text-white">{formatNumberAbbreviated(stats.sales2025)}</p>
                </KPICard>
                <KPICard title="Overall Growth">
                    <GrowthIndicator value={stats.growth} className="text-xl" />
                </KPICard>
                <KPICard title="Cash Growth">
                    <GrowthIndicator value={stats.cashGrowth} className="text-xl text-emerald-400" />
                </KPICard>
                <KPICard title="Credit Growth">
                    <GrowthIndicator value={stats.creditGrowth} className="text-xl text-indigo-400" />
                </KPICard>
                <KPICard title={`Cont. to ${parentTypeLabel}`}>
                    <p className="text-xl font-numeric font-black text-sky-400">{stats.contribution.toFixed(1)}%</p>
                </KPICard>
                 <KPICard title="Total Inventory">
                    <p className="text-xl font-numeric font-black text-slate-200">
                        {formatNumber(stats.itemCount2025)}
                    </p>
                </KPICard>
                <KPICard title="New Item Count">
                    <p className="text-xl font-numeric font-black text-emerald-400">{formatNumber(stats.newItems.count)}</p>
                </KPICard>
            </div>
        </div>
    );
};

export default ComparisonColumn;