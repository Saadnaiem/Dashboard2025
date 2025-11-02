
import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { RawSalesDataRow, ProcessedData, FilterState, EntitySalesData } from '../types';
import { processSalesData } from '../services/dataProcessor';
import Header from './Header';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

type SortableKeys = keyof EntitySalesData | 'sales2024' | 'sales2025' | 'growth' | 'code' | 'name';

const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType } = useParams<{ viewType: string }>();
    const [searchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'sales2025', direction: 'desc' });

    const filters: FilterState = useMemo(() => ({
        divisions: searchParams.get('divisions')?.split(',') || [],
        branches: searchParams.get('branches')?.split(',') || [],
        brands: searchParams.get('brands')?.split(',') || [],
        items: searchParams.get('items')?.split(',') || [],
    }), [searchParams]);

    const searchTerm = useMemo(() => searchParams.get('search') || '', [searchParams]);

    const filteredRawData = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return allRawData.filter(row => {
            const { divisions, branches, brands, items } = filters;
            const divisionMatch = divisions.length === 0 || divisions.includes(row['DIVISION']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
            const itemMatch = items.length === 0 || items.includes(row['ITEM DESCRIPTION']);
            const dropdownMatch = divisionMatch && branchMatch && brandMatch && itemMatch;

            if (!dropdownMatch) return false;

            if (searchTerm) {
                return (
                    (row['DIVISION']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRANCH NAME']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRAND']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['ITEM DESCRIPTION']?.toLowerCase().includes(lowercasedTerm))
                );
            }
            return true;
        });
    }, [allRawData, filters, searchTerm]);

    const processedViewData = useMemo(() => {
        if (filteredRawData.length === 0) return null;
        return processSalesData(filteredRawData, globalFilterOptions);
    }, [filteredRawData, globalFilterOptions]);

    const { title, dataForTable, columns } = useMemo(() => {
        if (!processedViewData) return { title: 'Loading...', dataForTable: [], columns: [] };

        let title = '';
        let data: any[] = [];
        let columns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [];

        const defaultColumns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
            { key: 'name', header: 'Name' },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
        ];
        
        const itemColumns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
            { key: 'code', header: 'Item Code' },
            { key: 'name', header: 'Item Name' },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
        ];

        switch (viewType) {
            case 'divisions':
                title = 'Divisions Drilldown';
                data = processedViewData.salesByDivision;
                columns = defaultColumns;
                break;
            case 'branches':
                title = 'Branches Drilldown';
                data = processedViewData.salesByBranch;
                columns = defaultColumns;
                break;
            case 'brands':
                title = 'Brands Drilldown';
                data = processedViewData.salesByBrand;
                columns = defaultColumns;
                break;
            case 'items':
                title = 'Items Drilldown';
                data = processedViewData.salesByItem;
                columns = itemColumns;
                break;
            case 'pareto_branches':
                title = 'Top 20% Branches (Pareto)';
                data = processedViewData.paretoContributors.branches;
                columns = defaultColumns;
                break;
            case 'pareto_brands':
                title = 'Top 20% Brands (Pareto)';
                data = processedViewData.paretoContributors.brands;
                columns = defaultColumns;
                break;
            case 'pareto_items':
                title = 'Top 20% Items (Pareto)';
                data = processedViewData.paretoContributors.items;
                columns = itemColumns;
                break;
            case 'new_brands':
                title = 'New Brands in 2025';
                data = processedViewData.newBrandsList;
                columns = [{ key: 'name', header: 'Brand Name' }, { key: 'sales2025', header: '2025 Sales', isNumeric: true }];
                break;
            case 'lost_brands':
                title = 'Lost Brands from 2024';
                data = processedViewData.lostBrandsList;
                columns = [{ key: 'name', header: 'Brand Name' }, { key: 'sales2024', header: '2024 Sales', isNumeric: true }];
                break;
            case 'new_items':
                title = 'New Items in 2025';
                data = processedViewData.newItemsList;
                columns = [{ key: 'code', header: 'Item Code' }, { key: 'name', header: 'Item Name' }, { key: 'sales2025', header: '2025 Sales', isNumeric: true }];
                break;
            case 'lost_items':
                title = 'Lost Items from 2024';
                data = processedViewData.lostItemsList;
                columns = [{ key: 'code', header: 'Item Code' }, { key: 'name', header: 'Item Name' }, { key: 'sales2024', header: '2024 Sales', isNumeric: true }];
                break;
            default:
                title = 'Unknown View';
        }
        return { title, dataForTable: data, columns };
    }, [viewType, processedViewData]);

    const sortedData = useMemo(() => {
        if (!dataForTable) return [];
        let sortableData = [...dataForTable];
        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                
                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
                
                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [dataForTable, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig(null);
            return;
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIndicator = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };

    if (!processedViewData) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading details...</div>;
    }

    const renderCell = (row: any, col: { key: SortableKeys; header: string; isNumeric?: boolean }) => {
        const value = row[col.key];
        if (col.key === 'growth') {
            return <GrowthIndicator value={value} />;
        }
        if (col.key === 'sales2024' || col.key === 'sales2025') {
            return formatNumberAbbreviated(value);
        }
        return value;
    };

    return (
        <div className="flex flex-col gap-6">
            <Header />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white text-center sm:text-left">{title}</h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                    </svg>
                    Back to Dashboard
                </Link>
            </div>

            <div className="overflow-x-auto bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
                <table className="w-full text-left text-slate-300">
                    <thead className="text-sm text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} scope="col" className={`p-4 cursor-pointer hover:bg-slate-600/50 transition-colors ${col.isNumeric ? 'text-right' : ''}`} onClick={() => requestSort(col.key)}>
                                    <div className={`flex items-center gap-2 ${col.isNumeric ? 'justify-end' : ''}`}>
                                        {col.header}
                                        <span className="text-sky-400">{getSortIndicator(col.key)}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, index) => (
                            <tr key={index} className="border-b border-slate-700 hover:bg-slate-800/80 transition-colors">
                                {columns.map(col => (
                                    <td key={col.key} className={`p-4 whitespace-nowrap ${col.isNumeric ? 'text-right font-mono' : ''}`}>
                                        {renderCell(row, col)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedData.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        No data available for this view.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrilldownView;
