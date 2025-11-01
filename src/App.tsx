import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { RawSalesDataRow, ProcessedData, FilterState } from './types';
import { processSalesData, normalizeRow } from './services/dataProcessor';
import LoadingIndicator from './components/LoadingIndicator';
import Dashboard from './components/Dashboard';
import DrilldownView, { DrilldownViewProps } from './components/DrilldownView';

const createEmptyProcessedData = (filterOptions: ProcessedData['filterOptions']): ProcessedData => ({
    totalSales2024: 0,
    totalSales2025: 0,
    salesGrowthPercentage: 0,
    salesByDivision: [],
    salesByBrand: [],
    salesByBranch: [],
    salesByItem: [],
    top10Brands: [],
    top50Items: [],
    branchCount2024: 0,
    branchCount2025: 0,
    brandCount2024: 0,
    brandCount2025: 0,
    itemCount2024: 0,
    itemCount2025: 0,
    topDivision: null,
    pareto: {
        branches: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0 },
        brands: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0 },
        items: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0 },
    },
    paretoContributors: { branches: [], brands: [], items: [] },
    newEntities: {
        branches: { count: 0, sales: 0, percentOfTotal: 0 },
        brands: { count: 0, sales: 0, percentOfTotal: 0 },
        items: { count: 0, sales: 0, percentOfTotal: 0 },
    },
    newBrandsList: [],
    newItemsList: [],
    lostEntities: {
        brands: { count: 0, sales2024: 0, percentOfTotal: 0 },
        items: { count: 0, sales2024: 0, percentOfTotal: 0 },
    },
    lostBrandsList: [],
    lostItemsList: [],
    filterOptions: filterOptions,
});

