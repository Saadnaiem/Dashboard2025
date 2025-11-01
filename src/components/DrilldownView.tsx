import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RawSalesDataRow } from '../types';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
    key: string;
    direction: SortDirection;
}

type DrilldownItem = {
    name: string;
    sales2024?: number;
    sales2025?: number;
    growth?: number;
};

export interface DrilldownViewProps {
    title: string;
    viewType: string;
    data: DrilldownItem[];
    totalSales2024: number;
    totalSales2025: number;
    onBack: () => void;
    allData?: RawSalesDataRow[];
    branchOptions?: string[];
}

const DrilldownView: React.FC<DrilldownViewProps> = ({ title, viewType, data, totalSales2024, totalSales2025, onBack, allData, branchOptions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sales2025', direction: 'descending' });
    const [selectedBranch, setSelectedBranch] = useState('');

    const hasBranchFilter = useMemo(() => ['new_brands', 'new_items', 'lost_brands', 'lost_items'].includes(viewType), [viewType]);
    
    const { processedData, tableTitle, headers, summaryTotals, summaryDescription } = useMemo(() => {
        let displayData: DrilldownItem[] = [...data];
        let currentTitle = title;
        let localTotal24 = totalSales2024;
        let localTotal25 = totalSales2025;

        // Branch filtering for new/lost entities
        if (hasBranchFilter && selectedBranch && allData) {
            currentTitle = `${title.split(' in ')[0]} in ${selectedBranch}`;
            const branchData = allData.filter(row => row['BRANCH NAME'] === selectedBranch);
            
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
                Object.entries(entitySales).forEach(([name, { s24, s25 }]) => {
                    if (s25 > 0 && s24 === 0) newDisplayData.push({ name, sales2025: s25 });
                });
            } else if (viewType.startsWith('lost_')) {
                Object.entries(entitySales).forEach(([name, { s24, s25 }]) => {
                    if (s24 > 0 && s25 === 0) newDisplayData.push({ name, sales2024: s24 });
                });
            }
            displayData = newDisplayData;
        }

        const baseHeaders = [
            { key: 'name', label: 'Name', className: 'w-1/3' },
            { key: 'sales2025', label: '2025 Sales', className: 'text-right' },
            { key: 'sales2024', label: '2024 Sales', className: 'text-right' },
            { key: 'growth', label: 'Growth %', className: 'text-right' },
            { key: 'contribution2025', label: `2025 Contrib. %`, className: 'text-right' },
            { key: 'contribution2024', label: `2024 Contrib. %`, className: 'text-right' },
        ];

        let currentHeaders;
        switch (viewType) {
            case 'new_brands': case 'new_items':
                currentHeaders = [baseHeaders[0], baseHeaders[1], baseHeaders[4]];
                break;
            case 'lost_brands': case 'lost_items':
                currentHeaders = [baseHeaders[0], baseHeaders[2], baseHeaders[5]];
                break;
            default:
                currentHeaders = baseHeaders;
        }
        
        // Search filtering
        if (searchTerm) {
            displayData = displayData.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Add contribution percentages and sort
        let finalData = displayData.map(item => ({
            ...item,
            contribution2025: localTotal25 > 0 && item.sales2025 ? (item.sales2025 / localTotal25) * 100 : 0,
            contribution2024: localTotal24 > 0 && item.sales2024 ? (item.sales2024 / localTotal24) * 100 : 0
        }));

        const sortKey = sortConfig.key;
        if (sortKey) {
            finalData.sort((a, b) => {
                const aValue = (a as any)[sortKey] ?? -Infinity;
                const bValue = (b as any)[sortKey] ?? -Infinity;
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
        const calculateGrowth = (current: number, previous: number) => 
            previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;
        summaryTotals.growth = calculateGrowth(summaryTotals.total2025, summaryTotals.total2024);

        const generateDescription = () => {
            const entityMap: { [key: string]: { plural: string } } = {
                'divisions': { plural: 'divisions' }, 'branches': { plural: 'branches' }, 'brands': { plural: 'brands' }, 'items': { plural: 'items' },
                'pareto_branches': { plural: 'top branches' }, 'pareto_brands': { plural: 'top brands' }, 'pareto_items': { plural: 'top items' },
                'new_brands': { plural: 'new brands' }, 'new_items': { plural: 'new items' }, 'lost_brands': { plural: 'lost brands' }, 'lost_items': { plural: 'lost items' },
            };
            const { plural } = entityMap[viewType] || { plural: 'entities' };
            const branchContext = selectedBranch ? ` for the '${selectedBranch}' branch` : ' across all branches';

            switch (viewType) {
                case 'new_brands': case 'new_items':
                    return `This table lists all ${plural} that appeared in 2025${branchContext}. The totals below reflect the sales performance of only these new entities.`;
                case 'lost_brands': case 'lost_items':
                    return `This table shows all ${plural} from 2024 that had no sales in 2025${branchContext}. The totals below reflect their sales performance in 2024.`;
                case 'pareto_branches': case 'pareto_brands': case 'pareto_items':
                     return `This table displays the top 20% of ${plural} that contribute to 80% of the sales, according to the Pareto principle.`;
                default:
                    return `This table provides a detailed performance comparison for all ${plural}, showing sales figures for 2024 and 2025, along with their growth and contribution to total sales.`;
            }
        };

        return { processedData: finalData, tableTitle: currentTitle, headers: currentHeaders, summaryTotals, summaryDescription: generateDescription() };
    }, [data, searchTerm, sortConfig, totalSales2025, totalSales2024, hasBranchFilter, selectedBranch, allData, viewType, title]);

    const requestSort = (key: string) => {
        let direction: SortDirection = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const getSortClassName = (name: string) => {
        if (!sortConfig || sortConfig.key !== name) return '';
        return sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';
    };

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
        const csvHeaders = headers.map(h => `"${h.label}"`).join(',');
        const csvRows = processedData.map(row => {
            return headers.map(header => {
                let value = (row as any)[header.key];
                if (typeof value === 'number') {
                    if (header.key.includes('contribution')) return value.toFixed(2);
                    if (header.key.includes('growth')) return value === Infinity ? 'New' : value.toFixed(2);
                }
                if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
                return value;
            }).join(',');
        });
        
        const csvString = `${csvHeaders}\n${csvRows.join('\n')}`;
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title.replace(/ /g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        (doc as any).autoTable({
            head: [headers.map(h => h.label)],
            body: processedData.map(row => headers.map(header => {
                const value = (row as any)[header.key];
                if (typeof value === 'number') {
                    if (header.key.includes('contribution')) return `${value.toFixed(2)}%`;
                    if (header.key.includes('growth')) return value === Infinity ? 'New' : `${value.toFixed(2)}%`;
                    return formatNumberAbbreviated(value);
                }
                return value;
            })),
            startY: 20,
            didDrawPage: (data: any) => {
                doc.setFontSize(18);
                doc.setTextColor(40);
                doc.text(tableTitle, data.settings.margin.left, 15);
            },
            styles: {
                fillColor: [30, 41, 59], // slate-800
                textColor: [226, 232, 240], // slate-200
                font: 'Inter',
            },
            headStyles: {
                fillColor: [71, 85, 105], // slate-600
                textColor: [248, 250, 252] // slate-50
            },
            alternateRowStyles: {
                fillColor: [51, 65, 85] // slate-700
            }
        });
        doc.save(`${title.replace(/ /g, '_')}.pdf`);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-md bg-slate-700 hover:bg-sky-600 transition-colors" aria-label="Back to dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-extrabold text-white">{tableTitle}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadCSV} className="p-2 rounded-md bg-slate-700 hover:bg-green-600 transition-colors" aria-label="Download as CSV" title="Download as CSV">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    <button onClick={handleDownloadPDF} className="p-2 rounded-md bg-slate-700 hover:bg-red-600 transition-colors" aria-label="Download as PDF" title="Download as PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </button>
                </div>
            </div>

            <div className="p-6 bg-slate-900/30 rounded-2xl shadow-lg border border-slate-700 flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/2 text-slate-300">
                    <h3 className="text-lg font-bold text-white mb-2">Table Insights</h3>
                    <p className="text-sm">{summaryDescription}</p>
                </div>
                <div className="lg:w-1/2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Entities</div>
                        <div className="text-2xl font-extrabold text-sky-400">{formatNumber(summaryTotals.count)}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">2025 Sales</div>
                        <div className="text-2xl font-extrabold text-white">{!['lost_brands', 'lost_items'].includes(viewType) ? formatNumberAbbreviated(summaryTotals.total2025) : '-'}</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Growth</div>
                        {!['new_brands', 'new_items', 'lost_brands', 'lost_items'].includes(viewType) ? <GrowthIndicator value={summaryTotals.growth} className="text-2xl justify-center" /> : <div className="text-2xl font-extrabold text-slate-400">-</div>}
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                         {hasBranchFilter && branchOptions && (
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white w-full sm:w-auto"
                            >
                                <option value="">All Branches</option>
                                {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        )}
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-auto"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-300 table-sortable table-banded">
                        <thead className="bg-slate-700/50 text-xs text-slate-200 uppercase tracking-wider">
                            <tr>
                                {headers.map(header => (
                                    <th key={header.key} scope="col" className={`p-4 ${header.className}`} onClick={() => requestSort(header.key)}>
                                        <span className={getSortClassName(header.key)}>{header.label}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((item) => (
                                <tr key={item.name} className="border-b border-slate-700 hover:bg-sky-500/10 transition-colors">
                                    {headers.map(header => renderCell(item, header.key))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {processedData.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        No results found for your search or filter selection.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrilldownView;