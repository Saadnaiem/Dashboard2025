
import React, { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { ComparisonEntity, ComparisonEntityType } from './ComparisonPage';
import { useDebounce } from '../hooks/useDebounce';

interface ComparisonSelectorProps {
    options: ProcessedData['filterOptions'];
    onClose: () => void;
    onSelect: (entities: ComparisonEntity[]) => void;
}

const entityTypes: { key: ComparisonEntityType; label: string }[] = [
    { key: 'divisions', label: 'Division' },
    { key: 'departments', label: 'Department' },
    { key: 'categories', label: 'Category' },
    { key: 'brands', label: 'Brand' },
];

const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({ options, onClose, onSelect }) => {
    const [selectedType, setSelectedType] = useState<ComparisonEntityType>('divisions');
    const [searchTerm, setSearchTerm] = useState('');
    // Store as "type:name" to allow unique selection across tabs
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    const currentOptions = useMemo(() => {
        const opts = options[selectedType] || [];
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        if (!lowercasedTerm) return opts;
        return opts.filter(opt => opt.toLowerCase().includes(lowercasedTerm));
    }, [options, selectedType, debouncedSearchTerm]);

    const toggleItem = (name: string) => {
        const key = `${selectedType}:${name}`;
        const newSet = new Set(selectedItems);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedItems(newSet);
    };

    const handleApply = () => {
        // FIX: Explicitly type 'key' as string to resolve 'unknown' type inference issue in environment.
        const entities = Array.from(selectedItems).map((key: string) => {
            const [type, ...nameParts] = key.split(':');
            return {
                type: type as ComparisonEntityType,
                name: nameParts.join(':')
            };
        });
        onSelect(entities);
    };

    const getCountForType = (type: ComparisonEntityType) => {
        // FIX: Explicitly type 'key' as string to resolve 'unknown' type inference issue in environment.
        return Array.from(selectedItems).filter((key: string) => key.startsWith(`${type}:`)).length;
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
                className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-2xl m-4 transform transition-all flex flex-col h-[75vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 text-center relative">
                    <h3 className="text-xl font-bold text-white" id="modal-title">
                        Compare Multiple Entities
                    </h3>
                    <p className="text-sm text-slate-400">Select one or more items from any category to compare.</p>
                    <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-4 p-1 bg-slate-700/50 rounded-lg">
                        {entityTypes.map(({ key, label }) => {
                            const count = getCountForType(key);
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedType(key)}
                                    className={`px-4 py-2 rounded-md font-bold text-xs sm:text-sm flex-1 transition-colors ${selectedType === key ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:bg-slate-600/50'}`}
                                >
                                    {label} {count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <input
                        type="text"
                        placeholder={`Search in ${entityTypes.find(e => e.key === selectedType)?.label}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        autoFocus
                    />
                </div>

                <div className="flex-1 px-4 pb-4 overflow-y-auto">
                    <div className="w-full h-full overflow-y-auto bg-slate-900 border-2 border-slate-600 rounded-lg p-2 space-y-1 filter-list">
                        {currentOptions.map(option => (
                            <label
                                key={option}
                                className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer transition-colors duration-150"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedItems.has(`${selectedType}:${option}`)}
                                    onChange={() => toggleItem(option)}
                                    className="form-checkbox"
                                />
                                <span className="text-slate-300 text-sm truncate select-none">{option}</span>
                            </label>
                        ))}
                        {currentOptions.length === 0 && (
                            <p className="text-slate-500 text-sm text-center p-4">No matches found.</p>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center rounded-b-2xl">
                    <span className="text-sm font-semibold text-sky-400">
                        {selectedItems.size} total items selected
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSelectedItems(new Set())}
                            className="px-4 py-2 text-rose-400 hover:text-rose-300 text-sm font-bold transition-colors"
                        >
                            Clear All
                        </button>
                        <button 
                            onClick={handleApply}
                            disabled={selectedItems.size === 0}
                            className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Apply Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSelector;
