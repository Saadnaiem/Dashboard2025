import React, { useMemo, useState } from 'react';
import { useParams, Link, useSearchParams, useOutletContext } from 'react-router-dom';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { getSalesValue } from '../services/dataProcessor';

const calculateGrowth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

interface BrandDetailViewProps {
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

type SortableKeys = keyof ItemData | 'no';

const BrandDetailView: React.FC<BrandDetailViewProps> = ({ allRawData }) => {
    const { brandName } = useParams<{ brandName: string }>();
    const { salesMix } = useOutletContext<LayoutContextType>();
    const [searchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });
    const [localSearchTerm] = useState('');

    const globalFilters = useMemo(() => ({
        divisions: searchParams.get('divisions')?.split(',') || [],
        departments: searchParams.get('departments')?.split(',') || [],
        categories: searchParams.get('categories')?.split(',') || [],
        branches: searchParams.get('branches')?.split(',') || [],
        brands: [], 
        items: [],
    }), [searchParams]);

    const globalSearchTerm = useMemo(() => searchParams.get('search') || '', [searchParams]);
    
    const brandData = useMemo(() => {
        const lowercasedTerm = globalSearchTerm.toLowerCase();
        return allRawData.filter(row => {
            if (row['BRAND'] !== brandName) return false;
            const { divisions, departments, categories, branches } = globalFilters;
            const divisionMatch = divisions.length === 0 || divisions.includes(row['DIVISION']);
            const departmentMatch = departments.length === 0 || departments.includes(row['DEPARTMENT']);
            const categoryMatch = categories.length === 0 || categories.includes(row['CATEGORY']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            if (!(divisionMatch && departmentMatch && categoryMatch && branchMatch)) return false;
            if (globalSearchTerm) {
                 return (
                    (row['DIVISION']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRANCH NAME']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRAND']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['ITEM DESCRIPTION']?.toLowerCase().includes(lowercasedTerm))
                );
            }
            return true;
        });
    }, [allRawData, brandName, globalFilters, globalSearchTerm]);

    const brandStats = useMemo(() => {
        if (brandData.length === 0) return null;
        return brandData.reduce((acc, row) => {
            acc.s24 += getSalesValue(row, '2024', salesMix);
            acc.s25 += getSalesValue(row, '2025', salesMix);
            if (getSalesValue(row, '2025', salesMix) > 0) acc.items25.add(row['ITEM DESCRIPTION']);
            if (getSalesValue(row, '2024', salesMix) > 0) acc.items24.add(row['ITEM DESCRIPTION']);
            return acc;
        }, { s24: 0, s25: 0, items24: new Set<string>(), items25: new Set<string>() });
    }, [brandData, salesMix]);
    
    const itemsData = useMemo(() => {
        if (!brandStats) return [];
        const aggregatedItems = new Map<string, { code: string; name: string; sales2024: number; sales2025: number; cash2024: number; credit2024: number; cash2025: number; credit2025: number; }>();
        brandData.forEach(row => {
            const itemCode = row['ITEM CODE'] || 'N/A';
            const itemName = row['ITEM DESCRIPTION'];
            if (!itemName) return;
            const s24 = getSalesValue(row, '2024', salesMix);
            const s25 = getSalesValue(row, '2025', salesMix);
            if (aggregatedItems.has(itemName)) {
                const existing = aggregatedItems.get(itemName)!;
                existing.sales2024 += s24;
                existing.sales2025 += s25;
                existing.cash2024 += row.SALES2024_CASH || 0;
                existing.credit2024 += row.SALES2024_CREDIT || 0;
                existing.cash2025 += row.SALES2025_CASH || 0;
                existing.credit2025 += row.SALES2025_CREDIT || 0;
            } else {
                aggregatedItems.set(itemName, { 
                    code: itemCode, name: itemName, 
                    sales2024: s24, sales2025: s25,
                    cash2024: row.SALES2024_CASH || 0, credit2024: row.SALES2024_CREDIT || 0,
                    cash2025: row.SALES2025_CASH || 0, credit2025: row.SALES2025_CREDIT || 0
                });
            }
        });
        return Array.from(aggregatedItems.values()).map(item => ({
            ...item,
            growth: calculateGrowth(item.sales2025, item.sales2024),
            cashGrowth: calculateGrowth(item.cash2025, item.cash2024),
            creditGrowth: calculateGrowth(item.credit2025, item.credit2024),
            contribution2024: brandStats.s24 > 0 ? (item.sales2024 / brandStats.s24) * 100 : 0,
            contribution2025: brandStats.s25 > 0 ? (item.sales2025 / brandStats.s25) * 100 : 0,
            cashPercent2025: item.sales2025 > 0 ? (item.cash2025 / item.sales2025) * 100 : 0,
        }));
    }, [brandData, brandStats, salesMix]);

