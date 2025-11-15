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
    { key: 'brands', label: 'Brand' },
    { key: 'branches', label: 'Branch' },
    { key: 'items', label: 'Item' },
];

const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({ options, onClose, onSelect }) => {
    const [selectedType, setSelectedType] = useState<ComparisonEntityType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 200);

    const availableOptions = useMemo(() => {
        if (!selectedType) return [];
        // The filterOptions in processedData does not include items, so handle it separately.
        if (selectedType === 'items') {
             // This would require passing allRawData and processing it here, which is expensive.
             // For now, let's assume item comparison is not a primary use-case for the selector.
             // A better implementation would be to pre-process a unique list of items.
             // For this implementation, we will disable item selection to avoid performance issues.
            return [];
        }
        const data = options[selectedType] || [];
        if (!debouncedSearchTerm) return data;
        return data.filter(opt => opt.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    }, [selectedType, options, debouncedSearchTerm]);

    const handleSelectType = (type: ComparisonEntityType) => {
        setSelectedType(type);
        setSearchTerm('');
    };
    
    const handleSelectItem = (name: string) => {
        if (selectedType) {
            onSelect({ type: selectedType, name });
        }
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
                className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-4xl m-4 transform transition-all flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white text-center" id="modal-title">
                        Select an Entity to Compare
                    </h3>
                </div>
                <div className="flex-1 flex flex-col md:flex-row min-h-[60vh]">
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700 p-4">
                        <h4 className="font-bold text-slate-300 mb-2">1. Choose Entity Type</h4>
                        <div className="flex flex-col gap-2">
                            {entityTypes.map(({ key, label }) => (
                                <button
                                    key={key}
                                    disabled={key === 'items'} // Disabling item selection for performance reasons
                                    onClick={() => handleSelectType(key)}
                                    className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition-colors ${
                                        selectedType === key ? 'bg-sky-600 text-white' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                                    } ${key === 'items' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 p-4 flex flex-col">
                        <h4 className="font-bold text-slate-300 mb-2">2. Select an Item</h4>
                        {selectedType ? (
                            <>
                                <input
                                    type="text"
                                    placeholder={`Search for a ${selectedType.slice(0, -1)}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 px-3 mb-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    autoFocus
                                />
                                <div className="flex-1 overflow-y-auto comparison-selector-list pr-2">
                                    {availableOptions.length > 0 ? (
                                        availableOptions.map(option => (
                                            <button
                                                key={option}
                                                onClick={() => handleSelectItem(option)}
                                                className="w-full text-left px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 transition-colors truncate"
                                                title={option}
                                            >
                                                {option}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-center py-4">No options found.</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                                <p>Please select an entity type first.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-slate-700/50 px-6 py-4 flex justify-end rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-800 text-base font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSelector;
