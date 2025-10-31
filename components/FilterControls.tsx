
import React, { useState } from 'react';
import { FilterState, ProcessedData } from '../types';

interface FilterControlsProps {
    options: ProcessedData['filterOptions'];
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ options, filters, onFilterChange }) => {
    const [showFilters, setShowFilters] = useState(false);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, filterKey: keyof FilterState) => {
        // FIX: Explicitly typed 'opt' as HTMLOptionElement to resolve a type inference issue where it was treated as 'unknown'.
        const selectedOptions = Array.from(e.target.selectedOptions).map((opt: HTMLOptionElement) => opt.value);
        onFilterChange({ ...filters, [filterKey]: selectedOptions });
    };

    const resetFilters = () => {
        onFilterChange({ divisions: [], branches: [], brands: [], items: [] });
    };

    return (
        <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
            <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                    onClick={() => setShowFilters(!showFilters)} 
                    className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button 
                    onClick={resetFilters} 
                    className="px-6 py-3 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
                    </svg>
                    Reset Filters
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div>
                        <label htmlFor="divisionFilter" className="block text-sm font-bold text-slate-300 mb-2 ml-1">Division</label>
                        <select id="divisionFilter" className="w-full" multiple size={5} value={filters.divisions} onChange={(e) => handleSelectChange(e, 'divisions')}>
                            {options.divisions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="branchFilter" className="block text-sm font-bold text-slate-300 mb-2 ml-1">Branch</label>
                        <select id="branchFilter" className="w-full" multiple size={5} value={filters.branches} onChange={(e) => handleSelectChange(e, 'branches')}>
                            {options.branches.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="brandFilter" className="block text-sm font-bold text-slate-300 mb-2 ml-1">Brand</label>
                        <select id="brandFilter" className="w-full" multiple size={5} value={filters.brands} onChange={(e) => handleSelectChange(e, 'brands')}>
                            {options.brands.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterControls;