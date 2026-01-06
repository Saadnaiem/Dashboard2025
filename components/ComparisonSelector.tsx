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
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    const currentOptions = useMemo(() => {
        const opts = options[selectedType] || [];
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        if (!lowercasedTerm) return opts;
        return opts.filter(opt => String(opt || '').toLowerCase().includes(lowercasedTerm));
    }, [options, selectedType, debouncedSearchTerm]);

    const toggleItem = (name: string) => {
        const key = `${selectedType}:${name}`;
        const newSet = new Set(selectedItems);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setSelectedItems(newSet);
    };

    const handleApply = () => {
        const entities = Array.from(selectedItems).map((key: string) => {
            const [type, ...nameParts] = key.split(':');
            return {
                type: type as ComparisonEntityType,
                name: nameParts.join(':')
            };
        });
        onSelect(entities);
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 w-full max-w-2xl h-[80vh] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-800 text-center">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Comparison Lab</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Multi-Entity Selection Node</p>
                </div>

                <div className="p-6">
                    <div className="flex bg-slate-950 p-1 rounded-xl mb-6">
                        {entityTypes.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setSelectedType(key)}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedType === key ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder={`Search within ${selectedType}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <div className="grid grid-cols-1 gap-2">
                        {currentOptions.map(option => (
                            <label key={option} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${selectedItems.has(`${selectedType}:${option}`) ? 'bg-sky-500/10 border-sky-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedItems.has(`${selectedType}:${option}`)}
                                    onChange={() => toggleItem(option)}
                                    className="form-checkbox"
                                />
                                <span className="text-xs font-black text-slate-300 uppercase tracking-tight">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedItems.size} Selected</span>
                    <button 
                        onClick={handleApply}
                        className="px-8 py-4 bg-sky-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-lg hover:bg-sky-500 transition-all disabled:opacity-20"
                        disabled={selectedItems.size === 0}
                    >
                        Apply Analysis
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSelector;