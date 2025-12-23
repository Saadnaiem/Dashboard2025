
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { RawSalesDataRow, ProcessedData, FilterState } from './types';
import { processSalesData, normalizeRow } from './services/dataProcessor';
import LoadingIndicator from './components/LoadingIndicator';
import Dashboard from './components/Dashboard';

const createEmptyProcessedData = (filterOptions: ProcessedData['filterOptions']): ProcessedData => ({
    totalSales2024: 0,
    totalSales2025: 0,
    salesGrowthPercentage: 0,
    salesByDivision: [],
    salesByBrand: [],
    salesByBranch: [],
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
    newEntities: {
        branches: { count: 0, sales: 0, percentOfTotal: 0 },
        brands: { count: 0, sales: 0, percentOfTotal: 0 },
        items: { count: 0, sales: 0, percentOfTotal: 0 },
    },
    lostEntities: {
        brands: { count: 0, sales2024: 0, percentOfTotal: 0 },
        items: { count: 0, sales2024: 0, percentOfTotal: 0 },
    },
    filterOptions: filterOptions,
});

const App: React.FC = () => {
    const [loadingState, setLoadingState] = useState({ isLoading: true, progress: 0, message: '' });
    const [error, setError] = useState<string | null>(null);
    
    const [allData, setAllData] = useState<RawSalesDataRow[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [filters, setFilters] = useState<FilterState>({ divisions: [], branches: [], brands: [], items: [] });

    useEffect(() => {
        const GDRIVE_FILE_ID = '1ra1vcQbJiufmfXK0Yvl8qocQLlhjKMAk';
        const DIRECT_GDRIVE_URL = `https://drive.google.com/uc?export=download&id=${GDRIVE_FILE_ID}`;
        const CORS_PROXY_URL = `https://corsproxy.io/?${DIRECT_GDRIVE_URL}`;

        const fetchData = async () => {
            setError(null);
            setLoadingState({ isLoading: true, progress: 10, message: 'Downloading data from Google Drive...' });

            // Try multiple fetch strategies in order of reliability
            // Note: Direct Google Drive may fail in browsers due to CORS, but can work in server-side rendering
            // CORS proxy is tried as fallback if direct access fails
            const fetchStrategies = [
                { url: DIRECT_GDRIVE_URL, name: 'Direct Google Drive' },
                { url: CORS_PROXY_URL, name: 'CORS Proxy' },
            ];
            
            let lastError: Error | null = null;
            
            for (const strategy of fetchStrategies) {
                try {
                    setLoadingState({ isLoading: true, progress: 10, message: `Trying ${strategy.name}...` });
                    const response = await fetch(strategy.url);
                    
                    if (!response.ok) {
                        throw new Error(`${strategy.name} failed: ${response.status} ${response.statusText}`);
                    }
                    
                    const csvText = await response.text();
                    
                    // Verify we got actual CSV data, not an error page
                    if (!csvText || csvText.trim().length === 0) {
                        throw new Error(`${strategy.name} returned empty data`);
                    }
                    
                    setLoadingState({ isLoading: true, progress: 25, message: 'Parsing data...' });

                    Papa.parse<Record<string, string>>(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        worker: true,
                        complete: (results) => {
                            setLoadingState({ isLoading: true, progress: 50, message: 'Validating data...' });
                            
                            const requiredHeaders = ['DIVISION', 'SALES2024', 'SALES2025', 'BRANCH NAME', 'BRAND', 'ITEM DESCRIPTION'];
                            const fileHeaders = results.meta.fields?.map(h => h.trim().toUpperCase()) || [];
                            const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                            if (missingHeaders.length > 0) {
                                setError(`Missing required columns in fetched file: ${missingHeaders.join(', ')}`);
                                setLoadingState({ isLoading: false, progress: 0, message: '' });
                                return;
                            }
                            
                            const normalizedData = results.data.map(row => normalizeRow(row, fileHeaders));
                            setAllData(normalizedData);
                            setLoadingState({ isLoading: true, progress: 75, message: 'Processing data...' });
                        },
                        error: (err) => {
                            setError(`Failed to parse CSV data: ${err.message}`);
                            setLoadingState({ isLoading: false, progress: 0, message: '' });
                        }
                    });
                    
                    // If we successfully fetched and started parsing, break out of the loop
                    return;
                    
                } catch (err) {
                    console.error(`${strategy.name} failed:`, err);
                    lastError = err instanceof Error ? err : new Error(String(err));
                    // Continue to next strategy
                }
            }
            
            // If all strategies failed, show error
            if (lastError) {
                const errorMessage = `Failed to fetch data after trying all methods. Last error: ${lastError.message}. Please check your internet connection and try again.`;
                setError(errorMessage);
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
                setTimeout(() => {
                    setLoadingState({ isLoading: false, progress: 0, message: '' });
                }, 500);
            } catch (err) {
                 if (err instanceof Error) {
                    setError(`Error processing data: ${err.message}`);
                } else {
                    setError('An unknown error occurred during data processing.');
                }
                setLoadingState({ isLoading: false, progress: 0, message: '' });
            }
        }
    }, [allData]);
    
    const filteredData = useMemo(() => {
        if (!processedData) return null;

        const filteredRows = allData.filter(row => {
            const { divisions, branches, brands, items } = filters;
            const divisionMatch = divisions.length === 0 || divisions.includes(row['DIVISION']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
            const itemMatch = items.length === 0 || items.includes(row['ITEM DESCRIPTION']);
            return divisionMatch && branchMatch && brandMatch && itemMatch;
        });
        
        if (filteredRows.length === 0 && allData.length > 0) {
            return createEmptyProcessedData(processedData.filterOptions);
        }

        if (filteredRows.length === allData.length) {
            return processedData;
        }

        return processSalesData(filteredRows, processedData.filterOptions);
    }, [processedData, filters, allData]);


    const renderContent = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
                    <div className="w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                     <button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-indigo-600 text-white text-lg font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        if (loadingState.isLoading || !filteredData) {
            return <LoadingIndicator progress={loadingState.progress} message={loadingState.message} />;
        }

        if (filteredData) {
            return (
                <Dashboard
                    data={filteredData}
                    filters={filters}
                    onFilterChange={setFilters}
                />
            );
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