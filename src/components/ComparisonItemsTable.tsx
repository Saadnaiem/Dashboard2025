import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { ComparisonEntity } from './ComparisonPage';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface ComparisonItemsTableProps {
    itemsData: any[];
    comparisonData: { entity: ComparisonEntity; data: RawSalesDataRow[] }[];
}

type SortableKeys = 'name' | 'code' | 'sales2024' | 'sales2025' | 'growth' | 'contribution2025' | 'parentEntity';

const ComparisonItemsTable: React.FC<ComparisonItemsTableProps> = ({ itemsData, comparisonData }) => {
    const { salesMix } = useOutletContext<LayoutContextType>();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const filteredAndSortedData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const filtered = itemsData.filter(i => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term) || i.parentEntity.toLowerCase().includes(term));
        return [...filtered].sort((a, b) => (a[sortConfig.key] < b[sortConfig.key] ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1));
    }, [itemsData, searchTerm, sortConfig]);
    
    const totals = useMemo(() => {
        return filteredAndSortedData.reduce((acc, r) => ({ s24: acc.s24 + r.sales2024, s25: acc.s25 + r.sales2025 }), { s24: 0, s25: 0 });
    }, [filteredAndSortedData]);

    const cols = [
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Description', isMain: true },
        { key: 'sales2024', header: '2024 Sales', isNumeric: true, is24: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true, is25: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
        { key: 'contribution2025', header: 'Group Contrib%', isNumeric: true }
    ];

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
                            <td className="text-sky-400">Σ</td>
                            <td colSpan={2} className="text-white text-[10px] italic">TOTAL (Filtered: {filteredAndSortedData.length} items)</td>
                            <td className="text-sky-400 text-right">{formatNumberAbbreviated(totals.s24)}</td>
                            <td className="text-green-400 text-right">{formatNumberAbbreviated(totals.s25)}</td>
                            <td className="text-right"><GrowthIndicator value={totals.s24 ? ((totals.s25 - totals.s24)/totals.s24)*100 : 0} className="text-[10px]" /></td>
                            <td></td>
                        </tr>
                        {filteredAndSortedData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-700/30 transition-colors text-xs">
                                <td className="text-slate-600 text-[10px]">{index + 1}</td>
                                <td className="text-slate-500 truncate">{item.code}</td>
                                <td className="item-name-cell font-sans font-medium text-slate-200" title={item.name}>{item.name}</td>
                                <td className="text-sky-400/80 text-right">{formatNumberAbbreviated(item.sales2024)}</td>
                                <td className="text-green-300 text-right font-bold">{formatNumberAbbreviated(item.sales2025)}</td>
                                <td className="text-right"><GrowthIndicator value={item.growth} className="text-[10px]" /></td>
                                <td className="text-right text-slate-500 text-[10px]">{item.contribution2025.toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComparisonItemsTable;