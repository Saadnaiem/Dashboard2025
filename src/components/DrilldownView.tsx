import React, { useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams, Link, useOutletContext } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RawSalesDataRow, ProcessedData, FilterState, EntitySalesData, LayoutContextType, SalesMix } from '../types';
import { processSalesData, getSalesValue } from '../services/dataProcessor';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import useOnClickOutside from '../hooks/useOnClickOutside';

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fb7185', '#facc15'];

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
            <button
                onClick={() => onChange('Total')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${current === 'Total' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Total
            </button>
            <button
                onClick={() => onChange('Cash')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${current === 'Cash' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Cash
            </button>
            <button
                onClick={() => onChange('Credit')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${current === 'Credit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Credit
            </button>
        </div>
    );
};

type SortableKeys = keyof EntitySalesData | 'no' | 'contribution2024' | 'contribution2025';

interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

interface ColumnDef {
    key: string;
    header: string;
    isNumeric?: boolean;
}

const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType } = useParams<{ viewType: string }>();
    const { salesMix, setSalesMix } = useOutletContext<LayoutContextType>();
    const [searchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'sales2025', direction: 'desc' });
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [localDivisions, setLocalDivisions] = useState<string[]>([]);
    const [localDepartments, setLocalDepartments] = useState<string[]>([]);

    const globalFilters: FilterState = useMemo(() => ({
        divisions: searchParams.get('divisions')?.split(',').filter(Boolean) || [],
        departments: searchParams.get('departments')?.split(',').filter(Boolean) || [],
        categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
        branches: searchParams.get('branches')?.split(',').filter(Boolean) || [],
        brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
        items: searchParams.get('items')?.split(',').filter(Boolean) || [],
    }), [searchParams]);

    const globallyFilteredRawData = useMemo(() => {
        const searchTerm = searchParams.get('search')?.toLowerCase() || '';
        return allRawData.filter(row => {
            const effDivs = localDivisions.length ? localDivisions : globalFilters.divisions;
            const effDepts = localDepartments.length ? localDepartments : globalFilters.departments;
            const mDiv = !effDivs.length || effDivs.includes(row['DIVISION']);
            const mDep = !effDepts.length || effDepts.includes(row['DEPARTMENT']);
            const mCat = !globalFilters.categories.length || globalFilters.categories.includes(row['CATEGORY']);
            const mBra = !globalFilters.branches.length || globalFilters.branches.includes(row['BRANCH NAME']);
            const mBrd = !globalFilters.brands.length || globalFilters.brands.includes(row['BRAND']);
            if (!(mDiv && mDep && mCat && mBra && mBrd)) return false;
            if (searchTerm) return ['DIVISION', 'BRANCH NAME', 'BRAND', 'ITEM DESCRIPTION'].some(k => row[k]?.toLowerCase().includes(searchTerm));
            return true;
        });
    }, [allRawData, globalFilters, searchParams, localDivisions, localDepartments]);

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
        let titleStr = '', data: any[] = [];
        const base: ColumnDef[] = [
            { key: 'name', header: 'Name', isNumeric: false },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'contribution2024', header: 'Contrib % (24)', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'contribution2025', header: 'Contrib % (25)', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
            ...(salesMix === 'Total' ? [
                { key: 'cashGrowth', header: 'Cash GR%', isNumeric: true },
                { key: 'creditGrowth', header: 'Credit GR%', isNumeric: true },
            ] : [])
        ];
        const addContrib = (d: any[]) => d.map(r => ({ ...r, 
            contribution2024: processedViewData.totalSales2024 > 0 ? (r.sales2024/processedViewData.totalSales2024)*100 : 0,
            contribution2025: processedViewData.totalSales2025 > 0 ? (r.sales2025/processedViewData.totalSales2025)*100 : 0
        }));

        switch (viewType) {
            case 'divisions': titleStr = 'Divisions'; data = addContrib(processedViewData.salesByDivision); break;
            case 'branches': titleStr = 'Branches'; data = addContrib(processedViewData.salesByBranch); break;
            case 'brands': titleStr = 'Brands'; data = addContrib(processedViewData.salesByBrand); break;
            case 'items': titleStr = 'Items'; data = addContrib(processedViewData.salesByItem); break;
            default: titleStr = 'View'; data = [];
        }
        
        const top5 = [...data].sort((a,b) => b.sales2025 - a.sales2025).slice(0, 5);
        const finalCols: ColumnDef[] = [{key:'no', header:'No.', isNumeric: false}, ...base];
        
        return { title: titleStr, dataForTable: data, columns: finalCols, topFiveData: top5 };
    }, [viewType, processedViewData, salesMix]);

    const sortedData = useMemo(() => {
        const filtered = localSearchTerm ? dataForTable.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(localSearchTerm.toLowerCase()))) : dataForTable;
        return sortConfig ? [...filtered].sort((a,b) => (a[sortConfig.key] < b[sortConfig.key] ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1)) : filtered;
    }, [dataForTable, localSearchTerm, sortConfig]);

    if (!processedViewData) return <div className="text-white text-center py-20 font-sans">Processing...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Analysis: <span className="text-sky-400">{title}</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Detailed Hierarchy deep-dive</p>
                </div>
                <div className="flex items-center gap-3">
                    <SalesMixSelector current={salesMix} onChange={setSalesMix} />
                    <Link to="/" className="px-5 py-2.5 bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-xl hover:bg-sky-500 transition-all border border-sky-400/20">
                        Exit View
                    </Link>
                </div>
            </div>

            {/* Visual Summary: Pie Chart Section */}
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/80 flex flex-col items-center justify-center min-h-[350px] w-full shadow-2xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 border-b border-slate-700/50 pb-2">Top 5 Revenue Contributors</h3>
                <div className="flex flex-col md:flex-row items-center justify-around w-full gap-12">
                    <div className="flex-1 w-full max-w-[420px]">
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={topFiveData} dataKey="sales2025" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={75} paddingAngle={8}>
                                    {topFiveData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltipForPie />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-4 flex-1 w-full">
                        {topFiveData.map((d, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-all">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-4 h-4 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="text-xs font-black text-slate-200 truncate uppercase tracking-tight">{d.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-numeric font-black text-sky-400 leading-none">{formatNumberAbbreviated(d.sales2025)}</p>
                                    <p className="text-[9px] font-bold text-slate-500 mt-1">2025 TARGET MET</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6">
                <div className="flex flex-wrap items-center gap-6 border-b border-slate-700/50 pb-6">
                    <div className="relative flex-grow max-w-sm">
                        <input type="text" placeholder={`Filter ${title}...`} value={localSearchTerm} onChange={(e) => setLocalSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold" />
                        <svg className="absolute left-3 top-3 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div className="flex gap-3">
                        <FilterDropdown label="Division" options={globalFilterOptions?.divisions || []} selected={localDivisions} onChange={setLocalDivisions} />
                        <FilterDropdown label="Department" options={globalFilterOptions?.departments || []} selected={localDepartments} onChange={setLocalDepartments} />
                    </div>
                </div>

                <div className="table-container">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-[9px] uppercase bg-slate-950 sticky top-0 z-20 font-black tracking-[0.1em] border-b border-slate-800">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} className={`${col.header.includes('2024') ? 'text-sky-400' : col.header.includes('2025') ? 'text-green-400' : 'text-slate-500'} ${col.isNumeric ? 'text-right' : ''}`} onClick={() => setSortConfig({ key: col.key as SortableKeys, direction: sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                        {col.header} {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-700/20 transition-colors text-xs font-numeric group">
                                    {columns.map(col => {
                                        const val = row[col.key as keyof typeof row];
                                        return (
                                            <td key={col.key} className={`${col.isNumeric ? 'text-right' : 'font-bold uppercase tracking-tight'} ${col.key.toString().includes('2024') ? 'text-sky-400/80' : col.key.toString().includes('2025') ? 'text-green-400' : 'text-slate-300'}`}>
                                                {(() => {
                                                    if (col.key === 'no') return i + 1;
                                                    if (col.key === 'name' && viewType === 'brands') return <Link to={`/brand/${encodeURIComponent(val)}`} className="text-sky-400 hover:text-sky-300 underline underline-offset-4 decoration-sky-500/20">{val}</Link>;
                                                    if (col.key.toString().toLowerCase().includes('growth')) return <GrowthIndicator value={val as number} />;
                                                    if (col.key.toString().includes('contribution')) return `${(val as number).toFixed(2)}%`;
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
            <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[220px]">
                <p className="font-black text-white mb-3 text-[10px] uppercase tracking-widest border-b border-slate-800 pb-2 truncate max-w-[200px]">{payload[0].name}</p>
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