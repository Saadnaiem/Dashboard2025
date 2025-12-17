
import React, { useMemo, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { getSalesValue } from '../services/dataProcessor';

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
    cash2024: number;
    credit2024: number;
    cash2025: number;
    credit2025: number;
    contribution2024: number;
    contribution2025: number;
    cashPercent2025: number;
    growth: number;
    cashGrowth: number;
    creditGrowth: number;
};

type SortableKeys = keyof ItemData;

const ItemDetailView: React.FC<ItemDetailViewProps> = ({ allRawData }) => {
    const { divisionName, departmentName, categoryName } = useParams<{ divisionName: string; departmentName: string; categoryName: string }>();
    const { salesMix } = useOutletContext<LayoutContextType>();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });
    const [localSearchTerm, setLocalSearchTerm] = useState('');

    const categoryTotalSales = useMemo(() => {
        return allRawData
            .filter(row =>
                row.DIVISION === divisionName &&
                row.DEPARTMENT === departmentName &&
                row.CATEGORY === categoryName
            )
            .reduce((acc, row) => {
                acc.s24 += getSalesValue(row, '2024', salesMix);
                acc.s25 += getSalesValue(row, '2025', salesMix);
                return acc;
            }, { s24: 0, s25: 0 });
    }, [allRawData, divisionName, departmentName, categoryName, salesMix]);

    const itemsData = useMemo(() => {
        if (!divisionName || !departmentName || !categoryName) return [];
        const filteredRaw = allRawData.filter(row =>
            row.DIVISION === divisionName &&
            row.DEPARTMENT === departmentName &&
            row.CATEGORY === categoryName
        );
        const aggregatedItems = new Map<string, any>();
        filteredRaw.forEach(row => {
            const itemCode = row['ITEM CODE'] || 'Unknown';
            const itemName = row['ITEM DESCRIPTION'];
            if (!itemName) return;
            const s24 = getSalesValue(row, '2024', salesMix);
            const s25 = getSalesValue(row, '2025', salesMix);
            if (!aggregatedItems.has(itemCode)) {
                aggregatedItems.set(itemCode, {
                    code: itemCode, name: itemName,
                    sales2024: 0, sales2025: 0, cash2025: 0, credit2025: 0
                });
            }
            const item = aggregatedItems.get(itemCode);
            item.sales2024 += s24;
            item.sales2025 += s25;
            item.cash2025 += row.SALES2025_CASH || 0;
            item.credit2025 += row.SALES2025_CREDIT || 0;
        });
        return Array.from(aggregatedItems.values()).map(item => ({
            ...item,
            growth: calculateGrowth(item.sales2025, item.sales2024),
            cashPercent2025: item.sales2025 > 0 ? (item.cash2025 / item.sales2025) * 100 : 0,
            contribution2025: categoryTotalSales.s25 > 0 ? (item.sales2025 / categoryTotalSales.s25) * 100 : 0,
        }));
    }, [allRawData, divisionName, departmentName, categoryName, categoryTotalSales, salesMix]);

    const filteredAndSortedData = useMemo(() => {
        const lowercasedTerm = localSearchTerm.toLowerCase();
        const filtered = itemsData.filter(item =>
            item.name.toLowerCase().includes(lowercasedTerm) || item.code.toLowerCase().includes(lowercasedTerm)
        );
        return [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [itemsData, localSearchTerm, sortConfig]);

    const allColumns = [
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Description' },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true },
        { key: 'cashPercent2025', header: '2025 Cash%', isNumeric: true },
        { key: 'contribution2025', header: 'Contrib%', isNumeric: true },
        { key: 'growth', header: 'Growth%', isNumeric: true },
    ];

    const columns = allColumns.filter(col => {
        if (salesMix === 'Total') return true;
        return !col.key.toString().toLowerCase().includes('cash');
    });

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-white">Item Analysis: {categoryName}</h2>
            <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-xs uppercase bg-slate-800 sticky top-0 z-20 font-bold">
                            <tr>
                                {columns.map(col => {
                                    let colorClass = 'text-sky-300';
                                    if (col.header.includes('2024')) colorClass = 'text-sky-400';
                                    if (col.header.includes('2025')) colorClass = 'text-green-400';
                                    return (
                                        <th key={col.key} scope="col" className={`p-3 whitespace-nowrap cursor-pointer hover:bg-slate-700 ${colorClass} ${col.isNumeric ? 'text-right' : 'text-left'}`} onClick={() => setSortConfig({ key: col.key as SortableKeys, direction: sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                                            {col.header}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredAndSortedData.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-700/50 transition-colors text-sm">
                                    {columns.map(col => (
                                        <td key={col.key} className={`p-3 ${col.isNumeric ? 'text-right font-mono' : ''}`}>
                                            {col.key === 'growth' ? <GrowthIndicator value={item[col.key]} /> : (col.isNumeric ? formatNumberAbbreviated(item[col.key]) : item[col.key])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailView;
