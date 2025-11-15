import React, { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { ComparisonEntity, ComparisonEntityType } from './ComparisonPage';
import { useDebounce } from '../hooks/useDebounce';

interface ComparisonSelectorProps {
    options: ProcessedData['filterOptions'];
    onClose: () => void;
    onSelect: (entity: ComparisonEntity) => void;
}

const entityTypes: { key: ComparisonEntityType; label: string }[] = [
    { key: 'divisions', label: 'Division' },
    { key: 'departments', label: 'Department' },
    { key: 'categories', label: 'Category' },
];

const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({ options, onClose, onSelect }) => {
    const [selectedType, setSelectedType] = useState<ComparisonEntityType>('divisions');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    const currentOptions = useMemo(() => {
        const opts = options[selectedType] || [];
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        if (!lowercasedTerm) return opts;
        return opts.filter(opt => opt.toLowerCase().includes(lowercasedTerm));
    }, [options, selectedType, debouncedSearchTerm]);

    const handleSelect = (name: string) => {
        onSelect({ type: selectedType, name });
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-2xl m-4 transform transition-all flex flex-col h-[70vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 text-center relative">
                    <h3 className="text-xl font-bold text-white" id="modal-title">
                        Select an Entity to Analyze
                    </h3>
                    <p className="text-sm text-slate-400">A comparison of its components will be generated automatically.</p>
                    <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4">
                    <div className="flex items-center justify-center gap-2 mb-4 p-1 bg-slate-700/50 rounded-lg">
                        {entityTypes.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setSelectedType(key)}
                                className={`px-4 py-2 rounded-md font-bold text-sm w-full transition-colors ${selectedType === key ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:bg-slate-600/50'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder={`Search for a ${entityTypes.find(e => e.key === selectedType)?.label}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        autoFocus
                    />
                </div>

                <div className="flex-1 px-4 pb-4 overflow-y-auto">
                    <div className="w-full h-full overflow-y-auto bg-slate-900 border-2 border-slate-600 rounded-lg p-2 space-y-1 comparison-selector-list">
                        {currentOptions.map(option => (
                            <button
                                key={option}
                                onClick={() => handleSelect(option)}
                                className="w-full text-left flex items-center p-2 rounded-md hover:bg-slate-700 cursor-pointer transition-colors duration-150"
                            >
                                <span className="text-slate-300 text-sm truncate">{option}</span>
                            </button>
                        ))}
                        {currentOptions.length === 0 && (
                            <p className="text-slate-500 text-sm text-center p-4">No matches found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSelector;
