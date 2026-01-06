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
        return options.filter(opt => String(opt || '').toLowerCase().includes(lowercasedTerm));
    }, [options, debouncedSearchTerm]);

    const handleCheckboxChange = (option: string) => {
        const newSelection = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onSelectionChange(newSelection);
    };

    return (
        <div className="flex flex-col bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                {label} ({selectedOptions.length})
            </label>
            <input
                type="text"
                placeholder={`Filter...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 mb-4 text-white text-xs placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                autoComplete="off"
            />
            <div className="w-full h-48 overflow-y-auto space-y-1 filter-list pr-2">
                {filteredOptions.map(opt => (
                    <label key={opt} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={selectedOptions.includes(opt)}
                            onChange={() => handleCheckboxChange(opt)}
                            className="form-checkbox"
                        />
                        <span className="text-slate-300 text-[10px] font-black uppercase tracking-tight truncate">{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default ComparisonFilterBlock;