
import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { RawSalesDataRow } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonItemsTableProps {
    itemsData: any[];
    comparisonData: { entity: ComparisonEntity; data: RawSalesDataRow[] }[];
}

type SortableKeys = 'name' | 'code' | 'sales2024' | 'sales2025' | 'growth' | 'contribution2024' | 'contribution2025' | 'parentEntity' | 'cash2025' | 'credit2025';

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
    
    const totalRow = useMemo(() => {
        if (filteredAndSortedData.length === 0) return null;
        const totals = filteredAndSortedData.reduce((acc, item) => {
            acc.s24 += item.sales2024;
            acc.s25 += item.sales2025;
            acc.c25 += item.cash2025 || 0;
            acc.cr25 += item.credit2025 || 0;
            return acc;
        }, { s24: 0, s25: 0, c25: 0, cr25: 0 });
        return { sales2024: totals.s24, sales2025: totals.s25, cash2025: totals.c25, credit2025: totals.cr25 };
    }, [filteredAndSortedData]);
    
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
        { key: 'cash2025', header: '2025 Cash', isNumeric: true },
        { key: 'credit2025', header: '2025 Credit', isNumeric: true },
        { key: 'contribution2025', header: 'Contrib % (Group)', isNumeric: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
    ];

    const handleExport = (format: 'csv' | 'pdf') => {
        const doc = new jsPDF() as jsPDF & { autoTable: (options: any) => jsPDF; };
        const title = 'Aggregated Items Comparison';
        const head = [columns.map(c => c.header)];
        
        const body = filteredAndSortedData.map(item => [
            item.code,
            item.name,
            item.parentEntity,
            formatNumberAbbreviated(item.sales2024),
            formatNumberAbbreviated(item.sales2025),
            formatNumberAbbreviated(item.cash2025 || 0),
            formatNumberAbbreviated(item.credit2025 || 0),
            `${item.contribution2025.toFixed(2)}%`,
            `${item.growth.toFixed(2)}%`
        ]);

        const filename = `items_comparison_export`;

        if (format === 'pdf') {
            doc.text(title, 14, 15);
            doc.autoTable({ startY: 20, head, body, theme: 'striped' });
            doc.save(`${filename}.pdf`);
        } else {
            const csv = Papa.unparse({ fields: head[0], data: body });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white">Aggregated Items View</h3>
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
                    <div className="flex items-center gap-2">
                         <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            CSV
                        </button>
                        <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>
                            PDF
                        </button>
                     </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300 table-sortable">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-10">
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
                        {totalRow && (
                             <tr className="bg-sky-900/60 font-bold text-white text-sm sticky top-[41px] z-10 backdrop-blur-sm">
                                <td className="p-3"></td>
                                <td className="p-3 font-bold" colSpan={2}>TOTAL ({filteredAndSortedData.length} items)</td>
                                <td className="p-3 text-right">{formatNumberAbbreviated(totalRow.sales2024)}</td>
                                <td className="p-3 text-right">{formatNumberAbbreviated(totalRow.sales2025)}</td>
                                <td className="p-3 text-right">{formatNumberAbbreviated(totalRow.cash2025)}</td>
                                <td className="p-3 text-right">{formatNumberAbbreviated(totalRow.credit2025)}</td>
                                <td className="p-3"></td>
                                <td className="p-3 text-right">
                                    <GrowthIndicator value={calculateGrowth(totalRow.sales2025, totalRow.sales2024)} />
                                </td>
                            </tr>
                        )}
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={item.code + item.parentEntity} className="hover:bg-slate-700/50 transition-colors text-sm">
                                <td className="p-3 text-slate-400">{index + 1}</td>
                                {columns.map(col => {
                                     const isItemNameCol = col.key === 'name';
                                     const value = item[col.key as keyof typeof item];
                                     const tdClassName = `p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''} ${isItemNameCol ? 'item-name-cell' : ''}`;

                                     return (
                                         <td key={col.key} className={tdClassName} title={isItemNameCol ? value as string : undefined}>
                                            {(() => {
                                                switch (col.key) {
                                                    case 'sales2024': case 'sales2025': case 'cash2025': case 'credit2025': return formatNumberAbbreviated(value as number);
                                                    case 'contribution2025': return <ContributionCell value={value as number} />;
                                                    case 'growth': return <GrowthIndicator value={value as number} />;
                                                    case 'parentEntity': return <span className="text-xs text-slate-400 truncate" title={value as string}>{value as string}</span>;
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
