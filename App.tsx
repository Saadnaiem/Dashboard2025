import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Papa from 'papaparse';
import { RawSalesDataRow, ProcessedData, FilterState } from './types';
import { processSalesData, normalizeRow } from './services/dataProcessor';
import { fetchSalesFromSupabase } from './services/supabaseService';
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

const NEW_GDRIVE_ID = '1ra1vcQbJiufmfXK0Yvl8qocQLlhjKMAk';
const GDRIVE_URL = `https://corsproxy.io/?https://drive.google.com/uc?export=download&id=${NEW_GDRIVE_ID}`;

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
    const syncOpId = useRef(0);

    const fetchData = async (opId: number) => {
        setError(null);
        setLoadingState({ isLoading: true, progress: 10, message: 'Syncing Intelligence Hub...' });
        
        try {
            const dbData = await fetchSalesFromSupabase();
            if (opId !== syncOpId.current) return;
            if (dbData && dbData.length > 0) {
                setAllData(dbData);
                return;
            }
        } catch (e) {
            console.warn("[App] Primary Link Offline, using Archive...");
        }

        try {
            const response = await fetch(GDRIVE_URL);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            const csvText = await response.text();
            
            Papa.parse<Record<string, string>>(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (opId !== syncOpId.current) return;
                    const fileHeaders = results.meta.fields?.map(h => h.trim().toUpperCase()) || [];
                    setAllData(results.data.map(row => normalizeRow(row, fileHeaders)));
                },
                error: (err: any) => {
                    setError(`Sync Failure: ${err.message}`);
                    setLoadingState({ isLoading: false, progress: 0, message: '' });
                }
            });
        } catch (err: any) {
            if (opId !== syncOpId.current) return;
            setError(`Intelligence Pipeline Severed: ${err.message}`);
            setLoadingState({ isLoading: false, progress: 0, message: '' });
        }
    };

    useEffect(() => {
        if (isAuthenticated && allData.length === 0) {
            syncOpId.current++;
            fetchData(syncOpId.current);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (allData.length > 0) {
            try {
                const data = processSalesData(allData);
                setProcessedData(data);
                setLoadingState({ isLoading: true, progress: 100, message: 'Ready' });
                setTimeout(() => setLoadingState({ isLoading: false, progress: 0, message: '' }), 500);
            } catch (err: any) {
                setError(`Processing Logic Error: ${err.message}`);
                setLoadingState({ isLoading: false, progress: 0, message: '' });
            }
        }
    }, [allData]);

    const filteredData = useMemo(() => {
        if (!processedData) return null;
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        const finalFilteredRows = allData.filter(row => {
            const { divisions, departments, categories, branches, brands } = filters;
            const match = (divisions.length === 0 || divisions.includes(row['DIVISION'])) &&
                          (departments.length === 0 || departments.includes(row['DEPARTMENT'])) &&
                          (categories.length === 0 || categories.includes(row['CATEGORY'])) &&
                          (branches.length === 0 || branches.includes(row['BRANCH NAME'])) &&
                          (brands.length === 0 || brands.includes(row['BRAND']));
            if (!match) return false;
            if (debouncedSearchTerm) {
                return ['DIVISION', 'BRANCH NAME', 'BRAND', 'ITEM DESCRIPTION'].some(k => 
                    String(row[k] || '').toLowerCase().includes(lowercasedTerm)
                );
            }
            return true;
        });
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
        setAllData([]);
        setProcessedData(null);
        navigate('/login');
    };

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
                <div className="max-w-md w-full p-10 bg-slate-900 rounded-[2.5rem] border border-rose-500/20 text-center shadow-2xl">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Pipeline Interrupted</h2>
                    <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">{error}</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-slate-800 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-slate-700 transition-all">Reconnect</button>
                </div>
            </div>
        );
    }

    if (loadingState.isLoading || !processedData) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <LoadingIndicator progress={loadingState.progress} message={loadingState.message} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Routes>
                <Route element={<ProtectedRoute isAuthenticated={isAuthenticated}><MainLayout onLogout={handleLogout} /></ProtectedRoute>}>
                    <Route path="/" element={<Dashboard data={filteredData!} filters={filters} onFilterChange={setFilters} searchTerm={searchTerm} onSearchChange={setSearchTerm} />} />
                    <Route path="/compare" element={<ComparisonPage allRawData={allData} processedData={processedData!} />} />
                    <Route path="/division/:divisionName" element={<DivisionDetailView allRawData={allData} />} />
                    <Route path="/brand/:brandName" element={<BrandDetailView allRawData={allData} />} />
                    <Route path="/details/:viewType" element={<DrilldownView allRawData={allData} globalFilterOptions={processedData?.filterOptions} />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
};

export default App;