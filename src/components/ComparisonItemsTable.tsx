import React, { useState, useMemo } from 'react';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonItemsTableProps {
    itemsData: any[];
}

type SortableKeys = 'name' | 'code' | 'sales2024' | 'sales2025' | 'growth' | 'cash2025' | 'credit2025' | 'cashGrowth' | 'creditGrowth' | 'contribution2025' | 'cashContrib2025' | 'creditContrib2025';

const ComparisonItemsTable: React.FC<ComparisonItemsTableProps> = ({ itemsData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const filteredAndSortedData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const filtered = itemsData.filter(i => 
            i.name.toLowerCase().includes(term) || 
            i.code.toLowerCase().includes(term) || 
            (i.parentEntity && i.parentEntity.toLowerCase().includes(term))
        );
        return [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key] ?? 0;
            const bVal = b[sortConfig.key] ?? 0;
            return (aVal < bVal ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1);
        });
    }, [itemsData, searchTerm, sortConfig]);
    
    const totals = useMemo(() => {
        return filteredAndSortedData.reduce((acc, r) => ({ 
            s24: acc.s24 + (r.sales2024 || 0), 
            s25: acc.s25 + (r.sales2025 || 0),
            c25: acc.c25 + (r.cash2025 || 0), 
            cr25: acc.cr25 + (r.credit2025 || 0)
        }), { s24: 0, s25: 0, c25: 0, cr25: 0 });
    }, [filteredAndSortedData]);

    const columns = [
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Description' },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true, year: '2024' },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true, year: '2025' },
        { key: 'contribution2025', header: '2025 Cont%', isNumeric: true, year: '2025' },
        { key: 'cash2025', header: '2025 Cash', isNumeric: true, year: '2025' },
        { key: 'credit2025', header: '2025 Credit', isNumeric: true, year: '2025' },
        { key: 'cashContrib2025', header: 'Cash Cont%', isNumeric: true, year: '2025' },
        { key: 'creditContrib2025', header: 'Credit Cont%', isNumeric: true, year: '2025' },
        { key: 'growth', header: 'Growth%', isNumeric: true },
        { key: 'cashGrowth', header: 'Cash GR%', isNumeric: true },
        { key: 'creditGrowth', header: 'Credit GR%', isNumeric: true }
    ];

    return (
        <div className="bg-slate-800/50 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-700 bg-slate-800/40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Consolidated performance table</h3>
                </div>
                <div className="relative w-full md:max-w-xs">
                    <input type="text" placeholder="Quick filter items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold" />
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>
            
            <div className="table-container border-none rounded-none max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-950/90 sticky top-0 z-20">
                        <tr className="border-b-2 border-slate-800">
                            <th className="p-4 text-[9px] text-slate-600 uppercase font-black">#</th>
                            {columns.map(c => (
                                <th key={c.key} className={`p-4 text-[9px] font-black uppercase tracking-[0.15em] cursor-pointer hover:bg-slate-800 transition-colors ${c.year === '2024' ? 'text-sky-400' : c.year === '2025' ? 'text-emerald-400' : 'text-slate-500'} ${c.isNumeric ? 'text-right' : ''}`} onClick={() => setSortConfig({ key: c.key as SortableKeys, direction: sortConfig.key === c.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                    {c.header} {sortConfig.key === c.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-numeric text-[11px]">
                        <tr className="bg-slate-900/80 font-black sticky top-12 z-10 shadow-lg">
                            <td className="p-4 text-slate-600">Σ</td>
                            <td className="p-4 uppercase text-slate-400 tracking-widest">Grand Total</td>
                            <td className="p-4 uppercase text-slate-400 tracking-tight">Across Display Set</td>
                            <td className="p-4 text-right text-sky-400 font-numeric">{formatNumberAbbreviated(totals.s24)}</td>
                            <td className="p-4 text-right text-emerald-400 font-numeric">{formatNumberAbbreviated(totals.s25)}</td>
                            <td className="p-4 text-right text-emerald-400 font-numeric">100.0%</td>
                            <td className="p-4 text-right text-emerald-400 font-numeric">{formatNumberAbbreviated(totals.c25)}</td>
                            <td className="p-4 text-right text-emerald-400 font-numeric">{formatNumberAbbreviated(totals.cr25)}</td>
                            <td className="p-4 text-right text-emerald-400 font-numeric">100.0%</td>
                            <td className="p-4 text-right text-emerald-400 font-numeric">100.0%</td>
                            <td colSpan={3} className="p-4 bg-slate-950/20"></td>
                        </tr>
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-700/20 transition-all group border-b border-slate-800">
                                <td className="p-4 text-slate-600 text-[10px] font-bold">{index + 1}</td>
                                {columns.map(c => (
                                    <td key={c.key} className={`p-4 ${c.isNumeric ? 'text-right' : ''} ${c.year === '2024' ? 'text-sky-400/80' : c.year === '2025' ? 'text-emerald-400/90 font-bold' : ''}`}>
                                        {(() => {
                                            const val = item[c.key as keyof typeof item];
                                            if (c.key === 'code') return <span className="text-slate-500 font-bold">{val}</span>;
                                            if (c.key === 'name') return <span className="font-sans font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">{val}</span>;
                                            if (c.key.toString().includes('Growth')) return <GrowthIndicator value={val as number} className="text-[10px]" />;
                                            if (c.key.toString().includes('Cont') || c.key.toString().includes('cont')) return `${(val as number).toFixed(1)}%`;
                                            if (c.isNumeric) return formatNumberAbbreviated(val as number);
                                            return val;
                                        })()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredAndSortedData.length === 0 && (
                <div className="p-20 text-center bg-slate-900/40">
                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">No records found matching criteria</p>
                </div>
            )}
        </div>
    );
};

export default ComparisonItemsTable;