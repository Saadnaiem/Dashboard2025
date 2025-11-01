import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RawSalesDataRow, ProcessedData } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

type SortDirection = 'ascending' | 'descending';
interface SortConfig { key: string; direction: SortDirection; }
type DrilldownItem = { name: string; sales2024?: number; sales2025?: number; growth?: number; };

export interface DrilldownViewProps {
    filteredData: ProcessedData;
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

const viewTitles: { [key: string]: string } = {
    'divisions': 'All Divisions Deep Dive', 'branches': 'All Branches Deep Dive', 'brands': 'All Brands Deep Dive', 'items': 'All Items Deep Dive',
    'pareto_branches': 'Pareto: Top 20% Branches', 'pareto_brands': 'Pareto: Top 20% Brands', 'pareto_items': 'Pareto: Top 20% Items',
    'new_brands': 'New Brands in 2025', 'new_items': 'New Items in 2025', 'lost_brands': 'Lost Brands from 2024', 'lost_items': 'Lost Items from 2024',
};

const DrilldownView: React.FC<DrilldownViewProps> = ({ filteredData, allRawData, globalFilterOptions }) => {
    const { viewType = '' } = useParams<{ viewType: string }>();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sales2025', direction: 'descending' });
    const [selectedBranch, setSelectedBranch] = useState('');

    const hasBranchFilter = useMemo(() => ['new_brands', 'new_items', 'lost_brands', 'lost_items'].includes(viewType), [viewType]);
    
    const { processedData, tableTitle, headers, summaryTotals, summaryDescription } = useMemo(() => {
        let displayData: DrilldownItem[] = [];
        let viewData: { [key: string]: any[] } = {
            'divisions': filteredData.salesByDivision, 'branches': filteredData.salesByBranch, 'brands': filteredData.salesByBrand, 'items': filteredData.salesByItem,
            'pareto_branches': filteredData.paretoContributors.branches, 'pareto_brands': filteredData.paretoContributors.brands, 'pareto_items': filteredData.paretoContributors.items,
            'new_brands': filteredData.newBrandsList, 'new_items': filteredData.newItemsList, 'lost_brands': filteredData.lostBrandsList, 'lost_items': filteredData.lostItemsList,
        };
        displayData = viewData[viewType] || [];

        let currentTitle = viewTitles[viewType] || 'Deep Dive';
        let localTotal24 = filteredData.totalSales2024;
        let localTotal25 = filteredData.totalSales2025;

        if (hasBranchFilter && selectedBranch && allRawData) {
            currentTitle = `${currentTitle.split(' in ')[0]} in ${selectedBranch}`;
            const branchData = allRawData.filter(row => row['BRANCH NAME'] === selectedBranch);
            
            localTotal25 = branchData.reduce((acc, row) => acc + row['SALES2025'], 0);
            localTotal24 = branchData.reduce((acc, row) => acc + row['SALES2024'], 0);
            
            const entityType = viewType.includes('brand') ? 'BRAND' : 'ITEM DESCRIPTION';
            const entitySales: { [key: string]: { s24: number, s25: number } } = {};
            
            branchData.forEach(row => {
                const key = row[entityType];
                if (key) {
                    entitySales[key] = entitySales[key] || { s24: 0, s25: 0 };
                    entitySales[key].s24 += row['SALES2024'];
                    entitySales[key].s25 += row['SALES2025'];
                }
            });
            
            const newDisplayData: DrilldownItem[] = [];
            if (viewType.startsWith('new_')) {
                Object.entries(entitySales).forEach(([name, { s24, s25 }]) => { if (s25 > 0 && s24 === 0) newDisplayData.push({ name, sales2025: s25 }); });
            } else if (viewType.startsWith('lost_')) {
                Object.entries(entitySales).forEach(([name, { s24, s25 }]) => { if (s24 > 0 && s25 === 0) newDisplayData.push({ name, sales2024: s24 }); });
            }
            displayData = newDisplayData;
        }

        const baseHeaders = [
            { key: 'name', label: 'Name', className: 'w-1/3' }, { key: 'sales2025', label: '2025 Sales', className: 'text-right' },
            { key: 'sales2024', label: '2024 Sales', className: 'text-right' }, { key: 'growth', label: 'Growth %', className: 'text-right' },
            { key: 'contribution2025', label: '2025 Contrib. %', className: 'text-right' }, { key: 'contribution2024', label: '2024 Contrib. %', className: 'text-right' },
        ];
        let currentHeaders;
        switch (viewType) {
            case 'new_brands': case 'new_items': currentHeaders = [baseHeaders[0], baseHeaders[1], baseHeaders[4]]; break;
            case 'lost_brands': case 'lost_items': currentHeaders = [baseHeaders[0], baseHeaders[2], baseHeaders[5]]; break;
            default: currentHeaders = baseHeaders;
        }
        
        if (searchTerm) displayData = displayData.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

        let finalData = displayData.map(item => ({
            ...item,
            contribution2025: localTotal25 > 0 && item.sales2025 ? (item.sales2025 / localTotal25) * 100 : 0,
            contribution2024: localTotal24 > 0 && item.sales2024 ? (item.sales2024 / localTotal24) * 100 : 0
        }));

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
        const calculateGrowth = (current: number, previous: number) => previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;
        summaryTotals.growth = calculateGrowth(summaryTotals.total2025, summaryTotals.total2024);
        
        const generateDescription = () => {
            let baseText = `This table shows a detailed breakdown for "${currentTitle}".`;
            if (hasBranchFilter) {
                if (selectedBranch) {
                    baseText = `This table shows a detailed breakdown for "${currentTitle.split(' in ')[0]}" within the ${selectedBranch} branch.`;
                } else {
                    baseText += ` You can select a branch from the dropdown to see data specific to that location.`;
                }
            }
            return baseText;
        };

        return { processedData: finalData, tableTitle: currentTitle, headers: currentHeaders, summaryTotals, summaryDescription: generateDescription() };
    }, [viewType, filteredData, searchTerm, sortConfig, hasBranchFilter, selectedBranch, allRawData]);

    const requestSort = (key: string) => {
        let direction: SortDirection = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') direction = 'ascending';
        setSortConfig({ key, direction });
    };

    const getSortClassName = (name: string) => !sortConfig || sortConfig.key !== name ? '' : sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';

    const renderCell = (item: any, headerKey: string) => {
        const value = item[headerKey];
        switch(headerKey) {
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
        const csvContent = [
            headers.map(h => h.label).join(','),
            ...processedData.map(item =>
                headers.map(h => {
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
        const tableRows: any[][] = processedData.map(item =>
            headers.map(h => {
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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 rounded-md bg-slate-700 hover:bg-sky-600 transition-colors" aria-label="Back to dashboard">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-sm font-bold text-slate-400 uppercase">Total Rows</div>
                        <div className="text-2xl font-extrabold text-white">{summaryTotals.count.toLocaleString()}</div>
                    </div>
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
            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                         {hasBranchFilter && globalFilterOptions && (
                            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white w-full sm:w-auto">
                                <option value="">All Branches</option>
                                {globalFilterOptions.branches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        )}
                        <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-auto" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-300 table-sortable table-banded">
                        <thead className="bg-slate-700/50 text-xs text-slate-200 uppercase tracking-wider">
                            <tr>{headers.map(h => <th key={h.key} scope="col" className={`p-4 ${h.className}`} onClick={() => requestSort(h.key)}><span className={getSortClassName(h.key)}>{h.label}</span></th>)}</tr>
                        </thead>
                        <tbody>
                            {processedData.map((item) => <tr key={item.name} className="border-b border-slate-700 hover:bg-sky-500/10 transition-colors">{headers.map(h => renderCell(item, h.key))}</tr>)}
                        </tbody>
                    </table>
                </div>
                 {processedData.length === 0 && <div className="text-center py-8 text-slate-400">No results found for your search or filter selection.</div>}
            </div>
        </div>
    );
};

export default DrilldownView;