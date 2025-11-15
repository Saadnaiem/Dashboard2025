import React, { useState, useMemo } from 'react';
import { ProcessedData } from '../types';
import { ComparisonEntity, ComparisonEntityType } from './ComparisonPage';
import ComparisonFilterBlock from './ComparisonFilterBlock';

interface ComparisonSelectorProps {
    options: ProcessedData['filterOptions'];
    onClose: () => void;
    onAdd: (entities: ComparisonEntity[]) => void;
    existingCount: number;
}

const entityTypes: { key: ComparisonEntityType; label: string }[] = [
    { key: 'divisions', label: 'Division' },
    { key: 'departments', label: 'Department' },
    { key: 'categories', label: 'Category' },
    { key: 'brands', label: 'Brand' },
    { key: 'branches', label: 'Branch' },
];

const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({ options, onClose, onAdd, existingCount }) => {
    const [selections, setSelections] = useState<Partial<Record<ComparisonEntityType, string[]>>>({});

    const totalSelected = useMemo(() => {
        // FIX: Explicitly typed 'curr' to 'string[] | undefined' to resolve TypeScript's inference of 'unknown' from Object.values(), allowing safe access to the 'length' property.
        return Object.values(selections).reduce((acc, curr) => acc + (curr?.length || 0), 0);
    }, [selections]);

    const canAddCount = 4 - existingCount;
    const canAdd = totalSelected > 0 && totalSelected <= canAddCount;

    const handleSelectionChange = (type: ComparisonEntityType, newSelected: string[]) => {
        setSelections(prev => ({ ...prev, [type]: newSelected }));
    };

    const handleAddClick = () => {
        if (!canAdd) return;
        
        const newEntities: ComparisonEntity[] = [];
        (Object.keys(selections) as ComparisonEntityType[]).forEach(type => {
            selections[type]?.forEach(name => {
                newEntities.push({ type, name });
            });
        });
        onAdd(newEntities);
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
                className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-7xl m-4 transform transition-all flex flex-col h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 text-center relative">
                    <h3 className="text-xl font-bold text-white" id="modal-title">
                        Select Entities to Compare
                    </h3>
                    <p className="text-sm text-slate-400">You can add up to {canAddCount} more entities.</p>
                     <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="comparison-selector-grid">
                        {entityTypes.map(({ key, label }) => (
                            <ComparisonFilterBlock
                                key={key}
                                label={label}
                                options={options[key] || []}
                                selectedOptions={selections[key] || []}
                                onSelectionChange={(newSelection) => handleSelectionChange(key, newSelection)}
                            />
                        ))}
                    </div>
                </div>
                <div className="bg-slate-700/50 px-6 py-4 flex flex-col sm:flex-row justify-end items-center gap-4 rounded-b-2xl">
                    <div className="text-sm font-semibold text-slate-300">
                        {totalSelected} / {canAddCount} selected
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-800 text-base font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAddClick}
                        disabled={!canAdd}
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add {totalSelected} Entities
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSelector;