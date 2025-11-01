import React from 'react';
import { ProcessedData, FilterState } from '../types';
import Header from './Header';
import FilterControls from './FilterControls';
import SummaryCards from './SummaryCards';
import Charts from './Charts';

interface DashboardProps {
    data: ProcessedData;
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, filters, onFilterChange }) => {
    const resetFilters = () => {
        onFilterChange({ divisions: [], branches: [], brands: [], items: [] });
    };

    return (
        <div className="flex flex-col gap-6">
            <Header />
            <FilterControls
                options={data.filterOptions}
                filters={filters}
                onFilterChange={onFilterChange}
            />
            <SummaryCards data={data} />
            <Charts data={data} filters={filters} onFilterChange={onFilterChange} />

            <div className="mt-8 flex justify-center">
                <button 
                    onClick={resetFilters} 
                    className="px-6 py-3 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                    aria-label="Reset all filters"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
                    </svg>
                    Reset Filters
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
