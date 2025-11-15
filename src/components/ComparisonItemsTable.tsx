import React, { useState, useMemo } from 'react';
import { RawSalesDataRow } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonItemsTableProps {
    itemsData: any[];
    comparisonData: { entity: ComparisonEntity; data: RawSalesDataRow[] }[];
}

type SortableKeys = 'name' | 'code' | 'sales2024' | 'sales2025' | 'growth' | 'contribution2024' | 'contribution2025';

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

const ContributionCell: React.FC<{ value: number }> = ({ value }) => {
    if (isNaN(value)) return <span className="text-right block w-full">-</span>;
    return (
        <div className="flex items-center justify-end gap-2 w-full">
            <span className="font-mono w-14 text-right">{value.toFixed(2)}%</span>
            <div className="w-24 bg-slate-600 rounded-full h-2.5 flex-shrink-0">
                <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
        </div>
    );
};

const ComparisonItemsTable: React.FC<ComparisonItemsTableProps> = ({ itemsData, comparisonData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const entityTotals = useMemo(() => {
        const totals = new Map<string, { sales2024: number; sales2025: number }>();
        comparisonData.forEach(({ entity, data }) => {
            const key = `${entity.type.slice(0, 4)}: ${entity.name}`;
            const entityTotal = data.reduce((acc, row) => {
                acc.sales2024 += row.SALES2024;
                acc.sales2025 += row.SALES2025;
                return acc;
            }, { sales2024: 0, sales2025: 0 });
            totals.set(key, entityTotal);
        });
        return totals;
    }, [comparisonData]);
    
    const processedItemsData = useMemo(() => {
        return itemsData.map(item => {
            const growth = calculateGrowth(item.sales2025, item.sales2024);
            // Contribution is complex with multiple parents, for simplicity, we show raw values
            // and growth. A more detailed contribution would require picking a single parent context.
            // Let's calculate an average or aggregate contribution if needed, but for now, it's relative to its immediate parent.
            // This part is tricky because an item can belong to multiple compared entities.
            // Example: Item X is in Brand A and Brand B.
            // We'll calculate contribution based on the first parent context.
            const firstParentKey = item.parentEntity.split(' | ')[0];
            const parentTotals = entityTotals.get(firstParentKey) || { sales2024: 0, sales2025: 0 };

            return {
                ...item,
                growth,
                contribution2024: parentTotals.sales2024 > 0 ? (item.sales2024 / parentTotals.sales2024) * 100 : 0,
                contribution2025: parentTotals.sales2025 > 0 ? (item.sales2025 / parentTotals.sales2025) * 100 : 0,
            };
        });
    }, [itemsData, entityTotals]);


    const filteredAndSortedData = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        
        const filtered = searchTerm
            ? processedItemsData.filter(item =>
                item.name.toLowerCase().includes(lowercasedTerm) ||
                item.code.toLowerCase().includes(lowercasedTerm) ||
                item.parentEntity.toLowerCase().includes(lowercasedTerm)
            )
            : processedItemsData;

        return [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [processedItemsData, searchTerm, sortConfig]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const columns = [
        { key: 'code', header: 'Item Code' },
        { key: 'name', header: 'Item Description' },
        { key: 'parentEntity', header: 'Comparison Group' },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true },
        { key: 'contribution2025', header: 'Contrib % (Group)', isNumeric: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
    ];

    return (
        <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white">Aggregated Items View</h3>
                <div className="relative w-full sm:max-w-xs">
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300 table-sortable">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0">
                        <tr>
                            <th className="p-3">No.</th>
                            {columns.map(col => (
                                <th key={col.key} scope="col" className={`p-3 cursor-pointer ${col.isNumeric ? 'text-right' : 'text-left'}`} onClick={() => requestSort(col.key as SortableKeys)}>
                                    {col.header} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={item.code} className="hover:bg-slate-700/50 transition-colors text-sm">
                                <td className="p-3 text-slate-400">{index + 1}</td>
                                {columns.map(col => (
                                     <td key={col.key} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                        {(() => {
                                            const value = item[col.key as keyof typeof item];
                                            switch (col.key) {
                                                case 'sales2024': case 'sales2025': return formatNumberAbbreviated(value as number);
                                                case 'contribution2025': return <ContributionCell value={value as number} />;
                                                case 'growth': return <GrowthIndicator value={value as number} />;
                                                case 'parentEntity': return <span className="text-xs text-slate-400 truncate" title={value}>{value}</span>;
                                                default: return <span title={value}>{value}</span>;
                                            }
                                        })()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAndSortedData.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        No items match your criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComparisonItemsTable;
