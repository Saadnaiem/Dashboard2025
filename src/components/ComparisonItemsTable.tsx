import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonItemsTableProps {
    itemsData: any[];
}

type SortableKeys = 'name' | 'code' | 'sales2024' | 'sales2025' | 'growth' | 'cashGrowth' | 'creditGrowth' | 'contribution2025' | 'parentEntity';

const ComparisonItemsTable: React.FC<ComparisonItemsTableProps> = ({ itemsData }) => {
    const { salesMix } = useOutletContext<LayoutContextType>();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const filteredAndSortedData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const filtered = itemsData.filter(i => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term) || i.parentEntity.toLowerCase().includes(term));
        return [...filtered].sort((a, b) => (a[sortConfig.key] < b[sortConfig.key] ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1));
    }, [itemsData, searchTerm, sortConfig]);
    
    const totals = useMemo(() => {
        return filteredAndSortedData.reduce((acc, r) => ({ 
            s24: acc.s24 + r.sales2024, s25: acc.s25 + r.sales2025,
            c24: acc.c24 + (r.cash2024 || 0), c25: acc.c25 + (r.cash2025 || 0),
            cr24: acc.cr24 + (r.credit2024 || 0), cr25: acc.cr25 + (r.credit2025 || 0)
        }), { s24: 0, s25: 0, c24: 0, c25: 0, cr24: 0, cr25: 0 });
    }, [filteredAndSortedData]);

    const allCols = [
        { key: 'code', header: 'Code', isNumeric: false },
        { key: 'name', header: 'Description', isNumeric: false, isMain: true },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true, is24: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true, is25: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
        { key: 'cashGrowth', header: 'Cash GR%', isNumeric: true },
        { key: 'creditGrowth', header: 'Credit GR%', isNumeric: true },
        { key: 'contribution2025', header: 'Group Contrib%', isNumeric: true }
    ];

    const cols = allCols.filter(col => {
        if (salesMix === 'Total') return true;
        return !col.key.toLowerCase().includes('cash') && !col.key.toLowerCase().includes('credit');
    });

    return (
        <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-700 bg-slate-800/80">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Consolidated Item Comparison</h3>
                <div className="relative w-full sm:max-w-xs">
                    <input type="text" placeholder="Filter items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500" />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>
            
            <div className="table-container border-none rounded-none">
                <table className="w-full text-left text-slate-300 table-sortable">
                    <thead className="text-[10px] uppercase bg-slate-900 sticky top-0 z-20 font-bold border-b border-slate-700">
                        <tr>
                            <th className="w-10 text-slate-500">#</th>
                            {cols.map(c => (
                                <th key={c.key} className={`${c.is24 ? 'text-sky-400' : c.is25 ? 'text-green-400' : 'text-slate-400'} ${c.isNumeric ? 'text-right' : ''}`} onClick={() => setSortConfig({ key: c.key as SortableKeys, direction: sortConfig.key === c.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 font-numeric">
                         <tr className="bg-sky-900/40 font-bold text-xs">
                            <td className="text-sky-400 font-bold font-sans">Σ</td>
                            <td colSpan={2} className="text-white text-[10px] italic font-sans">TOTAL ({filteredAndSortedData.length} items)</td>
                            {cols.slice(2).map(c => (
                                <td key={`total-${c.key}`} className="p-3 text-right">
                                    {(() => {
                                        if (c.key === 'sales2024') return <span className="text-sky-400">{formatNumberAbbreviated(totals.s24)}</span>;
                                        if (c.key === 'sales2025') return <span className="text-green-400">{formatNumberAbbreviated(totals.s25)}</span>;
                                        if (c.key === 'growth') return <GrowthIndicator value={totals.s24 ? ((totals.s25 - totals.s24)/totals.s24)*100 : 0} className="text-[10px]" />;
                                        if (c.key === 'cashGrowth') return <GrowthIndicator value={totals.c24 ? ((totals.c25 - totals.c24)/totals.c24)*100 : 0} className="text-[10px]" />;
                                        if (c.key === 'creditGrowth') return <GrowthIndicator value={totals.cr24 ? ((totals.cr25 - totals.cr24)/totals.cr24)*100 : 0} className="text-[10px]" />;
                                        return null;
                                    })()}
                                </td>
                            ))}
                        </tr>
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-700/30 transition-colors text-xs">
                                <td className="text-slate-600 text-[10px]">{index + 1}</td>
                                {cols.map(c => (
                                    <td key={c.key} className={`${c.isNumeric ? 'text-right' : ''}`}>
                                        {(() => {
                                            const val = item[c.key as keyof typeof item];
                                            if (c.key === 'code') return <span className="text-slate-500 truncate">{val}</span>;
                                            if (c.key === 'name') return <span className="item-name-cell font-sans font-medium text-slate-200" title={val}>{val}</span>;
                                            if (c.key === 'sales2024') return <span className="text-sky-400/80">{formatNumberAbbreviated(val as number)}</span>;
                                            if (c.key === 'sales2025') return <span className="text-green-300 font-bold">{formatNumberAbbreviated(val as number)}</span>;
                                            if (c.key === 'growth' || c.key === 'cashGrowth' || c.key === 'creditGrowth') return <GrowthIndicator value={val as number} className="text-[10px]" />;
                                            if (c.key === 'contribution2025') return <span className="text-slate-500">{(val as number).toFixed(1)}%</span>;
                                            return val;
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

export default ComparisonItemsTable;