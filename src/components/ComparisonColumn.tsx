import React, { useMemo } from 'react';
import { RawSalesDataRow, ProcessedData } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonColumnProps {
    entity: ComparisonEntity;
    data: RawSalesDataRow[];
    onRemove: () => void;
    allRawData: RawSalesDataRow[];
    processedData: ProcessedData;
}

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

const KPICard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-slate-700/50 p-3 rounded-lg text-center h-full flex flex-col justify-center ${className}`}>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h4>
        <div className="text-white">{children}</div>
    </div>
);


const ComparisonColumn: React.FC<ComparisonColumnProps> = ({ entity, data, onRemove, allRawData, processedData }) => {

    const stats = useMemo(() => {
        const defaultStats = {
            sales2024: 0, sales2025: 0, growth: 0,
            itemCount2024: 0, itemCount2025: 0, totalItemsForEntity: 0,
            contribution: 0,
            pareto: { topCount: 0, salesPercent: 0 },
            newItems: { count: 0, sales: 0 },
            lostItems: { count: 0, sales2024: 0 },
            avgSalesPerItem: 0,
            availability2024: 0, availability2025: 0,
        };

        if (data.length === 0) {
            return defaultStats;
        }

        const items: { [key: string]: { s24: number, s25: number } } = {};
        let totalSales2024 = 0;
        let totalSales2025 = 0;
        
        data.forEach(row => {
            const item = row['ITEM DESCRIPTION'];
            const s24 = row['SALES2024'];
            const s25 = row['SALES2025'];

            totalSales2024 += s24;
            totalSales2025 += s25;

            if (item) {
                items[item] = items[item] || { s24: 0, s25: 0 };
                items[item].s24 += s24;
                items[item].s25 += s25;
            }
        });

        const sortedItems = Object.values(items)
            .map(item => item.s25)
            .filter(sales => sales > 0)
            .sort((a, b) => b - a);

        const totalItemContributors = sortedItems.length;
        const top20PercentCount = totalItemContributors > 0 ? Math.max(1, Math.ceil(totalItemContributors * 0.20)) : 0;
        const count = Math.min(top20PercentCount, totalItemContributors);
        const salesFromTop20Percent = sortedItems.slice(0, count).reduce((sum, sales) => sum + sales, 0);
        const paretoSalesPercent = totalSales2025 > 0 ? (salesFromTop20Percent / totalSales2025) * 100 : 0;

        let newItemsCount = 0, newItemsSales = 0;
        let lostItemsCount = 0, lostItemsSales2024 = 0;
        let items24 = new Set<string>();
        let items25 = new Set<string>();

        Object.entries(items).forEach(([name, {s24, s25}]) => {
            if(s24 > 0) items24.add(name);
            if(s25 > 0) items25.add(name);
            if(s25 > 0 && s24 === 0) { newItemsCount++; newItemsSales += s25; }
            if(s24 > 0 && s25 === 0) { lostItemsCount++; lostItemsSales2024 += s24; }
        });
        
        const totalSalesAllData2025 = allRawData.reduce((sum, row) => sum + row.SALES2025, 0);

        let key: keyof RawSalesDataRow;
        switch (entity.type) {
            case 'divisions': key = 'DIVISION'; break;
            case 'departments': key = 'DEPARTMENT'; break;
            case 'categories': key = 'CATEGORY'; break;
            case 'brands': key = 'BRAND'; break;
            case 'branches': key = 'BRANCH NAME'; break;
            case 'items': key = 'ITEM DESCRIPTION'; break;
        }

        const totalItemsForEntity = new Set(
            allRawData
                .filter(row => row[key] === entity.name && row['ITEM DESCRIPTION'])
                .map(row => row['ITEM DESCRIPTION'])
        ).size;
        
        const availability2024 = processedData.itemCount2024 > 0 
            ? (items24.size / processedData.itemCount2024) * 100 
            : 0;
            
        const availability2025 = processedData.itemCount2025 > 0 
            ? (items25.size / processedData.itemCount2025) * 100 
            : 0;

        return {
            sales2024: totalSales2024,
            sales2025: totalSales2025,
            growth: calculateGrowth(totalSales2025, totalSales2024),
            itemCount2024: items24.size,
            itemCount2025: items25.size,
            totalItemsForEntity,
            contribution: totalSalesAllData2025 > 0 ? (totalSales2025 / totalSalesAllData2025) * 100 : 0,
            pareto: { topCount: count, salesPercent: paretoSalesPercent },
            newItems: { count: newItemsCount, sales: newItemsSales },
            lostItems: { count: lostItemsCount, sales2024: lostItemsSales2024 },
            avgSalesPerItem: items25.size > 0 ? totalSales2025 / items25.size : 0,
            availability2024,
            availability2025,
        };
    }, [data, allRawData, entity, processedData]);


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
            <div className="grid grid-cols-2 gap-3 flex-grow">
                <KPICard title="Total Sales (2025)" className="col-span-2">
                    <p className="text-3xl font-bold">{formatNumberAbbreviated(stats.sales2025)}</p>
                    <p className="text-sm text-slate-400">2024: {formatNumberAbbreviated(stats.sales2024)}</p>
                </KPICard>
                <KPICard title="YoY Growth %">
                    <GrowthIndicator value={stats.growth} className="text-2xl" />
                </KPICard>
                <KPICard title="Contrib. to Total Sales">
                    <p className="text-2xl font-bold">{stats.contribution.toFixed(2)}%</p>
                </KPICard>
                 <KPICard title="Active Items">
                    <p className="text-xl font-bold">
                        {formatNumber(stats.itemCount2025)}
                        <span className="text-base text-slate-400"> / {formatNumber(stats.totalItemsForEntity)}</span>
                    </p>
                    <GrowthIndicator value={stats.itemCount2025 - stats.itemCount2024} unit="" />
                </KPICard>
                 <KPICard title="Availability %">
                    <p className="text-xl font-bold">{stats.availability2025.toFixed(2)}%</p>
                    <p className="text-sm text-slate-400">2024: {stats.availability2024.toFixed(2)}%</p>
                </KPICard>
                 <KPICard title="Avg Sales / Item">
                    <p className="text-2xl font-bold">{formatNumberAbbreviated(stats.avgSalesPerItem)}</p>
                </KPICard>
                <KPICard title="Pareto Items (Top 20%)">
                    <p className="text-sm">Top <b>{formatNumber(stats.pareto.topCount)}</b> items generate <b>{stats.pareto.salesPercent.toFixed(1)}%</b> of this entity's sales.</p>
                </KPICard>
                <KPICard title="New Items (2025)">
                    <p className="text-xl font-bold text-green-400">{formatNumber(stats.newItems.count)}</p>
                    <p className="text-xs text-slate-400">Sales: {formatNumberAbbreviated(stats.newItems.sales)}</p>
                </KPICard>
                <KPICard title="Lost Items (2024)">
                    <p className="text-xl font-bold text-rose-400">{formatNumber(stats.lostItems.count)}</p>
                    <p className="text-xs text-slate-400">Sales: {formatNumberAbbreviated(stats.lostItems.sales2024)}</p>
                </KPICard>
            </div>
        </div>
    );
};

export default ComparisonColumn;