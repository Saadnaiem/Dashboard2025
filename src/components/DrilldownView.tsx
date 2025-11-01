import React, { useState, useMemo } from 'react';
import { RawSalesDataRow } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

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
    
    const processedData = useMemo(() => {
        let displayData = [...data];

        // Branch filtering for new/lost entities
        if (hasBranchFilter && selectedBranch && allData) {
            const entityType = viewType.includes('brand') ? 'BRAND' : 'ITEM DESCRIPTION';
            const relevantEntities = new Set(
                allData
                    .filter(row => row['BRANCH NAME'] === selectedBranch)
                    .map(row => row[entityType])
            );
            displayData = displayData.filter(item => relevantEntities.has(item.name));
        }
        
        // Search filtering
        if (searchTerm) {
            displayData = displayData.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sorting
        const sortKey = sortConfig.key;
        if (sortKey) {
            displayData.sort((a, b) => {
                const aValue = (a as any)[sortKey] ?? -Infinity;
                const bValue = (b as any)[sortKey] ?? -Infinity;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        // Add contribution percentages
        return displayData.map(item => ({
            ...item,
            contribution2025: totalSales2025 > 0 && item.sales2025 ? (item.sales2025 / totalSales2025) * 100 : 0,
            contribution2024: totalSales2024 > 0 && item.sales2024 ? (item.sales2024 / totalSales2024) * 100 : 0
        }));
    }, [data, searchTerm, sortConfig, totalSales2025, totalSales2024, hasBranchFilter, selectedBranch, allData, viewType]);

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

    const headers = useMemo(() => {
        const baseHeaders = [
            { key: 'name', label: 'Name', className: 'w-1/3' },
            { key: 'sales2025', label: '2025 Sales', className: 'text-right' },
            { key: 'sales2024', label: '2024 Sales', className: 'text-right' },
            { key: 'growth', label: 'Growth %', className: 'text-right' },
            { key: 'contribution2025', label: '2025 Contrib. %', className: 'text-right' },
            { key: 'contribution2024', label: '2024 Contrib. %', className: 'text-right' },
        ];
        
        switch (viewType) {
            case 'new_brands':
            case 'new_items':
                return [baseHeaders[0], baseHeaders[1], baseHeaders[4]];
            case 'lost_brands':
            case 'lost_items':
                return [baseHeaders[0], baseHeaders[2], baseHeaders[5]];
            default: // divisions, branches, brands, items, pareto_*
                return baseHeaders;
        }
    }, [viewType]);

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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-md bg-slate-700 hover:bg-sky-600 transition-colors" aria-label="Back to dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-extrabold text-white">{title}</h1>
                </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-white">Detailed Breakdown</h2>
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
                    <table className="min-w-full text-left text-sm text-slate-300 table-sortable">
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
                                <tr key={item.name} className="border-b border-slate-700 hover:bg-slate-800/60 transition-colors">
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
