import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { getSalesValue } from '../services/dataProcessor';

const calculateGrowth = (current: number, previous: number) => 
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

interface DivisionDetailViewProps {
    allRawData: RawSalesDataRow[];
}

type TableData = {
    department: string;
    category: string;
    sales2024: number;
    cash2024: number;
    credit2024: number;
    sales2025: number;
    cash2025: number;
    credit2025: number;
    contribution2024: number;
    contribution2025: number;
    cashPercent2025: number;
    growth: number;
    cashGrowth: number;
    creditGrowth: number;
};

const DEPT_ROW_COLORS = [
    'bg-sky-900/10', 'bg-indigo-900/10', 'bg-emerald-900/10', 'bg-rose-900/10', 'bg-amber-900/10'
];

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ allRawData }) => {
    const { divisionName } = useParams<{ divisionName: string }>();
    const { salesMix } = useOutletContext<LayoutContextType>();
    const navigate = useNavigate();
    const [sortConfig] = useState<{ key: keyof TableData; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const divisionData = useMemo(() => allRawData.filter(row => row['DIVISION'] === divisionName), [allRawData, divisionName]);
    const handleRowClick = (d: string, c: string) => navigate(`/division/${encodeURIComponent(divisionName!)}/${encodeURIComponent(d)}/${encodeURIComponent(c)}`);

    const processedData = useMemo(() => {
        if (!divisionData.length) return null;
        let totalSales24 = 0, totalSales25 = 0;
        let totalC24 = 0, totalC25 = 0, totalCr24 = 0, totalCr25 = 0;
        const tableMap = new Map<string, any>();

        divisionData.forEach(row => {
            const s24 = getSalesValue(row, '2024', salesMix), s25 = getSalesValue(row, '2025', salesMix);
            const c24 = row.SALES2024_CASH || 0, c25 = row.SALES2025_CASH || 0;
            const cr24 = row.SALES2024_CREDIT || 0, cr25 = row.SALES2025_CREDIT || 0;

            totalSales24 += s24; totalSales25 += s25;
            totalC24 += c24; totalC25 += c25;
            totalCr24 += cr24; totalCr25 += cr25;

            const key = `${row.DEPARTMENT}|${row.CATEGORY}`;
            if (!tableMap.has(key)) tableMap.set(key, { department: row.DEPARTMENT, category: row.CATEGORY, s24: 0, s25: 0, c24: 0, c25: 0, cr24: 0, cr25: 0 });
            const entry = tableMap.get(key)!;
            entry.s24 += s24; entry.s25 += s25;
            entry.c24 += c24; entry.c25 += c25;
            entry.cr24 += cr24; entry.cr25 += cr25;
        });

        const tableData: TableData[] = Array.from(tableMap.values()).map(d => ({
            ...d, department: d.department, category: d.category, sales2024: d.s24, sales2025: d.s25,
            contribution2024: totalSales24 > 0 ? (d.s24/totalSales24)*100 : 0,
            contribution2025: totalSales25 > 0 ? (d.s25/totalSales25)*100 : 0,
            growth: calculateGrowth(d.s25, d.s24),
            cashGrowth: calculateGrowth(d.c25, d.c24),
            creditGrowth: calculateGrowth(d.cr25, d.cr24),
            cashPercent2025: d.s25 > 0 ? (d.c25/d.s25)*100 : 0,
        } as TableData));

        return { totalSales24, totalSales25, totalC24, totalC25, totalCr24, totalCr25, tableData };
    }, [divisionData, salesMix]);
    
    const groupedData = useMemo(() => {
        if (!processedData?.tableData) return [];
        const groups: Record<string, TableData[]> = {};
        processedData.tableData.forEach(r => { if (!groups[r.department]) groups[r.department] = []; groups[r.department].push(r); });

        return Object.entries(groups).map(([dept, cats]) => {
            const sorted = [...cats].sort((a, b) => (a[sortConfig.key] < b[sortConfig.key] ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1));
            const total = cats.reduce((acc, r) => ({ 
                s24: acc.s24 + r.sales2024, s25: acc.s25 + r.sales2025,
                c24: acc.c24 + r.cash2024, c25: acc.c25 + r.cash2025,
                cr24: acc.cr24 + r.credit2024, cr25: acc.cr25 + r.credit2025
            }), { s24: 0, s25: 0, c24: 0, c25: 0, cr24: 0, cr25: 0 });
            return { dept, categories: sorted, totalS24: total.s24, totalS25: total.s25, totalC24: total.c24, totalC25: total.c25, totalCr24: total.cr24, totalCr25: total.cr25 };
        }).sort((a, b) => b.totalS25 - a.totalS25);
    }, [processedData, sortConfig]);

    if (!processedData) return <div className="text-center py-10">No data available.</div>;

    const showExtendedGrowth = salesMix === 'Total';
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                <h2 className="text-2xl font-extrabold text-white">Division: <span className="text-sky-400 font-sans">{divisionName}</span></h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 transition-all font-sans">Back</Link>
            </div>
            
            <div className="table-container">
                <table className="w-full text-left text-slate-300 table-sortable">
                    <thead className="text-[10px] uppercase bg-slate-900 sticky top-0 z-20 font-bold border-b border-slate-700">
                        <tr>
                            <th className="text-slate-400">Department / Category</th>
                            <th className="text-sky-400 text-right">2024 Sales</th>
                            <th className="text-green-400 text-right">2025 Sales</th>
                            <th className="text-slate-400 text-right">Growth %</th>
                            {showExtendedGrowth && (
                                <>
                                    <th className="text-emerald-400 text-right">Cash GR%</th>
                                    <th className="text-indigo-400 text-right">Credit GR%</th>
                                </>
                            )}
                            <th className="text-slate-400 text-right font-sans">Contrib %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {groupedData.map((group, idx) => (
                            <React.Fragment key={group.dept}>
                                <tr className="bg-slate-700/40 font-bold text-xs">
                                    <td className="text-white py-2 uppercase tracking-wide font-sans">{group.dept} TOTAL</td>
                                    <td className="text-sky-400 text-right font-numeric">{formatNumberAbbreviated(group.totalS24)}</td>
                                    <td className="text-green-400 text-right font-numeric">{formatNumberAbbreviated(group.totalS25)}</td>
                                    <td className="text-right"><GrowthIndicator value={calculateGrowth(group.totalS25, group.totalS24)} className="text-xs" /></td>
                                    {showExtendedGrowth && (
                                        <>
                                            <td className="text-right"><GrowthIndicator value={calculateGrowth(group.totalC25, group.totalC24)} className="text-xs" /></td>
                                            <td className="text-right"><GrowthIndicator value={calculateGrowth(group.totalCr25, group.totalCr24)} className="text-xs" /></td>
                                        </>
                                    )}
                                    <td className="text-right font-numeric text-slate-400">{(group.totalS25/processedData.totalSales25*100).toFixed(1)}%</td>
                                </tr>
                                {group.categories.map((row, cidx) => (
                                    <tr key={cidx} className={`hover:bg-sky-500/10 transition-colors text-xs cursor-pointer ${DEPT_ROW_COLORS[idx % DEPT_ROW_COLORS.length]}`} onClick={() => handleRowClick(group.dept, row.category)}>
                                       <td className="pl-8 text-slate-400 italic font-sans">{row.category}</td>
                                       <td className="text-sky-400/80 text-right font-numeric">{formatNumberAbbreviated(row.sales2024)}</td>
                                       <td className="text-green-300 text-right font-numeric">{formatNumberAbbreviated(row.sales2025)}</td>
                                       <td className="text-right"><GrowthIndicator value={row.growth} className="text-[10px]" /></td>
                                       {showExtendedGrowth && (
                                            <>
                                                <td className="text-right"><GrowthIndicator value={row.cashGrowth} className="text-[10px]" /></td>
                                                <td className="text-right"><GrowthIndicator value={row.creditGrowth} className="text-[10px]" /></td>
                                            </>
                                        )}
                                       <td className="text-right font-numeric text-slate-500">{row.contribution2025.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DivisionDetailView;