
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import { RawSalesDataRow, ProcessedData, FilterState } from './types';
import { processSalesData, normalizeRow } from './services/dataProcessor';
import { useDebounce } from './hooks/useDebounce';
import LoadingIndicator from './components/LoadingIndicator';
import Dashboard from './components/Dashboard';
import DrilldownView from './components/DrilldownView';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import DivisionDetailView from './components/DivisionDetailView';
import ItemDetailView from './components/ItemDetailView';
import BrandDetailView from './components/BrandDetailView';
import ComparisonPage from './components/ComparisonPage';

const createEmptyProcessedData = (filterOptions: ProcessedData['filterOptions']): ProcessedData => ({
    totalSales2024: 0, totalSales2025: 0, 
    totalCash2024: 0, totalCredit2024: 0, totalCash2025: 0, totalCredit2025: 0,
    salesGrowthPercentage: 0, cashGrowthPercentage: 0, creditGrowthPercentage: 0,
    salesByDivision: [], salesByBrand: [], salesByBranch: [], salesByItem: [],
    top10Brands: [], top50Items: [], branchCount2024: 0, branchCount2025: 0, brandCount2024: 0, brandCount2025: 0, itemCount2024: 0,
    itemCount2025: 0, totalUniqueItemCount: 0, topDivision: null,
    pareto: {
        branches: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0, topSales: 0 },
        brands: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0, topSales: 0 },
        items: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0, topSales: 0 },
    },
    paretoContributors: { branches: [], brands: [], items: [] },
    newEntities: {
        branches: { count: 0, sales: 0, percentOfTotal: 0 },
        brands: { count: 0, sales: 0, percentOfTotal: 0 },
        items: { count: 0, sales: 0, percentOfTotal: 0 },
    },
    newBrandsList: [], newItemsList: [],
    // FIX: Replaced type declarations with initial numeric values (0) to resolve "'number' only refers to a type, but is being used as a value here" errors.
    lostEntities: {
        brands: { count: 0, sales2024: 0, percentOfTotal: 0 },
        items: { count: 0, sales2024: 0, percentOfTotal: 0 },
    },
    lostBrandsList: [], lostItemsList: [], filterOptions: filterOptions,
} as any);

const App: React.FC = () => {
    const [loadingState, setLoadingState] = useState({ isLoading: true, progress: 0, message: '' });
    const [error, setError] = useState<string | null>(null);
    const [allData, setAllData] = useState<RawSalesDataRow[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [filters, setFilters] = useState<FilterState>({ divisions: [], departments: [], categories: [], branches: [], brands: [], items: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('isAuthenticated') === 'true');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleStorageChange = () => {
            setIsAuthenticated(localStorage.getItem('isAuthenticated') === 'true');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        const GDRIVE_URL = 'https://corsproxy.io/?https://drive.google.com/uc?export=download&id=1yqGiPMAQ8GMKeNvWWW6QeTvjOQ7Yz3Fg';
        const fetchData = async () => {
            setError(null);
            setLoadingState({ isLoading: true, progress: 10, message: 'Downloading data...' });
            try {
                const response = await fetch(GDRIVE_URL);
                if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                const csvText = await response.text();
                Papa.parse<Record<string, string>>(csvText, {
                    header: true, skipEmptyLines: true, worker: true,
                    complete: (results) => {
                        const fileHeaders = results.meta.fields?.map(h => h.trim().toUpperCase()) || [];
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
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        const finalFilteredRows = allData.filter(row => {
            const { divisions, departments, categories, branches, brands, items } = filters;
            // FIX: Removed unnecessary assignments (branchMatch =, brandMatch =, itemMatch =) within the conditional expression to fix "Cannot find name" errors.
            const dropdownMatch = (divisions.length === 0 || divisions.includes(row['DIVISION'])) &&
                                  (departments.length === 0 || departments.includes(row['DEPARTMENT'])) &&
                                  (categories.length === 0 || categories.includes(row['CATEGORY'])) &&
                                  (branches.length === 0 || branches.includes(row['BRANCH NAME'])) &&
                                  (brands.length === 0 || brands.includes(row['BRAND'])) &&
                                  (items.length === 0 || items.includes(row['ITEM DESCRIPTION']));
            if (!dropdownMatch) return false;
            if (debouncedSearchTerm) {
                return (
                    (row['DIVISION']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRANCH NAME']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRAND']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['ITEM DESCRIPTION']?.toLowerCase().includes(lowercasedTerm))
                );
            }
            return true;
        });
        const noFiltersApplied = Object.values(filters).every((f: string[]) => f.length === 0);
        if (noFiltersApplied && !debouncedSearchTerm) return processedData;
        if (finalFilteredRows.length === 0 && allData.length > 0) return createEmptyProcessedData(processedData.filterOptions);
        return processSalesData(finalFilteredRows, processedData.filterOptions);
    }, [processedData, filters, allData, debouncedSearchTerm]);

    const handleLogin = () => {
        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
        navigate('/', { replace: true });
    };

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        navigate('/login');
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center">
                <div className="w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">{error}</div>
                <button onClick={() => window.location.reload()} className="mt-6 bg-indigo-600 text-white py-4 px-8 rounded-xl">Retry</button>
            </div>
        );
    }
    if (loadingState.isLoading || (!filteredData && isAuthenticated)) {
        return <div className="min-h-screen flex items-center justify-center"><LoadingIndicator progress={loadingState.progress} message={loadingState.message} /></div>;
    }

    return (
        <div className="container mx-auto max-w-[98%] px-4 py-8">
            <Routes>
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route element={<ProtectedRoute isAuthenticated={isAuthenticated}><MainLayout onLogout={handleLogout} /></ProtectedRoute>}>
                    <Route path="/" element={<Dashboard data={filteredData!} filters={filters} onFilterChange={setFilters} searchTerm={searchTerm} onSearchChange={setSearchTerm} />} />
                    <Route path="/compare" element={<ComparisonPage allRawData={allData} processedData={processedData!} />} />
                    <Route path="/division/:divisionName" element={<DivisionDetailView allRawData={allData} />} />
                    <Route path="/division/:divisionName/:departmentName/:categoryName" element={<ItemDetailView allRawData={allData} />} />
                    <Route path="/brand/:brandName" element={<BrandDetailView allRawData={allData} />} />
                    <Route path="/details/:viewType" element={<DrilldownView allRawData={allData} globalFilterOptions={processedData?.filterOptions} />} />
                </Route>
            </Routes>
        </div>
    );
};

export default App;
