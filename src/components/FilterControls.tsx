import React, { useMemo, useState, useRef } from 'react';
import { FilterState, ProcessedData } from '../types';
import useOnClickOutside from '../hooks/useOnClickOutside';
import { useDebounce } from '../hooks/useDebounce';

interface FilterBlockProps {
    filterKey: keyof FilterState & keyof ProcessedData['filterOptions'];
    label: string;
    options: string[];
    selectedOptions: string[];
    onSelectionChange: (newSelection: string[]) => void;
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    debouncedSearchTerm: string;
}

const FilterBlock: React.FC<FilterBlockProps> = ({
    filterKey,
    label,
    options,
    selectedOptions,
    onSelectionChange,
    searchTerm,
    onSearchChange,
    debouncedSearchTerm,
}) => {
    const filteredOptions = useMemo(() => {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        if (!lowercasedTerm) {
            return options;
        }
        return options.filter(opt =>
            opt.toLowerCase().includes(lowercasedTerm)
        );
    }, [options, debouncedSearchTerm]);

    const handleCheckboxChange = (option: string) => {
        const newSelection = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onSelectionChange(newSelection);
    };

    return (
        <div>
            <label htmlFor={`${filterKey}Search`} className="block text-sm font-bold text-slate-300 mb-2 ml-1">{label} <span className="text-slate-400 font-normal">({selectedOptions.length} selected)</span></label>
            <input
                id={`${filterKey}Search`}
                type="text"
                placeholder={`Search ${label}...`}
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full bg-slate-900 border border-slate-600 rounded-md py-1 px-3 mb-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label={`Search for a ${label}`}
                autoComplete="off"
            />
            <div 
                id={`${filterKey}Filter`} 
                className="w-full h-40 overflow-y-auto bg-slate-900 border-2 border-slate-600 rounded-lg p-2 space-y-1 filter-list"
                role="listbox"
                aria-multiselectable="true"
            >
                {filteredOptions.map(opt => (
                    <label 
                        key={opt} 
                        className="flex items-center space-x-3 p-1 rounded-md hover:bg-slate-700 cursor-pointer transition-colors duration-150"
                        role="option"
                        aria-selected={selectedOptions.includes(opt)}
                    >
                        <input
                            type="checkbox"
                            value={opt}
                            checked={selectedOptions.includes(opt)}
                            onChange={() => handleCheckboxChange(opt)}
                            className="form-checkbox"
                        />
                        <span className="text-slate-300 text-sm truncate select-none" title={opt}>{opt}</span>
                    </label>
                ))}
                {filteredOptions.length === 0 && (
                    <p className="text-slate-500 text-sm text-center p-2">No matches found.</p>
                )}
            </div>
        </div>
    );
};


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

    const [searchTerms, setSearchTerms] = useState({
        divisions: '',
        departments: '',
        categories: '',
        branches: '',
        brands: '',
    });
    
    const debouncedSearchTerms = useDebounce(searchTerms, 250);

    useOnClickOutside(filterRef, () => setShowFilters(false));

    const handleReset = () => {
        onReset();
        setSearchTerms({
            divisions: '',
            departments: '',
            categories: '',
            branches: '',
            brands: '',
        });
        setShowFilters(false);
    };
    
    const handleLocalSearchChange = (value: string, filterKey: keyof typeof searchTerms) => {
        setSearchTerms(prev => ({ ...prev, [filterKey]: value }));
    };
    
    const handleSelectionChange = (newSelection: string[], filterKey: keyof FilterState) => {
        onFilterChange({ ...filters, [filterKey]: newSelection });
    };

    const activeFilters = useMemo(() => {
        return (Object.keys(filters) as Array<keyof FilterState>)
            .flatMap(key => {
                if (key === 'items') return []; // Don't show individual items as pills
                return filters[key].map(value => ({ type: key, value }));
            });
    }, [filters]);

    const handleRemoveFilter = (type: keyof FilterState, value: string) => {
        const newFilters = {
            ...filters,
            [type]: filters[type].filter(item => item !== value),
        };
        onFilterChange(newFilters);
    };

    const activeFilterCount = (Object.values(filters) as string[][]).reduce((acc, val) => acc + val.length, 0);
    const totalActiveIndicators = activeFilterCount + (searchTerm ? 1 : 0);

    return (
        <div ref={filterRef} className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                 <div className="relative w-full md:w-auto md:flex-grow lg:flex-grow-0 lg:max-w-md">
                    <input
                        type="text"
                        placeholder="Global search (Divisions, Depts, Cats...)"
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

                <div className="flex-grow min-w-[200px]">
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-sky-400 mr-2 shrink-0">Active Filters:</span>
                            {activeFilters.map(({ type, value }) => (
                                <span key={`${type}-${value}`} className="filter-pill" title={`${type}: ${value}`}>
                                    <button
                                        onClick={() => handleRemoveFilter(type, value)}
                                        className="filter-pill-remove"
                                        aria-label={`Remove ${value} from ${type} filter`}
                                    >
                                        &times;
                                    </button>
                                    <span className="filter-pill-type">{type.slice(0, -1)}:</span>
                                    {value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-6 pt-6 border-t border-slate-700">
                    <FilterBlock 
                        filterKey="divisions" 
                        label="Division"
                        options={options.divisions || []}
                        selectedOptions={filters.divisions || []}
                        onSelectionChange={(newSelection) => handleSelectionChange(newSelection, 'divisions')}
                        searchTerm={searchTerms.divisions}
                        onSearchChange={(e) => handleLocalSearchChange(e.target.value, 'divisions')}
                        debouncedSearchTerm={debouncedSearchTerms.divisions}
                    />
                    <FilterBlock 
                        filterKey="departments" 
                        label="Department"
                        options={options.departments || []}
                        selectedOptions={filters.departments || []}
                        onSelectionChange={(newSelection) => handleSelectionChange(newSelection, 'departments')}
                        searchTerm={searchTerms.departments}
                        onSearchChange={(e) => handleLocalSearchChange(e.target.value, 'departments')}
                        debouncedSearchTerm={debouncedSearchTerms.departments}
                    />
                    <FilterBlock 
                        filterKey="categories" 
                        label="Category"
                        options={options.categories || []}
                        selectedOptions={filters.categories || []}
                        onSelectionChange={(newSelection) => handleSelectionChange(newSelection, 'categories')}
                        searchTerm={searchTerms.categories}
                        onSearchChange={(e) => handleLocalSearchChange(e.target.value, 'categories')}
                        debouncedSearchTerm={debouncedSearchTerms.categories}
                    />
                    <FilterBlock 
                        filterKey="branches" 
                        label="Branch"
                        options={options.branches || []}
                        selectedOptions={filters.branches || []}
                        onSelectionChange={(newSelection) => handleSelectionChange(newSelection, 'branches')}
                        searchTerm={searchTerms.branches}
                        onSearchChange={(e) => handleLocalSearchChange(e.target.value, 'branches')}
                        debouncedSearchTerm={debouncedSearchTerms.branches}
                    />
                    <FilterBlock 
                        filterKey="brands" 
                        label="Brand"
                        options={options.brands || []}
                        selectedOptions={filters.brands || []}
                        onSelectionChange={(newSelection) => handleSelectionChange(newSelection, 'brands')}
                        searchTerm={searchTerms.brands}
                        onSearchChange={(e) => handleLocalSearchChange(e.target.value, 'brands')}
                        debouncedSearchTerm={debouncedSearchTerms.brands}
                    />
                </div>
            )}
        </div>
    );
};

export default FilterControls;