    const filteredAndSortedData = useMemo(() => {
        const lowercasedTerm = localSearchTerm.toLowerCase();
        const filtered = localSearchTerm
            ? itemsData.filter(item => item.name.toLowerCase().includes(lowercasedTerm) || item.code.toLowerCase().includes(lowercasedTerm))
            : itemsData;
        if (!sortConfig) return filtered;
        return [...filtered].sort((a, b) => {
            if (sortConfig.key === 'no') return 0;
            const aVal = a[sortConfig.key as keyof ItemData];
            const bVal = b[sortConfig.key as keyof ItemData];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [itemsData, localSearchTerm, sortConfig]);
    
     const totalRow = useMemo(() => {
        if (filteredAndSortedData.length === 0) return null;
        const totals = filteredAndSortedData.reduce((acc, item) => {
            acc.s24 += item.sales2024; acc.s25 += item.sales2025;
            acc.c24 += item.cash2024; acc.cr24 += item.credit2024;
            acc.c25 += item.cash2025; acc.cr25 += item.credit2025;
            return acc;
        }, { s24: 0, s25: 0, c24: 0, cr24: 0, c25: 0, cr25: 0 });
        return {
            code: 'TOTAL',
            name: `Total (${filteredAndSortedData.length} items)`,
            sales2024: totals.s24, sales2025: totals.s25,
            cash2024: totals.c24, credit2024: totals.cr24,
            cash2025: totals.c25, credit2025: totals.cr25,
            growth: calculateGrowth(totals.s25, totals.s24),
            cashGrowth: calculateGrowth(totals.c25, totals.c24),
            creditGrowth: calculateGrowth(totals.cr25, totals.cr24),
            contribution2025: 100,
            cashPercent2025: totals.s25 > 0 ? (totals.c25 / totals.s25) * 100 : 0,
        };
    }, [filteredAndSortedData]);

    const requestSort = (key: SortableKeys) => {
        if (key === 'no') return;
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const allColumns: { key: SortableKeys; header: string; isNumeric?: boolean; is24?: boolean; is25?: boolean }[] = [
        { key: 'no', header: 'No.', isNumeric: false },
        { key: 'code', header: 'Item Code' },
        { key: 'name', header: 'Item Description' },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true, is24: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true, is25: true },
        { key: 'contribution2025', header: 'Contrib % (25)', isNumeric: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
        { key: 'cashGrowth', header: 'Cash GR%', isNumeric: true },
        { key: 'creditGrowth', header: 'Credit GR%', isNumeric: true },
    ];

    const columns = allColumns.filter(col => {
        if (salesMix === 'Total') return true;
        const k = col.key.toString().toLowerCase();
        return !k.startsWith('cash') && !k.startsWith('credit');
    });

    return (
        <div className="flex flex-col gap-6">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                     <h2 className="text-2xl font-bold text-white">
                        Brand Analysis: <span className="text-sky-400">{brandName}</span>
                    </h2>
                </div>
                <Link to={`/details/brands?${searchParams.toString()}`} className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    Back to All Brands
                </Link>
            </div>
            {brandStats && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                        <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-2">Total {salesMix} Sales (2025)</h3>
                        <div className="text-5xl font-numeric font-extrabold text-green-400">{formatNumberAbbreviated(brandStats.s25)}</div>
                        <div className="text-sm font-numeric font-bold text-sky-400 mt-1">2024: {formatNumberAbbreviated(brandStats.s24)}</div>
                        <GrowthIndicator value={calculateGrowth(brandStats.s25, brandStats.s24)} className="text-2xl mt-2" />
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                        <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-2">Active Items (2025)</h3>
                        <div className="text-5xl font-numeric font-extrabold text-green-400">{brandStats.items25.size}</div>
                         <div className="text-sm font-numeric font-bold text-sky-400 mt-1">2024: {brandStats.items24.size}</div>
                        <GrowthIndicator value={brandStats.items25.size - brandStats.items24.size} unit="" className="text-2xl mt-2" />
                    </div>
                </div>
            )}
             <div className="table-container">
                <table className="w-full text-left text-slate-300 table-sortable">
                    <thead className="bg-indigo-900/80 backdrop-blur sticky top-0 z-20 border-b border-white/5 uppercase text-[10px] font-bold">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} scope="col" className={`p-4 whitespace-nowrap cursor-pointer hover:bg-white/10 ${col.is24 ? 'text-sky-300' : col.is25 ? 'text-emerald-300 font-black' : 'text-slate-300'} ${col.isNumeric ? 'text-right' : 'text-left'}`} onClick={() => requestSort(col.key as SortableKeys)}>
                                    {col.header} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 font-numeric">
                         {totalRow && (
                            <tr className="bg-sky-900/40 font-bold text-white text-xs">
                                {columns.map(col => (
                                    <td key={`total-${col.key}`} className={`p-4 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                        {(() => {
                                            const value = totalRow[col.key as keyof typeof totalRow];
                                            switch (col.key) {
                                                case 'no': return 'TOTAL';
                                                case 'sales2024': return <span className="text-sky-400">{formatNumberAbbreviated(value as number)}</span>;
                                                case 'sales2025': return <span className="text-emerald-400">{formatNumberAbbreviated(value as number)}</span>;
                                                case 'contribution2025': return `${(value as number).toFixed(2)}%`;
                                                case 'growth': case 'cashGrowth': case 'creditGrowth': return <GrowthIndicator value={value as number} />;
                                                default: return value;
                                            }
                                        })()}
                                    </td>
                                ))}
                            </tr>
                         )}
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={item.code + index} className="hover:bg-indigo-500/5 transition-colors text-xs border-b border-slate-700/30">
                                {columns.map(col => (
                                    <td key={col.key} className={`p-4 whitespace-nowrap ${col.isNumeric ? 'text-right' : 'font-bold uppercase'}`}>
                                        {(() => {
                                            if (col.key === 'no') return index + 1;
                                            const value = item[col.key as keyof typeof item];
                                            switch (col.key) {
                                                case 'sales2024': return <span className="text-sky-400/80">{formatNumberAbbreviated(value as number)}</span>;
                                                case 'sales2025': return <span className="text-emerald-300 font-black">{formatNumberAbbreviated(value as number)}</span>;
                                                case 'contribution2025': return `${(value as number).toFixed(2)}%`;
                                                case 'growth': case 'cashGrowth': case 'creditGrowth': return <GrowthIndicator value={value as number} className="text-xs" />;
                                                default: return <span className="font-sans">{value}</span>;
                                            }
                                        })()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BrandDetailView;