import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedData, RawSalesDataRow, FilterState } from '../types';
import ComparisonSelector from './ComparisonSelector';
import ComparisonColumn from './ComparisonColumn';

export type ComparisonEntityType = 'divisions' | 'departments' | 'categories' | 'brands' | 'branches' | 'items';
export interface ComparisonEntity {
    type: ComparisonEntityType;
    name: string;
}

interface ComparisonPageProps {
    allRawData: RawSalesDataRow[];
    processedData: ProcessedData;
    globalFilters: FilterState;
}

const ComparisonPage: React.FC<ComparisonPageProps> = ({ allRawData, processedData, globalFilters }) => {
    const [parentEntity, setParentEntity] = useState<ComparisonEntity | null>(null);
    const [selectedEntities, setSelectedEntities] = useState<ComparisonEntity[]>([]);
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    useEffect(() => {
        if (!parentEntity || allRawData.length === 0) {
            setSelectedEntities([]);
            return;
        }

        let parentKey: keyof RawSalesDataRow;
        let childKey: keyof RawSalesDataRow;
        let childType: ComparisonEntityType;

        switch (parentEntity.type) {
            case 'divisions':
                parentKey = 'DIVISION';
                childKey = 'DEPARTMENT';
                childType = 'departments';
                break;
            case 'departments':
                parentKey = 'DEPARTMENT';
                childKey = 'CATEGORY';
                childType = 'categories';
                break;
            case 'categories':
                parentKey = 'CATEGORY';
                childKey = 'BRAND';
                childType = 'brands';
                break;
            case 'brands':
                parentKey = 'BRAND';
                childKey = 'ITEM DESCRIPTION';
                childType = 'items';
                break;
            default:
                setSelectedEntities([]);
                return;
        }

        const parentData = allRawData.filter(row => row[parentKey] === parentEntity.name);
        const childSales = new Map<string, number>();
        parentData.forEach(row => {
            const childName = row[childKey];
            if (childName) {
                const currentSales = childSales.get(childName) || 0;
                childSales.set(childName, currentSales + row.SALES2025);
            }
        });

        const sortedChildren = Array.from(childSales.entries())
            .sort(([, salesA], [, salesB]) => salesB - salesA)
            .map(([name]) => name);

        const newEntities: ComparisonEntity[] = sortedChildren.map(name => ({
            type: childType,
            name,
        }));
        
        setSelectedEntities(newEntities);

    }, [parentEntity, allRawData]);
    
    const handleSelectParent = (entity: ComparisonEntity) => {
        setParentEntity(entity);
        setSelectorOpen(false);
    };

    const handleClear = () => {
        setParentEntity(null);
    };

    const comparisonData = useMemo(() => {
        return selectedEntities.map(entity => {
            const { type, name } = entity;
            let key: keyof RawSalesDataRow;
            switch (type) {
                case 'divisions': key = 'DIVISION'; break;
                case 'departments': key = 'DEPARTMENT'; break;
                case 'categories': key = 'CATEGORY'; break;
                case 'brands': key = 'BRAND'; break;
                case 'branches': key = 'BRANCH NAME'; break;
                case 'items': key = 'ITEM DESCRIPTION'; break;
                default: key = 'DIVISION'; // Fallback
            }

            const filtered = allRawData.filter(row => {
                if (row[key] !== name) return false;
                
                const { divisions, departments, categories, branches, brands, items } = globalFilters;
                const divisionMatch = divisions.length === 0 || divisions.includes(row['DIVISION']);
                const departmentMatch = departments.length === 0 || departments.includes(row['DEPARTMENT']);
                const categoryMatch = categories.length === 0 || categories.includes(row['CATEGORY']);
                const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
                const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
                const itemMatch = items.length === 0 || items.includes(row['ITEM DESCRIPTION']);
                
                return divisionMatch && departmentMatch && categoryMatch && branchMatch && brandMatch && itemMatch;
            });
            return { entity, data: filtered };
        });
    }, [selectedEntities, allRawData, globalFilters]);

    const getChildTypeLabel = () => {
        if (!parentEntity) return '';
        switch (parentEntity.type) {
            case 'divisions': return 'Departments';
            case 'departments': return 'Categories';
            case 'categories': return 'Brands';
            case 'brands': return 'Items';
            default: return 'Components';
        }
    };


    return (
        <div className="flex flex-col gap-8">
            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-white">Comparison Hub</h1>
                    <p className="text-slate-400">Select a parent entity to automatically compare its components.</p>
                </div>
                <div className="flex items-center gap-4">
                    {parentEntity && (
                        <button
                            onClick={handleClear}
                            className="px-6 py-3 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Clear
                        </button>
                    )}
                    <button
                        onClick={() => setSelectorOpen(true)}
                        className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                        Select Parent
                    </button>
                </div>
            </div>

            {isSelectorOpen && (
                <ComparisonSelector
                    options={processedData.filterOptions}
                    onClose={() => setSelectorOpen(false)}
                    onSelect={handleSelectParent}
                />
            )}

            {parentEntity ? (
                selectedEntities.length > 0 ? (
                    <>
                        <div className="text-center">
                            <h2 className="text-xl text-white font-bold">
                                Comparing all {selectedEntities.length} {getChildTypeLabel()} for <span className="text-sky-400">{parentEntity.name}</span>
                            </h2>
                            <p className="text-sm text-slate-400">Sorted by 2025 Sales</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {comparisonData.map(({ entity, data }) => (
                                <ComparisonColumn
                                    key={`${entity.type}-${entity.name}`}
                                    entity={entity}
                                    data={data}
                                    allRawData={allRawData}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700">
                        <h3 className="mt-2 text-lg font-medium text-white">No components found for "{parentEntity.name}".</h3>
                        <p className="mt-1 text-sm text-slate-400">This entity may be empty or filtered out by global filters.</p>
                    </div>
                )
            ) : (
                 <div className="text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No parent entity selected</h3>
                    <p className="mt-1 text-sm text-slate-400">Click "Select Parent" to get started.</p>
                </div>
            )}
        </div>
    );
};

export default ComparisonPage;