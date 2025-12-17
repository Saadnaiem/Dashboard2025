import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonItemsTableProps {
    itemsData: any[];
    comparisonData: { entity: ComparisonEntity; data: RawSalesDataRow[] }[];
}

type SortableKeys = 'name' | 'code' | 'sales2024' | 'sales2025' | 'growth' | 'contribution2024' | 'contribution2025' | 'parentEntity' | 'cash2025' | 'credit2025' | 'cashGrowth' | 'creditGrowth';

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

const ContributionCell: React.FC<{ value: number }> = ({ value }) => {
    if (isNaN(value)) return <span className="text-right block w-full">-</span>;
    return (
        <div className="flex items-center justify-end gap-2 w-full">
            <span className="font-mono w-14 text-right">{value.toFixed(2)}%</span>
            <div className="w-20 bg-slate-600 rounded-full h-2 flex-shrink-0">
                <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
        </div>
    );
};

const ComparisonItemsTable: React.FC<ComparisonItemsTableProps> = ({ itemsData, comparisonData }) => {
    const { salesMix } = useOutletContext<LayoutContextType>();
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
            const cashGrowth = calculateGrowth(item.cash2025, item.cash2024);
            const creditGrowth = calculateGrowth(item.credit2025, item.credit2024);
            const firstParentKey = item.parentEntity.split(' | ')[0];
            const parentTotals = entityTotals.get(firstParentKey) || { sales2024: 0, sales2025: 0 };

            return {
                ...item,
                growth,
                cashGrowth,
                creditGrowth,
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
    
    const totalRowValues = useMemo(() => {
        if (filteredAndSortedData.length === 0) return null;
        const totals = filteredAndSortedData.reduce((acc, item) => {
            acc.s24 += item.sales2024;
            acc.s25 += item.sales2025;
            acc.c24 += item.cash2024 || 0;
            acc.cr24 += item.credit2024 || 0;
            acc.c25 += item.cash2025 || 0;
            acc.cr25 += item.credit2025 || 0;
            return acc;
        }, { s24: 0, s25: 0, c24: 0, cr24: 0, c25: 0, cr25: 0 });
        return { 
            sales2024: totals.s24, sales2025: totals.s25, 
            cash2024: totals.c24, credit2024: totals.cr24, 
            cash2025: totals.c25, credit2025: totals.cr25,
            growth: calculateGrowth(totals.s25, totals.s24),
            cashGrowth: calculateGrowth(totals.c25, totals.c24),
            creditGrowth: calculateGrowth(totals.cr25, totals.cr24),
        };
    }, [filteredAndSortedData]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const allColumns = [
        { key: 'code', header: 'Item Code' },
        { key: 'name', header: 'Item Description' },
        { key: 'parentEntity', header: 'Group(s)' },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true },
        { key: 'cash2025', header: '2025 Cash', isNumeric: true },
        { key: 'credit2025', header: '2025 Credit', isNumeric: true },
        { key: 'contribution2025', header: 'Group Contrib%', isNumeric: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
        { key: 'cashGrowth', header: 'Cash Gr%', isNumeric: true },
        { key: 'creditGrowth', header: 'Credit Gr%', isNumeric: true },
    ];

    const columns = allColumns.filter(col => {
        if (salesMix === 'Total') return true;
        const k = col.key.toString().toLowerCase();
        return !k.startsWith('cash') && !k.startsWith('credit');
    });

    return (
        <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white">Consolidated Items Comparison</h3>
                <div className="flex items-center gap-4 flex-col sm:flex-row w-full sm:w-auto">
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
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300 table-sortable">
                    <thead className="text-xs uppercase bg-slate-800 sticky top-0 z-20 font-bold">
                        <tr>
                            <th className="p-3 text-slate-400">No.</th>
                            {columns.map(col => {
                                let colorClass = 'text-sky-300';
                                if (col.header.includes('2024')) colorClass = 'text-sky-400';
                                if (col.header.includes('2025')) colorClass = 'text-green-400';
                                
                                return (
                                    <th 
                                        key={col.key} 
                                        scope="col" 
                                        className={`p-3 whitespace-nowrap cursor-pointer hover:bg-slate-700 ${colorClass} ${col.isNumeric ? 'text-right' : 'text-left'}`} 
                                        onClick={() => requestSort(col.key as SortableKeys)}
                                    >
                                        {col.header} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {totalRowValues && (
                             <tr className="bg-sky-900/60 font-bold text-white text-sm sticky top-[41px] z-10 backdrop-blur-sm">
                                <td className="p-3 text-sky-400 font-bold">TOTAL</td>
                                {columns.map((col, idx) => {
                                    const isNumeric = col.isNumeric;
                                    const valKey = col.key as keyof typeof totalRowValues;
                                    
                                    let content: React.ReactNode = '';
                                    if (idx === 0) content = `(${filteredAndSortedData.length} items)`;
                                    else if (valKey === 'growth' || valKey === 'cashGrowth' || valKey === 'creditGrowth') {
                                        content = <GrowthIndicator value={totalRowValues[valKey] as number} />;
                                    } else if (isNumeric && totalRowValues[valKey] !== undefined) {
                                        content = formatNumberAbbreviated(totalRowValues[valKey] as number);
                                    }

                                    return (
                                        <td key={`total-${col.key}`} className={`p-3 whitespace-nowrap ${isNumeric ? 'text-right' : 'text-left'}`}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        )}
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={item.code + item.parentEntity} className="hover:bg-slate-700/50 transition-colors text-sm">
                                <td className="p-3 text-slate-500 font-mono">{index + 1}</td>
                                {columns.map(col => {
                                     const isItemNameCol = col.key === 'name';
                                     const value = item[col.key as keyof typeof item];
                                     const tdClassName = `p-3 whitespace-nowrap ${col.isNumeric ? 'text-right font-mono' : 'text-left'} ${isItemNameCol ? 'item-name-cell' : ''}`;

                                     return (
                                         <td key={col.key} className={tdClassName} title={isItemNameCol ? value as string : undefined}>
                                            {(() => {
                                                switch (col.key) {
                                                    case 'sales2024': case 'sales2025': case 'cash2025': case 'credit2025': return formatNumberAbbreviated(value as number);
                                                    case 'contribution2025': return <ContributionCell value={value as number} />;
                                                    case 'growth': case 'cashGrowth': case 'creditGrowth': return <GrowthIndicator value={value as number} />;
                                                    case 'parentEntity': return <span className="text-xs text-slate-400 block max-w-xs truncate" title={value as string}>{value as string}</span>;
                                                    default: return value as string;
                                                }
                                            })()}
                                        </td>
                                     );
                                })}
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