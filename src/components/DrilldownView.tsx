import React, { useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams, Link, useOutletContext } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RawSalesDataRow, ProcessedData, EntitySalesData, LayoutContextType, SalesMix } from '../types';
import { processSalesData, getSalesValue } from '../services/dataProcessor';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import useOnClickOutside from '../hooks/useOnClickOutside';

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fb7185', '#facc15'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold uppercase tracking-tighter">
            {`${name.slice(0, 15)} (${(percent * 100).toFixed(0)}%)`}
        </text>
    );
};

const FilterDropdown: React.FC<{ 
    label: string, options: string[], selected: string[], onChange: (val: string[]) => void 
}> = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    useOnClickOutside(ref, () => setIsOpen(false));
    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
    const toggle = (val: string) => onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-600 transition-colors">
                {label} {selected.length > 0 && `(${selected.length})`}
                <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2">
                    <input type="text" placeholder={`Search ${label}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white mb-2 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                    <div className="max-h-60 overflow-y-auto space-y-1 filter-list">
                        {filtered.map(opt => (
                            <label key={opt} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded-md cursor-pointer">
                                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="form-checkbox" />
                                <span className="text-sm text-slate-200 truncate">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SalesMixSelector: React.FC<{ current: SalesMix, onChange: (mix: SalesMix) => void }> = ({ current, onChange }) => {
    return (
        <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-700 self-center">
            {['Total', 'Cash', 'Credit'].map((m) => (
                <button
                    key={m}
                    onClick={() => onChange(m as SalesMix)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${current === m ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    {m}
                </button>
            ))}
        </div>
    );
};

type SortableKeys = keyof EntitySalesData | 'no' | 'contribution2025' | 'cashContrib2025' | 'creditContrib2025';

interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

interface ColumnDef {
    key: string;
    header: string;
    isNumeric?: boolean;
    year?: '2024' | '2025';
}

const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType } = useParams<{ viewType: string }>();
    const { salesMix, setSalesMix } = useOutletContext<LayoutContextType>();
    const [searchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'sales2025', direction: 'desc' });
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [localDivisions, setLocalDivisions] = useState<string[]>([]);
    const [localDepartments, setLocalDepartments] = useState<string[]>([]);

    const globallyFilteredRawData = useMemo(() => {
        const searchTerm = searchParams.get('search')?.toLowerCase() || '';
        const divisions = searchParams.get('divisions')?.split(',').filter(Boolean) || [];
        const departments = searchParams.get('departments')?.split(',').filter(Boolean) || [];
        return allRawData.filter(row => {
            const effDivs = localDivisions.length ? localDivisions : divisions;
            const effDepts = localDepartments.length ? localDepartments : departments;
            if (effDivs.length && !effDivs.includes(row['DIVISION'])) return false;
            if (effDepts.length && !effDepts.includes(row['DEPARTMENT'])) return false;
            if (searchTerm) return ['DIVISION', 'BRANCH NAME', 'BRAND', 'ITEM DESCRIPTION'].some(k => row[k]?.toLowerCase().includes(searchTerm));
            return true;
        });
    }, [allRawData, searchParams, localDivisions, localDepartments]);

    const processedViewData = useMemo(() => {
        if (!globallyFilteredRawData.length) return null;
        let data = globallyFilteredRawData;
        if (salesMix !== 'Total') {
            data = data.map(row => ({ ...row, SALES2024: getSalesValue(row, '2024', salesMix), SALES2025: getSalesValue(row, '2025', salesMix) }));
        }
        return processSalesData(data, globalFilterOptions);
    }, [globallyFilteredRawData, globalFilterOptions, salesMix]);

    const { title, dataForTable, columns, topFiveData } = useMemo(() => {
        if (!processedViewData) return { title: 'Loading...', dataForTable: [], columns: [], topFiveData: [] };
        let titleStr = '', rawData: EntitySalesData[] = [];
        
        switch (viewType) {
            case 'divisions': titleStr = 'Divisions'; rawData = processedViewData.salesByDivision; break;
            case 'branches': titleStr = 'Branches'; rawData = processedViewData.salesByBranch; break;
            case 'brands': titleStr = 'Brands'; rawData = processedViewData.salesByBrand; break;
            case 'items': titleStr = 'Items'; rawData = processedViewData.salesByItem; break;
            default: titleStr = 'View';
        }

        const data = rawData.map(r => ({
            ...r,
            contribution2025: processedViewData.totalSales2025 > 0 ? (r.sales2025 / processedViewData.totalSales2025) * 100 : 0,
            cashContrib2025: processedViewData.totalCash2025 > 0 ? (r.cash2025 / processedViewData.totalCash2025) * 100 : 0,
            creditContrib2025: processedViewData.totalCredit2025 > 0 ? (r.credit2025 / processedViewData.totalCredit2025) * 100 : 0,
        }));

        const cols: ColumnDef[] = [
            { key: 'no', header: 'No.', isNumeric: false },
            { key: 'name', header: 'Description', isNumeric: false },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true, year: '2024' },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true, year: '2025' },
            { key: 'contribution2025', header: '2025 Cont%', isNumeric: true, year: '2025' },
            { key: 'cash2025', header: '2025 Cash', isNumeric: true, year: '2025' },
            { key: 'credit2025', header: '2025 Credit', isNumeric: true, year: '2025' },
            { key: 'cashContrib2025', header: 'Cash Cont%', isNumeric: true, year: '2025' },
            { key: 'creditContrib2025', header: 'Credit Cont%', isNumeric: true, year: '2025' },
            { key: 'growth', header: 'Growth%', isNumeric: true },
            { key: 'cashGrowth', header: 'Cash GR%', isNumeric: true },
            { key: 'creditGrowth', header: 'Credit GR%', isNumeric: true },
        ];

        return { title: titleStr, dataForTable: data, columns: cols, topFiveData: data.sort((a,b) => b.sales2025 - a.sales2025).slice(0, 5) };
    }, [viewType, processedViewData, salesMix]);

    const sortedData = useMemo(() => {
        const filtered = localSearchTerm ? dataForTable.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(localSearchTerm.toLowerCase()))) : dataForTable;
        return sortConfig ? [...filtered].sort((a: any, b: any) => {
            if (sortConfig.key === 'no') return 0;
            const aVal = a[sortConfig.key] ?? 0;
            const bVal = b[sortConfig.key] ?? 0;
            return (aVal < bVal ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1);
        }) : filtered;
    }, [dataForTable, localSearchTerm, sortConfig]);

    if (!processedViewData) return <div className="text-white text-center py-20">Processing Analysis...</div>;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Analysis: <span className="text-sky-400">{title}</span></h2>
                </div>
                <div className="flex items-center gap-3">
                    <SalesMixSelector current={salesMix} onChange={setSalesMix} />
                    <Link to="/" className="px-5 py-2.5 bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg">Exit View</Link>
                </div>
            </div>

            <div className="bg-slate-800/50 p-10 rounded-3xl border border-slate-700/80 flex flex-col items-center justify-center min-h-[400px] w-full shadow-2xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-12">Top 5 Revenue Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={topFiveData} dataKey="sales2025" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={10} label={renderCustomizedLabel}>
                            {topFiveData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltipForPie />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6">
                <div className="flex flex-wrap items-center gap-6 border-b border-slate-700/50 pb-6">
                    <div className="relative flex-grow max-w-sm">
                        <input type="text" placeholder={`Filter ${title}...`} value={localSearchTerm} onChange={(e) => setLocalSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold" />
                    </div>
                    <FilterDropdown label="Division" options={globalFilterOptions?.divisions || []} selected={localDivisions} onChange={setLocalDivisions} />
                    <FilterDropdown label="Department" options={globalFilterOptions?.departments || []} selected={localDepartments} onChange={setLocalDepartments} />
                </div>

                <div className="table-container border border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-slate-900/40">
                    <table className="w-full text-left text-slate-300">
                        <thead className="bg-slate-950/80 sticky top-0 z-20 border-b-2 border-slate-800">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} className={`p-4 text-[9px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-800 transition-colors ${col.year === '2024' ? 'text-sky-400' : col.year === '2025' ? 'text-emerald-400' : 'text-slate-500'} ${col.isNumeric ? 'text-right' : ''}`} onClick={() => setSortConfig({ key: col.key as SortableKeys, direction: sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                        {col.header} {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-numeric">
                            {sortedData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-700/20 transition-all text-[11px] group">
                                    {columns.map(col => {
                                        const val = row[col.key as keyof typeof row];
                                        return (
                                            <td key={col.key} className={`p-4 ${col.isNumeric ? 'text-right' : 'font-bold uppercase tracking-tight'} ${col.year === '2024' ? 'text-sky-400/70' : col.year === '2025' ? 'text-emerald-400/80 font-bold' : 'text-slate-300'}`}>
                                                {(() => {
                                                    if (col.key === 'no') return i + 1;
                                                    if (col.key === 'name' && viewType === 'brands') return <Link to={`/brand/${encodeURIComponent(String(val))}`} className="text-sky-400 hover:text-sky-300 underline underline-offset-4">{val}</Link>;
                                                    if (col.key.toString().toLowerCase().includes('growth')) return <GrowthIndicator value={val as number} />;
                                                    if (col.key.toString().includes('contrib')) return `${(val as number).toFixed(1)}%`;
                                                    if (col.isNumeric) return formatNumberAbbreviated(val as number);
                                                    return val;
                                                })()}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CustomTooltipForPie = ({ active, payload }: any) => {
    if (active && payload?.length) {
        const item = payload[0].payload;
        return (
            <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[240px]">
                <p className="font-black text-white mb-3 text-[10px] uppercase tracking-widest border-b border-slate-800 pb-2">{payload[0].name}</p>
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-baseline border-l-4 border-sky-500/50 pl-3">
                        <span className="text-[9px] font-black text-sky-400/70 uppercase">2024</span>
                        <span className="text-sm font-numeric font-black text-sky-400">{formatNumberAbbreviated(item.sales2024 || 0)}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-l-4 border-emerald-500/50 pl-3">
                        <span className="text-[9px] font-black text-emerald-400/70 uppercase">2025</span>
                        <span className="text-sm font-numeric font-black text-emerald-400">{formatNumberAbbreviated(item.sales2025 || 0)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default DrilldownView;