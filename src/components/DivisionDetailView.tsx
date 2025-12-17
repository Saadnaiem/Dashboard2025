import React, { useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { getSalesValue } from '../services/dataProcessor';

interface DivisionDetailViewProps {
    allRawData: RawSalesDataRow[];
}

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ allRawData }) => {
    const { divisionName } = useParams<{ divisionName: string }>();
    const { salesMix } = useOutletContext<LayoutContextType>();
    const navigate = useNavigate();

    const divisionData = useMemo(() => allRawData.filter(row => row['DIVISION'] === divisionName), [allRawData, divisionName]);

    const processed = useMemo(() => {
        if (!divisionData.length) return null;
        const totalS25 = divisionData.reduce((acc, row) => acc + getSalesValue(row, '2025', salesMix), 0);
        const map = new Map<string, any>();

        divisionData.forEach(row => {
            const key = `${row.DEPARTMENT}|${row.CATEGORY}`;
            if (!map.has(key)) map.set(key, { 
                department: row.DEPARTMENT, category: row.CATEGORY, 
                s24: 0, s25: 0, c24: 0, c25: 0, cr24: 0, cr25: 0 
            });
            const d = map.get(key);
            d.s24 += getSalesValue(row, '2024', salesMix);
            d.s25 += getSalesValue(row, '2025', salesMix);
            d.c24 += row.SALES2024_CASH || 0; d.c25 += row.SALES2025_CASH || 0;
            d.cr24 += row.SALES2024_CREDIT || 0; d.cr25 += row.SALES2025_CREDIT || 0;
        });

        return Array.from(map.values()).map(d => ({
            ...d,
            cont25: totalS25 > 0 ? (d.s25/totalS25)*100 : 0,
            growth: d.s24 === 0 ? (d.s25 > 0 ? Infinity : 0) : ((d.s25-d.s24)/d.s24)*100
        })).sort((a,b) => b.s25 - a.s25);
    }, [divisionData, salesMix]);

    if (!processed) return <div className="text-center py-20">No data.</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Division: <span className="text-sky-400">{divisionName}</span></h2>
                <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-sky-600 text-white font-black text-[10px] uppercase rounded-lg">Back</button>
            </div>
            
            <div className="table-container border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-black/90 backdrop-blur sticky top-0 z-20 border-b border-white/5">
                        <tr>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-300">Department / Category</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-sky-300 text-right">2024 Sales</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-emerald-300 text-right">2025 Sales</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-emerald-300 text-right">2025 Cont%</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-emerald-300 text-right">2025 Cash</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-emerald-300 text-right">2025 Credit</th>
                            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-300 text-right">Growth%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-numeric">
                        {processed.map((row, i) => (
                            <tr key={i} className="hover:bg-indigo-500/5 transition-colors text-[11px] group cursor-pointer" onClick={() => navigate(`/division/${encodeURIComponent(divisionName!)}/${encodeURIComponent(row.department)}/${encodeURIComponent(row.category)}`)}>
                                <td className="p-4">
                                    <span className="block text-slate-500 font-bold uppercase text-[9px] tracking-widest">{row.department}</span>
                                    <span className="block text-slate-200 font-sans font-bold uppercase tracking-tight">{row.category}</span>
                                </td>
                                <td className="p-4 text-right text-sky-400/80">{formatNumberAbbreviated(row.s24)}</td>
                                <td className="p-4 text-right text-emerald-400 font-bold">{formatNumberAbbreviated(row.s25)}</td>
                                <td className="p-4 text-right text-emerald-400/70">{row.cont25.toFixed(1)}%</td>
                                <td className="p-4 text-right text-emerald-400/70">{formatNumberAbbreviated(row.c25)}</td>
                                <td className="p-4 text-right text-emerald-400/70">{formatNumberAbbreviated(row.cr25)}</td>
                                <td className="p-4 text-right"><GrowthIndicator value={row.growth} className="text-[11px]" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DivisionDetailView;