const App: React.FC = () => {
    const [loadingState, setLoadingState] = useState({ isLoading: true, progress: 0, message: '' });
    const [error, setError] = useState<string | null>(null);
    
    const [allData, setAllData] = useState<RawSalesDataRow[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [filters, setFilters] = useState<FilterState>({ divisions: [], branches: [], brands: [], items: [] });
    const [currentView, setCurrentView] = useState<{ view: string; title: string } | null>(null);

    useEffect(() => {
        const GDRIVE_URL = 'https://corsproxy.io/?https://drive.google.com/uc?export=download&id=1ra1vcQbJiufmfXK0Yvl8qocQLlhjKMAk';

        const fetchData = async () => {
            setError(null);
            setLoadingState({ isLoading: true, progress: 10, message: 'Downloading data from Google Drive...' });

            try {
                const response = await fetch(GDRIVE_URL);
                if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                const csvText = await response.text();
                setLoadingState({ isLoading: true, progress: 25, message: 'Parsing data...' });

                Papa.parse<Record<string, string>>(csvText, {
                    header: true, skipEmptyLines: true, worker: true,
                    complete: (results) => {
                        setLoadingState({ isLoading: true, progress: 50, message: 'Validating data...' });
                        
                        const requiredHeaders = ['DIVISION', 'SALES2024', 'SALES2025', 'BRANCH NAME', 'BRAND', 'ITEM DESCRIPTION'];
                        const fileHeaders = results.meta.fields?.map(h => h.trim().toUpperCase()) || [];
                        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                        if (missingHeaders.length > 0) {
                            setError(`Missing required columns: ${missingHeaders.join(', ')}`);
                            setLoadingState({ isLoading: false, progress: 0, message: '' });
                            return;
                        }
                        
                        setAllData(results.data.map(row => normalizeRow(row, fileHeaders)));
                        setLoadingState({ isLoading: true, progress: 75, message: 'Processing data...' });
                    },
                    error: (err: any) => {
                        setError(`Failed to parse CSV data: ${err.message}`);
                        setLoadingState({ isLoading: false, progress: 0, message: '' });
                    }
                });

            } catch (err: any) {
                 setError(`Failed to fetch data: ${err instanceof Error ? err.message : String(err)}`);
                 setLoadingState({ isLoading: false, progress: 0, message: '' });
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (allData.length > 0) {
            try {
                const data = processSalesData(allData);
                setProcessedData(data);
                setLoadingState({ isLoading: true, progress: 100, message: 'Done!' });
                setTimeout(() => setLoadingState({ isLoading: false, progress: 0, message: '' }), 500);
            } catch (err: any) {
                 setError(err instanceof Error ? `Error processing data: ${err.message}` : 'An unknown error occurred during data processing.');
                 setLoadingState({ isLoading: false, progress: 0, message: '' });
            }
        }
    }, [allData]);
    
    const filteredData = useMemo(() => {
        if (!processedData) return null;

        const filteredRows = allData.filter(row => {
            const { divisions, branches, brands, items } = filters;
            return (divisions.length === 0 || divisions.includes(row['DIVISION'])) &&
                   (branches.length === 0 || branches.includes(row['BRANCH NAME'])) &&
                   (brands.length === 0 || brands.includes(row['BRAND'])) &&
                   (items.length === 0 || items.includes(row['ITEM DESCRIPTION']));
        });
        
        if (filteredRows.length === 0 && allData.length > 0) return createEmptyProcessedData(processedData.filterOptions);
        if (filteredRows.length === allData.length) return processedData;
        return processSalesData(filteredRows, processedData.filterOptions);
    }, [processedData, filters, allData]);


    const handleViewChange = (view: string, title: string) => setCurrentView({ view, title });
    const handleBackToDashboard = () => setCurrentView(null);

    const renderContent = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
                    <div className="w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                     <button onClick={() => window.location.reload()} className="mt-6 bg-indigo-600 text-white text-lg font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300">Retry</button>
                </div>
            );
        }

        if (loadingState.isLoading || !filteredData) {
            return <LoadingIndicator progress={loadingState.progress} message={loadingState.message} />;
        }

        if (currentView) {
            let drilldownProps: DrilldownViewProps = {
                title: currentView.title,
                viewType: currentView.view,
                data: [],
                totalSales2024: filteredData.totalSales2024,
                totalSales2025: filteredData.totalSales2025,
                onBack: handleBackToDashboard,
            };

            switch (currentView.view) {
                case 'divisions': drilldownProps.data = filteredData.salesByDivision; break;
                case 'branches': drilldownProps.data = filteredData.salesByBranch; break;
                case 'brands': drilldownProps.data = filteredData.salesByBrand; break;
                case 'items': drilldownProps.data = filteredData.salesByItem; break;
                case 'pareto_branches': drilldownProps.data = filteredData.paretoContributors.branches; break;
                case 'pareto_brands': drilldownProps.data = filteredData.paretoContributors.brands; break;
                case 'pareto_items': drilldownProps.data = filteredData.paretoContributors.items; break;
                case 'new_brands': 
                    drilldownProps.data = filteredData.newBrandsList;
                    drilldownProps.allData = allData;
                    drilldownProps.branchOptions = processedData?.filterOptions.branches;
                    break;
                case 'new_items':
                    drilldownProps.data = filteredData.newItemsList;
                    drilldownProps.allData = allData;
                    drilldownProps.branchOptions = processedData?.filterOptions.branches;
                    break;
                case 'lost_brands':
                    drilldownProps.data = filteredData.lostBrandsList;
                    drilldownProps.allData = allData;
                    drilldownProps.branchOptions = processedData?.filterOptions.branches;
                    break;
                case 'lost_items':
                    drilldownProps.data = filteredData.lostItemsList;
                    drilldownProps.allData = allData;
                    drilldownProps.branchOptions = processedData?.filterOptions.branches;
                    break;
            }

            return <DrilldownView {...drilldownProps} />;
        }

        if (filteredData) {
            return <Dashboard data={filteredData} filters={filters} onFilterChange={setFilters} onViewChange={handleViewChange} />;
        }
        
        return null;
    };

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-8">
            {renderContent()}
        </div>
    );
};

export default App;
