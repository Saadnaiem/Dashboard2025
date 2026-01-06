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
            String(opt || '').toLowerCase().includes(lowercasedTerm)
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
            <label htmlFor={`${filterKey}Search`} className="block text-sm font-bold text-slate-300 mb-2 ml-1">{label} <span className="text-slate-400 font-normal">({selectedOptions.length})</span></label>
            <input
                id={`${filterKey}Search`}
                type="text"
                placeholder={`Search ${label}...`}
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full bg-slate-900 border border-slate-600 rounded-md py-1 px-3 mb-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                autoComplete="off"
            />
            <div className="w-full h-40 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-2 space-y-1 filter-list">
                {filteredOptions.map(opt => (
                    <label key={opt} className="flex items-center space-x-3 p-1 rounded-md hover:bg-slate-800 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={selectedOptions.includes(opt)}
                            onChange={() => handleCheckboxChange(opt)}
                            className="form-checkbox"
                        />
                        <span className="text-slate-300 text-[11px] truncate select-none">{opt}</span>
                    </label>
                ))}
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

    const handleLocalSearchChange = (value: string, filterKey: keyof typeof searchTerms) => {
        setSearchTerms(prev => ({ ...prev, [filterKey]: value }));
    };
    
    const handleSelectionChange = (newSelection: string[], filterKey: keyof FilterState) => {
        onFilterChange({ ...filters, [filterKey]: newSelection });
    };

    const activeFilterCount = Object.values(filters).flat().length;

    return (
        <div ref={filterRef} className="p-6 bg-slate-900/50 rounded-2xl shadow-lg border border-slate-800">
            <div className="flex flex-wrap items-center gap-4">
                 <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Search Intelligence Hub..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className="px-6 py-3 bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-700 transition-all flex items-center gap-2"
                    >
                        Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                    <button 
                        onClick={onReset} 
                        className="px-6 py-3 bg-slate-800 text-rose-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8 pt-8 border-t border-slate-800 animate-in fade-in duration-300">
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