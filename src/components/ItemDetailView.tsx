import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { RawSalesDataRow } from '../types';
import Header from './Header';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

interface ItemDetailViewProps {
    allRawData: RawSalesDataRow[];
}

type ItemData = {
    code: string;
    name: string;
    sales2024: number;
    sales2025: number;
    contribution2024: number;
    contribution2025: number;
    growth: number;
};

type SortableKeys = keyof ItemData;

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

const ItemDetailView: React.FC<ItemDetailViewProps> = ({ allRawData }) => {
    const { divisionName, departmentName, categoryName } = useParams<{ divisionName: string; departmentName: string; categoryName: string }>();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });
    const [localSearchTerm, setLocalSearchTerm] = useState('');

    const divisionTotalSales = useMemo(() => {
        return allRawData
            .filter(row => row.DIVISION === divisionName)
            .reduce((acc, row) => {
                acc.s24 += row.SALES2024;
                acc.s25 += row.SALES2025;
                return acc;
            }, { s24: 0, s25: 0 });
    }, [allRawData, divisionName]);

    const itemsData = useMemo(() => {
        if (!divisionName || !departmentName || !categoryName) return [];

        const filteredRaw = allRawData.filter(row =>
            row.DIVISION === divisionName &&
            row.DEPARTMENT === departmentName &&
            row.CATEGORY === categoryName
        );

        const aggregatedItems = new Map<string, { code: string; name: string; sales2024: number; sales2025: number; }>();

        filteredRaw.forEach(row => {
            const itemCode = row['ITEM CODE'];
            const itemName = row['ITEM DESCRIPTION'];

            if (!itemCode) return;

            if (aggregatedItems.has(itemCode)) {
                const existing = aggregatedItems.get(itemCode)!;
                existing.sales2024 += row.SALES2024;
                existing.sales2025 += row.SALES2025;
            } else {
                aggregatedItems.set(itemCode, {
                    code: itemCode,
                    name: itemName,
                    sales2024: row.SALES2024,
                    sales2025: row.SALES2025,
                });
            }
        });

        const uniqueItemsArray = Array.from(aggregatedItems.values());

        return uniqueItemsArray.map(item => ({
            ...item,
            growth: calculateGrowth(item.sales2025, item.sales2024),
            contribution2024: divisionTotalSales.s24 > 0 ? (item.sales2024 / divisionTotalSales.s24) * 100 : 0,
            contribution2025: divisionTotalSales.s25 > 0 ? (item.sales2025 / divisionTotalSales.s25) * 100 : 0,
        }));
    }, [allRawData, divisionName, departmentName, categoryName, divisionTotalSales]);

    const filteredAndSortedData = useMemo(() => {
        const lowercasedTerm = localSearchTerm.toLowerCase();
        
        const filtered = localSearchTerm
            ? itemsData.filter(item =>
                item.name.toLowerCase().includes(lowercasedTerm) ||
                item.code.toLowerCase().includes(lowercasedTerm)
            )
            : itemsData;

        return [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [itemsData, localSearchTerm, sortConfig]);

    const totalRow = useMemo(() => {
        if (filteredAndSortedData.length === 0) return null;
        const totals = filteredAndSortedData.reduce((acc, item) => {
            acc.s24 += item.sales2024;
            acc.s25 += item.sales2025;
            acc.c24 += item.contribution2024;
            acc.c25 += item.contribution2025;
            return acc;
        }, { s24: 0, s25: 0, c24: 0, c25: 0 });

        return {
            code: 'TOTAL',
            name: `Total (${filteredAndSortedData.length} items)`,
            sales2024: totals.s24,
            sales2025: totals.s25,
            growth: calculateGrowth(totals.s25, totals.s24),
            contribution2024: totals.c24,
            contribution2025: totals.c25,
        };
    }, [filteredAndSortedData]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const columns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
        { key: 'code', header: 'Item Code (ERP)' },
        { key: 'name', header: 'Item Description' },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true },
        { key: 'contribution2025', header: 'Contrib % (Division)', isNumeric: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
    ];
    
    const handleExport = (format: 'csv' | 'pdf') => {
        const doc = new jsPDF() as jsPDF & { autoTable: (options: any) => jsPDF; };
        const title = `Items in ${categoryName} for ${departmentName}, ${divisionName}`;
        const head = [columns.map(c => c.header)];
        
        const body = filteredAndSortedData.map(item => [
            item.code, item.name, 
            formatNumberAbbreviated(item.sales2024),
            formatNumberAbbreviated(item.sales2025),
            `${item.contribution2025.toFixed(2)}%`,
            `${item.growth.toFixed(2)}%`
        ]);

        if (totalRow) {
             body.unshift([
                totalRow.code, totalRow.name,
                formatNumberAbbreviated(totalRow.sales2024),
                formatNumberAbbreviated(totalRow.sales2025),
                `${totalRow.contribution2025.toFixed(2)}%`,
                `${totalRow.growth.toFixed(2)}%`
             ]);
        }
        
        const filename = `items_${divisionName}_${departmentName}_${categoryName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

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
        <div className="flex flex-col gap-6">
            <Header />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                     <h2 className="text-2xl font-bold text-white">
                        Item Analysis
                    </h2>
                    <p className="text-sm text-slate-400">
                        <span className="font-bold text-sky-400">{divisionName}</span> &gt; <span className="font-bold text-sky-400">{departmentName}</span> &gt; <span className="font-bold text-sky-400">{categoryName}</span>
                    </p>
                </div>
                <Link to={`/division/${encodeURIComponent(divisionName!)}`} className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>
                    Back to Division View
                </Link>
            </div>
             <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                 <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-700">
                    <div className="relative w-full md:max-w-md">
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">Export CSV</button>
                        <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">Export PDF</button>
                    </div>
                 </div>
                <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-10">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} scope="col" className="p-3 cursor-pointer" onClick={() => requestSort(col.key)}>
                                        {col.header} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                             {totalRow && (
                                <tr className="bg-sky-900/60 font-bold text-white text-sm">
                                    <td className="p-3">{totalRow.code}</td>
                                    <td className="p-3">{totalRow.name}</td>
                                    <td className="p-3 text-right">{formatNumberAbbreviated(totalRow.sales2024)}</td>
                                    <td className="p-3 text-right">{formatNumberAbbreviated(totalRow.sales2025)}</td>
                                    <td className="p-3 text-right"><ContributionCell value={totalRow.contribution2025} /></td>
                                    <td className="p-3 text-right"><GrowthIndicator value={totalRow.growth} /></td>
                                </tr>
                             )}
                            {filteredAndSortedData.map((item, index) => (
                                <tr key={item.code + index} className="hover:bg-slate-700/50 transition-colors text-sm border-b border-slate-700">
                                    {columns.map(col => (
                                        <td key={col.key} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                            {(() => {
                                                const value = item[col.key];
                                                switch (col.key) {
                                                    case 'sales2024': case 'sales2025': return formatNumberAbbreviated(value as number);
                                                    case 'contribution2025': return <ContributionCell value={value as number} />;
                                                    case 'growth': return <GrowthIndicator value={value as number} />;
                                                    default: return value;
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
                            No items found for this selection.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemDetailView;