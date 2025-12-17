
import React, { useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams, Link, useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { RawSalesDataRow, ProcessedData, FilterState, EntitySalesData, LayoutContextType } from '../types';
import { processSalesData, getSalesValue } from '../services/dataProcessor';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import useOnClickOutside from '../hooks/useOnClickOutside';

interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

type SortableKeys = keyof EntitySalesData | 'sales2024' | 'sales2025' | 'growth' | 'code' | 'name' | 'contribution2024' | 'contribution2025' | 'cash2024' | 'credit2024' | 'cash2025' | 'credit2025' | 'cashGrowth' | 'creditGrowth' | 'cashPercent2025';

const ContributionCell: React.FC<{ value: number; }> = ({ value }) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return <span className="text-right block">-</span>;
    }
    return <span className="text-right block">{value.toFixed(2)}%</span>;
};

const FilterDropdown: React.FC<{ 
    label: string, 
    options: string[], 
    selected: string[], 
    onChange: (val: string[]) => void 
}> = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    useOnClickOutside(ref, () => setIsOpen(false));

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    const toggle = (val: string) => {
        if (selected.includes(val)) {
            onChange(selected.filter(s => s !== val));
        } else {
            onChange([...selected, val]);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-600 transition-colors"
            >
                {label} {selected.length > 0 && `(${selected.length})`}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2">
                    <input 
                        type="text" 
                        placeholder={`Search ${label}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white mb-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1 filter-list">
                        {filtered.map(opt => (
                            <label key={opt} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded-md cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selected.includes(opt)}
                                    onChange={() => toggle(opt)}
                                    className="form-checkbox"
                                />
                                <span className="text-sm text-slate-200 truncate">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType } = useParams<{ viewType: string }>();
    const { salesMix } = useOutletContext<LayoutContextType>();
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

    const globalSearchTerm = useMemo(() => searchParams.get('search') || '', [searchParams]);

    const filterChoices = useMemo(() => {
        return {
            divisions: [...new Set(allRawData.map(r => r['DIVISION']))].filter(Boolean).sort(),
            departments: [...new Set(allRawData.map(r => r['DEPARTMENT']))].filter(Boolean).sort(),
        };
    }, [allRawData]);

    const globallyFilteredRawData = useMemo(() => {
        const lowercasedTerm = globalSearchTerm.toLowerCase();
        return allRawData.filter(row => {
            const { divisions, departments, categories, branches, brands, items } = globalFilters;
            const effectiveDivisions = localDivisions.length > 0 ? localDivisions : divisions;
            const effectiveDepts = localDepartments.length > 0 ? localDepartments : departments;

            const divisionMatch = effectiveDivisions.length === 0 || effectiveDivisions.includes(row['DIVISION']);
            const departmentMatch = effectiveDepts.length === 0 || effectiveDepts.includes(row['DEPARTMENT']);
            const categoryMatch = categories.length === 0 || categories.includes(row['CATEGORY']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
            const itemMatch = items.length === 0 || items.includes(row['ITEM DESCRIPTION']);
            
            if (!(divisionMatch && departmentMatch && categoryMatch && branchMatch && brandMatch && itemMatch)) return false;

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
    }, [allRawData, globalFilters, globalSearchTerm, localDivisions, localDepartments]);

    const processedViewData = useMemo(() => {
        if (globallyFilteredRawData.length === 0) return null;
        let workingData = globallyFilteredRawData;
        if (salesMix !== 'Total') {
            workingData = globallyFilteredRawData.map(row => ({
                ...row,
                SALES2024: getSalesValue(row, '2024', salesMix),
                SALES2025: getSalesValue(row, '2025', salesMix)
            }));
        }
        return processSalesData(workingData, globalFilterOptions);
    }, [globallyFilteredRawData, globalFilterOptions, salesMix]);

    const masterBranchList = useMemo(() => {
        return [...new Set(allRawData.map(r => r['BRANCH NAME']))].filter(Boolean).sort();
    }, [allRawData]);

    const { title, dataForTable, columns } = useMemo(() => {
        if (!processedViewData) return { title: 'Loading...', dataForTable: [], columns: [] };

        let title = '';
        let data: any[] = [];
        let allColumns: { key: SortableKeys | 'no'; header: string; isNumeric?: boolean }[] = [];
        
        const baseColumns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
            { key: 'name', header: 'Name', isNumeric: false },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'cash2024', header: '2024 Cash', isNumeric: true },
            { key: 'credit2024', header: '2024 Credit', isNumeric: true },
            { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'cash2025', header: '2025 Cash', isNumeric: true },
            { key: 'credit2025', header: '2025 Credit', isNumeric: true },
            { key: 'cashPercent2025', header: 'Cash %', isNumeric: true },
            { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
            { key: 'cashGrowth', header: 'Cash Gr%', isNumeric: true },
            { key: 'creditGrowth', header: 'Credit Gr%', isNumeric: true },
        ];
        
        const itemBaseColumns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
            { key: 'code', header: 'Item Code', isNumeric: false },
            { key: 'name', header: 'Item Name', isNumeric: false },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'cash2025', header: '2025 Cash', isNumeric: true },
            { key: 'credit2025', header: '2025 Credit', isNumeric: true },
            { key: 'cashPercent2025', header: 'Cash %', isNumeric: true },
            { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
            { key: 'cashGrowth', header: 'Cash Gr%', isNumeric: true },
            { key: 'creditGrowth', header: 'Credit Gr%', isNumeric: true },
        ];

        const addContribution = (d: any[]) => d.map(row => ({
            ...row,
            contribution2024: processedViewData.totalSales2024 > 0 ? (row.sales2024 / processedViewData.totalSales2024) * 100 : 0,
            contribution2025: processedViewData.totalSales2025 > 0 ? (row.sales2025 / processedViewData.totalSales2025) * 100 : 0,
            cashPercent2025: row.sales2025 > 0 ? (row.cash2025 / row.sales2025) * 100 : 0
        }));
        
        switch (viewType) {
            case 'divisions': title = 'All Divisions'; data = addContribution(processedViewData.salesByDivision); allColumns = baseColumns; break;
            case 'branches':
                title = 'All Branches';
                const activeBranchesMap = new Map(processedViewData.salesByBranch.map(b => [b.name, b]));
                const mergedBranches = masterBranchList.map(branchName => {
                    const existing = activeBranchesMap.get(branchName);
                    if (existing) return existing;
                    return { name: branchName, sales2024: 0, cash2024: 0, credit2024: 0, sales2025: 0, cash2025: 0, credit2025: 0, growth: 0, cashGrowth: 0, creditGrowth: 0 };
                });
                data = addContribution(mergedBranches); 
                allColumns = baseColumns;
                break;
            case 'brands': title = 'All Brands'; data = addContribution(processedViewData.salesByBrand); allColumns = baseColumns; break;
            case 'items': title = 'All Items'; data = addContribution(processedViewData.salesByItem); allColumns = itemBaseColumns; break;
            case 'pareto_branches': title = 'Top 20% Branches (Pareto)'; data = addContribution(processedViewData.paretoContributors.branches); allColumns = baseColumns; break;
            case 'pareto_brands': title = 'Top 20% Brands (Pareto)'; data = addContribution(processedViewData.paretoContributors.brands); allColumns = baseColumns; break;
            case 'pareto_items': title = 'Top 20% Items (Pareto)'; data = addContribution(processedViewData.paretoContributors.items); allColumns = itemBaseColumns; break;
            case 'new_brands': title = 'New Brands (2025)'; data = addContribution(processedViewData.newBrandsList); allColumns = baseColumns; break;
            case 'lost_brands': title = 'Lost Brands (2024)'; data = addContribution(processedViewData.lostBrandsList); allColumns = baseColumns; break;
            default: title = 'Unknown View';
        }
        
        const filteredColumns = allColumns.filter(col => {
            if (salesMix === 'Total') return true;
            const k = col.key.toString().toLowerCase();
            return !k.startsWith('cash') && !k.startsWith('credit');
        });

        const finalColumns = [{ key: 'no', header: 'No.', isNumeric: false }, ...filteredColumns];
        return { title, dataForTable: data, columns: finalColumns };
    }, [viewType, processedViewData, masterBranchList, salesMix]);

    const finalData = useMemo(() => {
        if (!dataForTable) return [];
        const lowercasedTerm = localSearchTerm.toLowerCase();
        if (!localSearchTerm) return dataForTable;
        return dataForTable.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowercasedTerm)));
    }, [dataForTable, localSearchTerm]);

    const sortedData = useMemo(() => {
        if (!finalData) return [];
        let sortableData = [...finalData];
        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [finalData, sortConfig]);

    const totalRow = useMemo(() => {
        if (!sortedData.length) return null;
        const sums = sortedData.reduce((acc, row) => {
            acc.s24 += row.sales2024 || 0; acc.s25 += row.sales2025 || 0;
            acc.c24 += row.cash2024 || 0; acc.c25 += row.cash2025 || 0;
            acc.cr24 += row.credit2024 || 0; acc.cr25 += row.credit2025 || 0;
            acc.contrib24 += row.contribution2024 || 0; acc.contrib25 += row.contribution2025 || 0;
            return acc;
        }, { s24: 0, s25: 0, c24: 0, c25: 0, cr24: 0, cr25: 0, contrib24: 0, contrib25: 0 });

        return {
            name: `Total (${sortedData.length})`, sales2024: sums.s24, sales2025: sums.s25,
            cash2024: sums.c24, cash2025: sums.c25, credit2024: sums.cr24, credit2025: sums.cr25,
            cashPercent2025: sums.s25 > 0 ? (sums.c25 / sums.s25) * 100 : 0,
            contribution2024: sums.contrib24, contribution2025: sums.contrib25,
            growth: sums.s24 === 0 ? (sums.s25 > 0 ? Infinity : 0) : ((sums.s25 - sums.s24) / sums.s24) * 100
        };
    }, [sortedData]);

    const handleExport = (format: 'pdf' | 'csv') => {
        const head = [columns.map(c => c.header)];
        const body = sortedData.map((row, i) => columns.map(col => {
            if (col.key === 'no') return i + 1;
            const val = row[col.key as keyof typeof row];
            if (col.key.toString().includes('growth')) return isNaN(val) ? '-' : val === Infinity ? 'New' : `${val.toFixed(1)}%`;
            if (col.key.toString().includes('contribution') || col.key === 'cashPercent2025') return `${val.toFixed(2)}%`;
            if (col.isNumeric) return formatNumberAbbreviated(val);
            return val;
        }));
        if (totalRow) {
            body.unshift(columns.map(col => {
                if (col.key === 'no') return 'TOTAL';
                const val = totalRow[col.key as keyof typeof totalRow];
                if (col.key.toString().includes('growth')) return isNaN(val) ? '-' : val === Infinity ? 'New' : `${val.toFixed(1)}%`;
                if (col.key.toString().includes('contribution') || col.key === 'cashPercent2025') return `${val.toFixed(2)}%`;
                if (col.isNumeric) return formatNumberAbbreviated(val);
                return val;
            }));
        }
        if (format === 'csv') {
            const csv = Papa.unparse({ fields: head[0], data: body });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${title.toLowerCase().replace(/ /g, '_')}.csv`);
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } else {
            const doc = new jsPDF() as any;
            doc.text(title, 14, 15);
            doc.autoTable({ startY: 20, head, body, theme: 'striped', headStyles: { fillColor: [22, 163, 74] } });
            doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
        }
    };

    if (!processedViewData) return <div className="text-white text-center py-20">Processing...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>
                    Back to Dashboard
                </Link>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-6">
                <div className="flex flex-wrap items-center gap-4 border-b border-slate-700 pb-6">
                    <div className="relative flex-grow max-w-md">
                        <input
                            type="text"
                            placeholder={`Search ${title}...`}
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <FilterDropdown label="Division" options={filterChoices.divisions} selected={localDivisions} onChange={setLocalDivisions} />
                        <FilterDropdown label="Department" options={filterChoices.departments} selected={localDepartments} onChange={setLocalDepartments} />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg text-sm hover:bg-slate-500 transition-all">CSV</button>
                        <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg text-sm hover:bg-slate-500 transition-all">PDF</button>
                    </div>
                </div>

                {(localDivisions.length > 0 || localDepartments.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="text-sm font-bold text-sky-400">Filtered By:</span>
                        {localDivisions.map(d => (
                            <span key={d} className="filter-pill">
                                <button onClick={() => setLocalDivisions(localDivisions.filter(x => x !== d))} className="filter-pill-remove">&times;</button>
                                <span className="filter-pill-type">Div:</span>{d}
                            </span>
                        ))}
                        {localDepartments.map(d => (
                            <span key={d} className="filter-pill">
                                <button onClick={() => setLocalDepartments(localDepartments.filter(x => x !== d))} className="filter-pill-remove">&times;</button>
                                <span className="filter-pill-type">Dept:</span>{d}
                            </span>
                        ))}
                    </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-xs uppercase bg-slate-800 sticky top-0 z-20 font-bold">
                            <tr>
                                {columns.map(col => {
                                    let colorClass = 'text-sky-300';
                                    if (col.header.includes('2024')) colorClass = 'text-sky-400';
                                    if (col.header.includes('2025')) colorClass = 'text-green-400';
                                    
                                    return (
                                        <th 
                                            key={col.key} 
                                            scope="col" 
                                            className={`p-3 whitespace-nowrap cursor-pointer hover:bg-slate-700 ${colorClass} ${col.isNumeric ? 'text-right' : 'text-left'}`} 
                                            onClick={() => setSortConfig({ key: col.key as SortableKeys, direction: sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                        >
                                            {col.header} {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {totalRow && (
                                <tr className="bg-sky-900/60 font-bold text-white sticky top-[37px] z-10 backdrop-blur-sm">
                                    {columns.map(col => (
                                        <td key={`total-${col.key}`} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                            {(() => {
                                                if (col.key === 'no') return 'TOTAL';
                                                const val = totalRow[col.key as keyof typeof totalRow];
                                                if (col.key === 'name') return totalRow.name;
                                                if (col.key.toString().includes('growth')) return <GrowthIndicator value={val as number} />;
                                                if (col.key.toString().includes('contribution')) return <ContributionCell value={val as number} />;
                                                if (col.key === 'cashPercent2025') return <span className="text-right block">{val.toFixed(2)}%</span>;
                                                if (col.isNumeric) return formatNumberAbbreviated(val as number);
                                                return val;
                                            })()}
                                        </td>
                                    ))}
                                </tr>
                            )}
                            {sortedData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-700/50 transition-colors text-sm">
                                    {columns.map(col => {
                                        const val = row[col.key as keyof typeof row];
                                        return (
                                            <td key={col.key} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right font-mono' : 'text-left'} ${col.key.toString().includes('2025') && col.isNumeric ? 'font-bold text-green-400' : ''}`}>
                                                {(() => {
                                                    if (col.key === 'no') return i + 1;
                                                    if (col.key === 'name' && viewType === 'brands') return <Link to={`/brand/${encodeURIComponent(val)}`} className="text-sky-400 hover:underline">{val}</Link>;
                                                    if (col.key.toString().includes('growth')) return <GrowthIndicator value={val as number} />;
                                                    if (col.key.toString().includes('contribution')) return <ContributionCell value={val as number} />;
                                                    if (col.key === 'cashPercent2025') return <span className="text-right block">{val.toFixed(2)}%</span>;
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

export default DrilldownView;
