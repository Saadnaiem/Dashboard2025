import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RawSalesDataRow, ProcessedData } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import useOnClickOutside from '../hooks/useOnClickOutside';

type SortDirection = 'ascending' | 'descending';
interface SortConfig { key: string; direction: SortDirection; }
type DrilldownItem = { name: string; code?: string; sales2024?: number; sales2025?: number; growth?: number; };

export interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

const viewTitles: { [key: string]: string } = {
    'divisions': 'All Divisions Deep Dive', 'branches': 'All Branches Deep Dive', 'brands': 'All Brands Deep Dive', 'items': 'All Items Deep Dive',
    'pareto_branches': 'Pareto: Top 20% Branches', 'pareto_brands': 'Pareto: Top 20% Brands', 'pareto_items': 'Pareto: Top 20% Items',
    'new_brands': 'New Brands in 2025', 'new_items': 'New Items in 2025', 'lost_brands': 'Lost Brands from 2024', 'lost_items': 'Lost Items from 2024',
};

const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType = '' } = useParams<{ viewType: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

    const [searchTerm, setSearchTerm] = useState(queryParams.get('search') || '');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sales2025', direction: 'descending' });
    const [showFilters, setShowFilters] = useState(false);
    const filterContainerRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(filterContainerRef, () => setShowFilters(false));
    
    const [localFilters, setLocalFilters] = useState({
        division: [] as string[],
        branch: [] as string[],
        brand: [] as string[],
    });

    const { availableBranches, availableBrands } = useMemo(() => {
        if (!globalFilterOptions) return { availableBranches: [], availableBrands: [] };
        let branches = globalFilterOptions.branches;
        let brands = globalFilterOptions.brands;

        if (localFilters.division.length > 0) {
            const branchSet = new Set<string>();
            allRawData.forEach(row => {
                if (localFilters.division.includes(row['DIVISION'])) {
                    branchSet.add(row['BRANCH NAME']);
                }
            });
            branches = Array.from(branchSet).sort();
        }
        
        if (localFilters.branch.length > 0 || localFilters.division.length > 0) {
             const brandSet = new Set<string>();
             allRawData.forEach(row => {
                const divisionMatch = localFilters.division.length === 0 || localFilters.division.includes(row['DIVISION']);
                const branchMatch = localFilters.branch.length === 0 || localFilters.branch.includes(row['BRANCH NAME']);
                if (divisionMatch && branchMatch) {
                    brandSet.add(row['BRAND']);
                }
            });
            brands = Array.from(brandSet).sort();
        }

        return { availableBranches: branches, availableBrands: brands };
    }, [allRawData, globalFilterOptions, localFilters.division, localFilters.branch]);

    useEffect(() => {
        setLocalFilters(prev => ({ ...prev, branch: [], brand: [] }));
    }, [localFilters.division.join(',')]);

    useEffect(() => {
        setLocalFilters(prev => ({ ...prev, brand: [] }));
    }, [localFilters.branch.join(',')]);

    const handleLocalMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, filterKey: keyof typeof localFilters) => {
        const selectedOptions = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
        setLocalFilters(prev => ({ ...prev, [filterKey]: selectedOptions }));
        setShowFilters(false);
    };

    const resetLocalFilters = () => {
        setLocalFilters({ division: [], branch: [], brand: [] });
        setSearchTerm('');
        setShowFilters(false);
    };

    const { 
        processedData, 
        tableTitle, 
        headers, 
        summaryTotals, 
        summaryDescription, 
        visibleFilters,
        entityTypeLabel,
        performanceRateStats
    } = useMemo(() => {
        
        let locallyFilteredRawData = allRawData.filter(row => {
            return (localFilters.division.length === 0 || localFilters.division.includes(row['DIVISION'])) &&
                   (localFilters.branch.length === 0 || localFilters.branch.includes(row['BRANCH NAME'])) &&
                   (localFilters.brand.length === 0 || localFilters.brand.includes(row['BRAND']));
        });

        let displayData: DrilldownItem[] = [];
        let currentTitle = viewTitles[viewType] || 'Deep Dive';
        let localTotal24 = 0;
        let localTotal25 = 0;

        locallyFilteredRawData.forEach(row => {
            localTotal24 += row['SALES2024'];
            localTotal25 += row['SALES2025'];
        });

        const reprocessLocally = (entityKey: 'BRANCH NAME' | 'BRAND' | 'ITEM DESCRIPTION' | 'DIVISION') => {
            const sales: { [key: string]: { s24: number, s25: number, code?: string } } = {};
            locallyFilteredRawData.forEach(row => {
                const key = row[entityKey];
                if (key) {
                    sales[key] = sales[key] || { s24: 0, s25: 0, code: row['ITEM CODE'] };
                    sales[key].s24 += row['SALES2024'];
                    sales[key].s25 += row['SALES2025'];
                }
            });
            return Object.entries(sales).map(([name, { s24, s25, code }]) => ({
                name,
                code,
                sales2024: s24,
                sales2025: s25,
                growth: s24 === 0 ? (s25 > 0 ? Infinity : 0) : ((s25 - s24) / s24) * 100
            }));
        };

        const findNewOrLost = (isNew: boolean) => {
             const entityKey = viewType.includes('brand') ? 'BRAND' : 'ITEM DESCRIPTION';
             const sales: { [key: string]: { s24: number, s25: number, code?: string } } = {};
             locallyFilteredRawData.forEach(row => {
                 const key = row[entityKey];
                 if (key) {
                     sales[key] = sales[key] || { s24: 0, s25: 0, code: row['ITEM CODE'] };
                     sales[key].s24 += row['SALES2024'];
                     sales[key].s25 += row['SALES2025'];
                 }
             });
             
             return Object.entries(sales)
                .filter(([, {s24, s25}]) => (isNew ? (s25 > 0 && s24 === 0) : (s24 > 0 && s25 === 0)))
                .map(([name, { s24, s25, code }]) => ({ name, code, sales2024: s24, sales2025: s25 }));
        };
        
        const findPareto = (entityKey: 'BRANCH NAME' | 'BRAND' | 'ITEM DESCRIPTION') => {
            const aggregated = reprocessLocally(entityKey);
            const sorted = aggregated.filter(i => i.sales2025 > 0).sort((a, b) => b.sales2025 - a.sales2025);
            const topCount = Math.max(1, Math.ceil(sorted.length * 0.20));
            return sorted.slice(0, topCount);
        };
        
        let entityTypeLabel = "Rows";
        if (viewType.includes('branch')) entityTypeLabel = "Branches";
        else if (viewType.includes('brand')) entityTypeLabel = "Brands";
        else if (viewType.includes('item')) entityTypeLabel = "Items";
        else if (viewType.includes('division')) entityTypeLabel = "Divisions";

        switch (viewType) {
            case 'divisions': displayData = reprocessLocally('DIVISION'); break;
            case 'branches': displayData = reprocessLocally('BRANCH NAME'); break;
            case 'brands': displayData = reprocessLocally('BRAND'); break;
            case 'items': displayData = reprocessLocally('ITEM DESCRIPTION'); break;
            case 'pareto_branches': displayData = findPareto('BRANCH NAME'); break;
            case 'pareto_brands': displayData = findPareto('BRAND'); break;
            case 'pareto_items': displayData = findPareto('ITEM DESCRIPTION'); break;
            case 'new_brands': case 'new_items': displayData = findNewOrLost(true); break;
            case 'lost_brands': case 'lost_items': displayData = findNewOrLost(false); break;
            default: displayData = [];
        }

        const isItemView = viewType.includes('item');
        
        const allHeaders = [
            { key: 'rowNumber', label: '#' }, { key: 'code', label: 'Item Code' }, { key: 'name', label: 'Name' },
            { key: 'sales2025', label: '2025 Sales', className: 'text-right' }, { key: 'sales2024', label: '2024 Sales', className: 'text-right' },
            { key: 'growth', label: 'Growth %', className: 'text-right' },
            { key: 'contribution2025', label: '2025 Contrib. %', className: 'text-right' }, { key: 'contribution2024', label: '2024 Contrib. %', className: 'text-right' },
        ];
        const getHeaders = (keys: string[]) => allHeaders.filter(h => keys.includes(h.key));
        
        let currentHeaders;
        switch (viewType) {
            case 'new_brands': currentHeaders = getHeaders(['rowNumber', 'name', 'sales2025', 'contribution2025']); break;
            case 'new_items': currentHeaders = getHeaders(['rowNumber', 'code', 'name', 'sales2025', 'contribution2025']); break;
            case 'lost_brands': currentHeaders = getHeaders(['rowNumber', 'name', 'sales2024', 'contribution2024']); break;
            case 'lost_items': currentHeaders = getHeaders(['rowNumber', 'code', 'name', 'sales2024', 'contribution2024']); break;
            default:
                const defaultKeys = ['rowNumber', 'name', 'sales2025', 'sales2024', 'growth', 'contribution2025', 'contribution2024'];
                if (isItemView) defaultKeys.splice(1, 0, 'code');
                currentHeaders = getHeaders(defaultKeys);
        }

        let finalData = displayData.map(item => ({
            ...item,
            contribution2025: localTotal25 > 0 && item.sales2025 ? (item.sales2025 / localTotal25) * 100 : 0,
            contribution2024: localTotal24 > 0 && item.sales2024 ? (item.sales2024 / localTotal24) * 100 : 0
        }));

        if (searchTerm) finalData = finalData.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (sortConfig.key) {
            finalData.sort((a, b) => {
                const aValue = (a as any)[sortConfig.key] ?? -Infinity;
                const bValue = (b as any)[sortConfig.key] ?? -Infinity;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        const summaryTotals = {
            count: finalData.length,
            total2025: finalData.reduce((acc, item) => acc + (item.sales2025 || 0), 0),
            total2024: finalData.reduce((acc, item) => acc + (item.sales2024 || 0), 0),
            growth: 0,
        };
        summaryTotals.growth = ((current, previous) => previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100)(summaryTotals.total2025, summaryTotals.total2024);
        
        const generateDescription = () => {
             let activeFilters = (Object.entries(localFilters) as [string, string[]][])
                .filter(([, value]) => value.length > 0)
                .map(([key, value]) => `${key}: ${value.length} selected`)
                .join(', ');
             let baseText = `This table shows a detailed breakdown for "${currentTitle}".`;
             if (activeFilters) {
                 return `${baseText} Currently filtered by ${activeFilters}.`;
             }
             return baseText;
        };

        const visibleFilters = {
            division: !['divisions'].includes(viewType),
            branch: !['divisions', 'branches', 'pareto_branches'].includes(viewType),
            brand: ['items', 'pareto_items', 'new_items', 'lost_items'].includes(viewType)
        };
        
        let performanceRateStats: { rate: number; sold: number; total: number } | null = null;
        const isBrandOrItemView = viewType.includes('brand') || viewType.includes('item');

        if (isBrandOrItemView) {
            const totalInView = displayData.length;
            if (totalInView > 0) {
                const soldInView = displayData.filter(item => item.sales2025 && item.sales2025 > 0).length;
                performanceRateStats = {
                    rate: (soldInView / totalInView) * 100,
                    sold: soldInView,
                    total: totalInView
                };
            } else {
                performanceRateStats = { rate: 0, sold: 0, total: 0 };
            }
        }

        return { 
            processedData: finalData, 
            tableTitle: currentTitle, 
            headers: currentHeaders, 
            summaryTotals, 
            summaryDescription: generateDescription(), 
            visibleFilters,
            entityTypeLabel,
            performanceRateStats
        };
    }, [viewType, allRawData, searchTerm, sortConfig, localFilters]);

    const requestSort = (key: string) => {
        if (key === 'rowNumber') return; // Do not sort by row number
        let direction: SortDirection = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') direction = 'ascending';
        setSortConfig({ key, direction });
    };

    const getSortClassName = (name: string) => !sortConfig || sortConfig.key !== name || name === 'rowNumber' ? '' : sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';

    const renderCell = (item: any, headerKey: string, index: number) => {
        const value = item[headerKey];
        switch(headerKey) {
            case 'rowNumber': return <td className="p-4 text-center text-slate-400">{index + 1}</td>;
            case 'code': return <td className="p-4 font-mono text-sm text-slate-400">{value}</td>;
            case 'name': return <td className="p-4 font-medium text-white truncate max-w-sm" title={value}>{value}</td>;
            case 'sales2025': return <td className="p-4 text-right font-semibold text-green-300">{formatNumberAbbreviated(value)}</td>;
            case 'sales2024': return <td className="p-4 text-right">{formatNumberAbbreviated(value)}</td>;
            case 'growth': return <td className="p-4 text-right"><GrowthIndicator value={value} /></td>;
            case 'contribution2025':
            case 'contribution2024':
                return <td className="p-4 text-right">{typeof value === 'number' ? `${value.toFixed(2)}%` : '-'}</td>;
            default: return <td></td>;
        }
    };
    
    const handleDownloadCSV = () => {
        const csvHeaders = headers.map(h => h.label);
        const csvContent = [
            csvHeaders.join(','),
            ...processedData.map((item, index) =>
                headers.map(h => {
                    if (h.key === 'rowNumber') return index + 1;
                    const value = (item as any)[h.key];
                    if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                    if (typeof value === 'number' && h.key.includes('contribution')) return `${value.toFixed(2)}%`;
                    if (typeof value === 'number' && h.key === 'growth') {
                         if (value === Infinity) return 'New';
                         return `${value.toFixed(2)}%`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `${viewType}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.text(tableTitle, 14, 20);

        const tableColumn = headers.map(h => h.label);
        const tableRows: any[][] = processedData.map((item, index) =>
            headers.map(h => {
                if (h.key === 'rowNumber') return index + 1;
                const value = (item as any)[h.key];
                if (h.key === 'growth') return value === Infinity ? 'New' : typeof value === 'number' ? `${value.toFixed(2)}%` : '-';
                if (h.key.includes('contribution')) return typeof value === 'number' ? `${value.toFixed(2)}%` : '-';
                if (typeof value === 'number') return formatNumberAbbreviated(value);
                return value || '-';
            })
        );

        (doc as any).autoTable({
            head: [tableColumn], body: tableRows, startY: 25, theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] }, // Green-500
            styles: { font: 'helvetica', fontSize: 8 },
        });
        doc.save(`${viewType}_report.pdf`);
    };
    
    const tableFooter = useMemo(() => {
        const firstNumericIndex = headers.findIndex(h => ['sales2025', 'sales2024'].includes(h.key));
        let labelColSpan = headers.length;
        if(firstNumericIndex > -1) {
            labelColSpan = firstNumericIndex;
        }

        const totalContribution2025 = processedData.reduce((acc, item) => acc + ((item as any).contribution2025 || 0), 0);
        const totalContribution2024 = processedData.reduce((acc, item) => acc + ((item as any).contribution2024 || 0), 0);
        
        return (
            <tfoot className="bg-slate-700/80 text-sm font-bold uppercase tracking-wider text-white">
                <tr>
                    <td colSpan={labelColSpan} className="p-4">
                        Totals ({summaryTotals.count.toLocaleString()} {entityTypeLabel})
                    </td>
                    {headers.slice(labelColSpan).map(h => {
                        switch(h.key) {
                            case 'sales2025': return <td key={h.key} className="p-4 text-right text-green-300">{formatNumberAbbreviated(summaryTotals.total2025)}</td>
                            case 'sales2024': return <td key={h.key} className="p-4 text-right">{formatNumberAbbreviated(summaryTotals.total2024)}</td>
                            case 'growth': return <td key={h.key} className="p-4 text-right"><GrowthIndicator value={summaryTotals.growth} /></td>
                            case 'contribution2025': return <td key={h.key} className="p-4 text-right">{totalContribution2025.toFixed(2)}%</td>
                            case 'contribution2024': return <td key={h.key} className="p-4 text-right">{totalContribution2024.toFixed(2)}%</td>
                            default: return <td key={h.key}></td>;
                        }
                    })}
                </tr>
            </tfoot>
        );
    }, [headers, processedData, summaryTotals, entityTypeLabel]);

    // FIX: Cast the result of Object.values(localFilters) to string[][] to correctly type `val` in the `reduce` function.
    const activeFilterCount = (Object.values(localFilters) as string[][]).reduce((acc, val) => acc + val.length, 0);
    const totalActiveIndicators = activeFilterCount + (searchTerm ? 1 : 0);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors" aria-label="Back to dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-extrabold text-white">{tableTitle}</h1>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleDownloadCSV} className="px-4 py-2 bg-slate-700 text-white font-bold rounded-lg shadow-md hover:bg-sky-600 transition-all flex items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        CSV
                    </button>
                    <button onClick={handleDownloadPDF} className="px-4 py-2 bg-slate-700 text-white font-bold rounded-lg shadow-md hover:bg-sky-600 transition-all flex items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        PDF
                    </button>
                </div>
            </div>
             <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-2">Table Insights</h2>
                <p className="text-slate-300 mb-4">{summaryDescription}</p>
                <div className={`grid grid-cols-2 ${performanceRateStats !== null ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 text-center`}>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-sm font-bold text-slate-400 uppercase">Total {entityTypeLabel}</div>
                        <div className="text-2xl font-extrabold text-white">{summaryTotals.count.toLocaleString()}</div>
                    </div>
                     {performanceRateStats !== null && (
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="text-sm font-bold text-slate-400 uppercase">Items Performance Rate</div>
                            <div className="text-2xl font-extrabold text-sky-400">{performanceRateStats.rate.toFixed(2)}%</div>
                            <div className="text-sm font-bold text-green-400">{performanceRateStats.sold.toLocaleString()} / {performanceRateStats.total.toLocaleString()} sold</div>
                        </div>
                    )}
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-sm font-bold text-slate-400 uppercase">2025 Sales</div>
                        <div className="text-2xl font-extrabold text-green-400">{formatNumberAbbreviated(summaryTotals.total2025)}</div>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-sm font-bold text-slate-400 uppercase">2024 Sales</div>
                        <div className="text-2xl font-extrabold text-slate-300">{formatNumberAbbreviated(summaryTotals.total2024)}</div>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-sm font-bold text-slate-400 uppercase">Overall Growth</div>
                        <div className="text-2xl font-extrabold"><GrowthIndicator value={summaryTotals.growth} /></div>
                    </div>
                </div>
            </div>
            <div ref={filterContainerRef} className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:max-w-md">
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="relative px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6-414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            {showFilters ? 'Hide' : 'Show'} Filters
                            {totalActiveIndicators > 0 && (
                                <span className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white text-xs font-bold border-2 border-slate-800">
                                    {totalActiveIndicators}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={resetLocalFilters}
                            className="px-6 py-3 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
                            Reset
                        </button>
                    </div>
                </div>
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-700">
                        {globalFilterOptions && visibleFilters.division && (
                            <div>
                                <label htmlFor="drilldownDivisionFilter" className="block text-sm font-bold text-slate-300 mb-2 ml-1">Filter by Division</label>
                                <select id="drilldownDivisionFilter" multiple size={5} value={localFilters.division} onChange={(e) => handleLocalMultiSelectChange(e, 'division')}>
                                    {globalFilterOptions.divisions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}
                        {globalFilterOptions && visibleFilters.branch && (
                            <div>
                                <label htmlFor="drilldownBranchFilter" className="block text-sm font-bold text-slate-300 mb-2 ml-1">Filter by Branch</label>
                                <select id="drilldownBranchFilter" multiple size={5} value={localFilters.branch} onChange={(e) => handleLocalMultiSelectChange(e, 'branch')}>
                                    {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        )}
                        {globalFilterOptions && visibleFilters.brand && (
                            <div>
                                <label htmlFor="drilldownBrandFilter" className="block text-sm font-bold text-slate-300 mb-2 ml-1">Filter by Brand</label>
                                <select id="drilldownBrandFilter" multiple size={5} value={localFilters.brand} onChange={(e) => handleLocalMultiSelectChange(e, 'brand')}>
                                    {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                )}
                <div className="overflow-x-auto mt-6">
                    <table className="min-w-full text-left text-sm text-slate-300 table-sortable table-banded">
                        <thead className="bg-slate-700/50 text-xs text-slate-200 uppercase tracking-wider">
                            <tr>{headers.map(h => <th key={h.key} scope="col" className={`p-4 ${h.className || ''}`} onClick={() => requestSort(h.key)}><span className={getSortClassName(h.key)}>{h.label}</span></th>)}</tr>
                        </thead>
                        <tbody>
                            {processedData.map((item, index) => <tr key={`${item.name}-${index}`} className="border-b border-slate-700 hover:bg-sky-500/10 transition-colors">{headers.map(h => renderCell(item, h.key, index))}</tr>)}
                        </tbody>
                        {processedData.length > 0 && tableFooter}
                    </table>
                </div>
                 {processedData.length === 0 && <div className="text-center py-8 text-slate-400">No results found for your search or filter selection.</div>}
            </div>
        </div>
    );
};

export default DrilldownView;