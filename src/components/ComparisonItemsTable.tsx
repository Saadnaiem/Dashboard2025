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
    ];

    return (
        <div className="bg-slate-800/40 backdrop-blur-md rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-700/60 overflow-hidden">
            <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-700/50 bg-slate-800/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Aggregated Entity Mapping</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Consolidated Dataset View</p>
                    </div>
                </div>
                <div className="relative w-full md:max-w-sm group">
                    <input type="text" placeholder="Scanning items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold placeholder:text-slate-600 transition-all shadow-xl" />
                    <svg className="absolute left-4 top-3 h-4 w-4 text-slate-600 group-focus-within:text-sky-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>
            
            <div className="table-container border-none rounded-none max-h-[700px] overflow-y-auto">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-indigo-900/80 backdrop-blur-xl sticky top-0 z-30 border-b border-white/5">
                        <tr>
                            <th className="p-5 text-[9px] text-slate-300 uppercase font-black tracking-widest">Index</th>
                            {columns.map(c => (
                                <th key={c.key} className={`p-5 text-[9px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-white/10 transition-colors ${c.year === '2024' ? 'text-sky-300' : c.year === '2025' ? 'text-emerald-300' : 'text-slate-300'} ${c.isNumeric ? 'text-right' : ''}`} onClick={() => setSortConfig({ key: c.key as SortableKeys, direction: sortConfig.key === c.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                    <div className="flex items-center justify-end gap-1">
                                        {c.header}
                                        <span className="text-[7px] opacity-40">{sortConfig.key === c.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-numeric text-[11px]">
                        <tr className="bg-slate-900/95 backdrop-blur font-black sticky top-[53px] z-20 shadow-2xl ring-1 ring-white/5">
                            <td className="p-5 text-indigo-400 font-black">Σ</td>
                            <td className="p-5 uppercase text-slate-200 tracking-[0.2em] font-black">GRAND TOTAL</td>
                            <td className="p-5 uppercase text-slate-500 tracking-tight font-bold italic">SCOPE SUMMARY</td>
                            <td className="p-5 text-right text-sky-400 font-black">{formatNumberAbbreviated(totals.s24)}</td>
                            <td className="p-5 text-right text-emerald-400 font-black">{formatNumberAbbreviated(totals.s25)}</td>
                            <td className="p-5 text-right text-emerald-400 font-black">100.0%</td>
                            <td className="p-5 text-right text-emerald-400 font-black">{formatNumberAbbreviated(totals.c25)}</td>
                            <td className="p-5 text-right text-emerald-400 font-black">{formatNumberAbbreviated(totals.cr25)}</td>
                            <td className="p-5 text-right text-emerald-400 font-black">100.0%</td>
                            <td className="p-5 text-right text-emerald-400 font-black">100.0%</td>
                            <td className="p-5 bg-slate-950/20"></td>
                        </tr>
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={index} className="hover:bg-indigo-500/5 transition-all group border-b border-slate-800/30">
                                <td className="p-5 text-slate-600 text-[10px] font-bold border-r border-slate-800/20">{index + 1}</td>
                                {columns.map(c => (
                                    <td key={c.key} className={`p-5 ${c.isNumeric ? 'text-right' : ''} ${c.year === '2024' ? 'text-sky-400/80 group-hover:text-sky-300' : c.year === '2025' ? 'text-emerald-400/90 group-hover:text-emerald-300 font-bold' : 'group-hover:text-slate-100'}`}>
                                        {(() => {
                                            const val = item[c.key as keyof typeof item];
                                            if (c.key === 'code') return <span className="text-slate-500 font-bold tracking-tighter">{val}</span>;
                                            if (c.key === 'name') return <span className="font-sans font-black text-slate-200 uppercase tracking-tight transition-colors">{val}</span>;
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
                <div className="p-32 text-center bg-slate-900/20 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700 shadow-2xl opacity-50">
                         <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.054.585l-1.835 1.835a2 2 0 01-3.167-2.147l1.172-3.125a2 2 0 01.31-.563l2.457-3.276a6 6 0 015.441-2.484l2.585.259a6 6 0 004.97-1.428l1.432-1.288a2 2 0 013.167 2.147l-1.172 3.125a2 2 0 01-.31.563l-2.457 3.276a6 6 0 01-5.441 2.484l-2.585-.259a6 6 0 00-4.97 1.428l-1.432 1.288a2 2 0 01-3.167-2.147z" /></svg>
                    </div>
                    <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">No matches found in this universe</p>
                </div>
            )}
        </div>
    );
};

export default ComparisonItemsTable;