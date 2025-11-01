import React, { useState, useRef } from 'react';
import { FilterState, ProcessedData } from '../types';
import useOnClickOutside from '../hooks/useOnClickOutside';

interface FilterControlsProps {
    options: ProcessedData['filterOptions'];
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onReset: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ options, filters, onFilterChange, searchTerm, onSearchChange, onReset }) => {
    const [showFilters, setShowFilters] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(filterRef, () => setShowFilters(false));

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, filterKey: keyof FilterState) => {
        const selectedOptions = Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value);
        onFilterChange({ ...filters, [filterKey]: selectedOptions });
        setShowFilters(false);
    };

    const handleReset = () => {
        onReset();
        setShowFilters(false);
    };
    
    // FIX: Explicitly typed 'val' as string[] to resolve a type inference issue with Object.values.
    const activeFilterCount = Object.values(filters).reduce((acc, val: string[]) => acc + val.length, 0);
    const totalActiveIndicators = activeFilterCount + (searchTerm ? 1 : 0);

    return (
        <div ref={filterRef} className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="relative w-full md:max-w-md">
                    <input
                        type="text"
                        placeholder="Global search (Divisions, Branches, Brands...)"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className="relative px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {showFilters ? 'Hide' : 'Show'} Filters
                        {totalActiveIndicators > 0 && (
                            <span className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white text-xs font-bold border-2 border-slate-800">
                                {totalActiveIndicators}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={handleReset} 
                        className="px-6 py-3 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
                        </svg>
                        Reset
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-700">
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