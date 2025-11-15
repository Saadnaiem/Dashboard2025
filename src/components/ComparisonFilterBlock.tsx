import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface ComparisonFilterBlockProps {
    label: string;
    options: string[];
    selectedOptions: string[];
    onSelectionChange: (newSelection: string[]) => void;
}

const ComparisonFilterBlock: React.FC<ComparisonFilterBlockProps> = ({
    label,
    options,
    selectedOptions,
    onSelectionChange,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    const filteredOptions = useMemo(() => {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        if (!lowercasedTerm) return options;
        return options.filter(opt => opt.toLowerCase().includes(lowercasedTerm));
    }, [options, debouncedSearchTerm]);

    const handleCheckboxChange = (option: string) => {
        const newSelection = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onSelectionChange(newSelection);
    };

    return (
        <div className="flex flex-col bg-slate-700/30 p-3 rounded-lg">
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">
                {label} <span className="text-slate-400 font-normal">({selectedOptions.length} selected)</span>
            </label>
            <input
                type="text"
                placeholder={`Search ${label}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-md py-1 px-3 mb-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label={`Search for a ${label}`}
                autoComplete="off"
            />
            <div 
                className="w-full h-48 overflow-y-auto bg-slate-900 border-2 border-slate-600 rounded-lg p-2 space-y-1 comparison-selector-list"
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

export default ComparisonFilterBlock;
