import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { RawSalesDataRow, ProcessedData, EntitySalesData, FilterState } from '../types';
import { processSalesData } from '../services/dataProcessor';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import Header from './Header';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Type assertion for jsPDF with autoTable plugin
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

// Props
interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

// Column definition
interface Column {
    key: string;
    header: string;
    render: (row: any) => React.ReactNode;
    sortable: boolean;
    className?: string;
}

const SortIcon: React.FC<{ direction?: 'asc' | 'desc' }> = ({ direction }) => {
    if (!direction) return <span className="text-slate-500">↕</span>;
    return direction === 'asc' ? <span className="text-white">▲</span> : <span className="text-white">▼</span>;
};

const PerformanceStatCard: React.FC<{ stats: any }> = ({ stats }) => (
    <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
        <div className="text-sm font-bold text-slate-300 uppercase tracking-wider">{stats.label}</div>
        <div className="text-4xl font-extrabold text-green-400 my-2">{stats.rate.toFixed(2)}%</div>
        <div className="text-base text-slate-400">
            ({formatNumber(stats.sold)} of {formatNumber(stats.total)} {stats.unit})
        </div>
    </div>
);


const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType = 'branches' } = useParams<{ viewType: string }>();
    const location = useLocation();
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filters = useMemo<FilterState & { search: string }>(() => {
        const params = new URLSearchParams(location.search);
        return {
            divisions: params.get('divisions')?.split(',').filter(Boolean) || [],
            branches: params.get('branches')?.split(',').filter(Boolean) || [],
            brands: params.get('brands')?.split(',').filter(Boolean) || [],
            items: params.get('items')?.split(',').filter(Boolean) || [],
            search: params.get('search') || '',
        };
    }, [location.search]);

    const filteredRawData = useMemo(() => {
        const lowercasedTerm = filters.search.toLowerCase();
        return allRawData.filter(row => {
            const { divisions, branches, brands, items } = filters;
            const divisionMatch = divisions.length === 0 || divisions.includes(row['DIVISION']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
            const itemMatch = items.length === 0 || items.includes(row['ITEM DESCRIPTION']);
            const dropdownMatch = divisionMatch && branchMatch && brandMatch && itemMatch;

            if (!dropdownMatch) return false;

            if (filters.search) {
                return Object.values(row).some(val =>
                    String(val).toLowerCase().includes(lowercasedTerm)
                );
            }
            return true;
        });
    }, [allRawData, filters]);

    const processedViewData = useMemo(() => {
        if (filteredRawData.length === 0) return null;
        return processSalesData(filteredRawData, globalFilterOptions);
    }, [filteredRawData, globalFilterOptions]);

    useEffect(() => {
        // Set default sort based on view type
        switch(viewType) {
            case 'new_brands':
            case 'new_items':
                 setSortConfig({ key: 'sales2025', direction: 'desc' });
                 break;
            case 'lost_brands':
            case 'lost_items':
                setSortConfig({ key: 'sales2024', direction: 'desc' });
                break;
            default:
                setSortConfig({ key: 'sales2025', direction: 'desc' });
        }
    }, [viewType]);


    const { title, data, columns, performanceRateStats } = useMemo(() => {
        if (!processedViewData) return { title: 'No Data for Current Filter', data: [], columns: [], performanceRateStats: null };

        let title = '';
        let data: any[] = [];
        let columns: Column[] = [];
        let performanceRateStats = null;

        const commonColumns = {
            sales2024: { key: 'sales2024', header: '2024 Sales', render: (row: EntitySalesData) => formatNumberAbbreviated(row.sales2024), sortable: true, className: 'text-right' },
            sales2025: { key: 'sales2025', header: '2025 Sales', render: (row: EntitySalesData) => formatNumberAbbreviated(row.sales2025), sortable: true, className: 'text-right' },
            growth: { key: 'growth', header: 'Growth %', render: (row: EntitySalesData) => <GrowthIndicator value={row.growth} />, sortable: true, className: 'text-right' },
        };
        
        switch (viewType) {
            case 'divisions':
                title = 'Division Performance'; data = processedViewData.salesByDivision;
                columns = [ { key: 'name', header: 'Division', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'branches':
                title = 'Branch Performance'; data = processedViewData.salesByBranch;
                columns = [ { key: 'name', header: 'Branch', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'brands':
                title = 'Brand Performance'; data = processedViewData.salesByBrand;
                columns = [ { key: 'name', header: 'Brand', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'items':
                title = 'Item Performance'; data = processedViewData.salesByItem;
                columns = [ { key: 'code', header: 'Item Code', render: (row: any) => row.code, sortable: true }, { key: 'name', header: 'Item Description', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'pareto_branches':
                title = 'Top 20% Branches (Pareto)'; data = processedViewData.paretoContributors.branches;
                columns = [ { key: 'name', header: 'Branch', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'pareto_brands':
                title = 'Top 20% Brands (Pareto)'; data = processedViewData.paretoContributors.brands;
                columns = [ { key: 'name', header: 'Brand', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'pareto_items':
                title = 'Top 20% Items (Pareto)'; data = processedViewData.paretoContributors.items;
                columns = [ { key: 'code', header: 'Item Code', render: (row: any) => row.code, sortable: true }, { key: 'name', header: 'Item Description', render: (row: EntitySalesData) => row.name, sortable: true }, commonColumns.sales2024, commonColumns.sales2025, commonColumns.growth ];
                break;
            case 'new_brands':
                title = 'New Brands (Sold in 2025 only)'; data = processedViewData.newBrandsList;
                columns = [ { key: 'name', header: 'Brand', render: (row: any) => row.name, sortable: true }, commonColumns.sales2025 ];
                break;
            case 'lost_brands':
                title = 'Lost Brands (Sold in 2024 only)'; data = processedViewData.lostBrandsList;
                columns = [ { key: 'name', header: 'Brand', render: (row: any) => row.name, sortable: true }, commonColumns.sales2024 ];
                break;
            case 'new_items':
                title = 'New Items (Sold in 2025 only)'; data = processedViewData.newItemsList;
                columns = [ { key: 'code', header: 'Item Code', render: (row: any) => row.code, sortable: true }, { key: 'name', header: 'Item Description', render: (row: any) => row.name, sortable: true }, commonColumns.sales2025 ];
                const totalItems2025 = processedViewData.itemCount2025, newItemsCount = processedViewData.newEntities.items.count;
                performanceRateStats = { rate: totalItems2025 > 0 ? (newItemsCount / totalItems2025) * 100 : 0, sold: newItemsCount, total: totalItems2025, label: 'New Items Rate', unit: 'Total Items' };
                break;
            case 'lost_items':
                title = 'Lost Items (Sold in 2024 only)'; data = processedViewData.lostItemsList;
                columns = [ { key: 'code', header: 'Item Code', render: (row: any) => row.code, sortable: true }, { key: 'name', header: 'Item Description', render: (row: any) => row.name, sortable: true }, commonColumns.sales2024 ];
                const totalItems2024 = processedViewData.itemCount2024, lostItemsCount = processedViewData.lostEntities.items.count;
                performanceRateStats = { rate: totalItems2024 > 0 ? (lostItemsCount / totalItems2024) * 100 : 0, sold: lostItemsCount, total: totalItems2024, label: 'Lost Items Rate', unit: 'Total Items (2024)' };
                break;
            default:
                title = 'Unknown View';
        }

        return { title, data, columns, performanceRateStats };
    }, [viewType, processedViewData]);

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;
        return [...data].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExportPDF = useCallback(() => {
        const doc = new jsPDF();
        doc.text(title, 14, 16);
        doc.autoTable({
            head: [columns.map(c => c.header)],
            body: sortedData.map(row => columns.map(col => {
                const value = row[col.key];
                if (typeof value === 'number') return formatNumber(value);
                return String(value ?? '');
            })),
            startY: 20,
        });
        doc.save(`${viewType}_details.pdf`);
    }, [title, columns, sortedData, viewType]);

    return (
        <div className="flex flex-col gap-6">
            <Header />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/" className="px-4 py-2 bg-slate-700 text-white font-bold rounded-lg shadow-md hover:bg-sky-600 transition-all flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Back to Dashboard
                    </Link>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                </div>
                <button onClick={handleExportPDF} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    Export PDF
                </button>
            </div>
            
            {performanceRateStats && (
                <div className="my-4 max-w-sm mx-auto">
                    <PerformanceStatCard stats={performanceRateStats} />
                </div>
            )}

            <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-300 uppercase bg-slate-700/50">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} scope="col" className={`px-6 py-3 ${col.sortable ? 'cursor-pointer hover:bg-slate-600' : ''}`} onClick={() => col.sortable && handleSort(col.key)}>
                                        <div className="flex items-center gap-2">
                                            {col.header}
                                            {col.sortable && <SortIcon direction={sortConfig?.key === col.key ? sortConfig.direction : undefined} />}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.length > 0 ? sortedData.map((row, index) => (
                                <tr key={index} className="bg-slate-800/30 border-b border-slate-700 hover:bg-slate-700/50">
                                    {columns.map(col => (
                                        <td key={col.key} className={`px-6 py-4 ${col.className || ''}`}>
                                            {col.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-8 text-slate-400">
                                        No data available for the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DrilldownView;
