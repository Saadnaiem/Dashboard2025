import React, { useState, useMemo } from 'react';
import { ProcessedData, RawSalesDataRow, FilterState } from '../types';
import ComparisonSelector from './ComparisonSelector';
import ComparisonColumn from './ComparisonColumn';
import ComparisonItemsTable from './ComparisonItemsTable';

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
    const [selectedEntities, setSelectedEntities] = useState<ComparisonEntity[]>([]);
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const handleAddEntities = (newEntities: ComparisonEntity[]) => {
        setSelectedEntities(prev => {
            const combined = [...prev, ...newEntities];
            // Remove duplicates
            const unique = combined.filter((entity, index, self) =>
                index === self.findIndex((e) => (
                    e.type === entity.type && e.name === entity.name
                ))
            );
            return unique.slice(0, 4);
        });
        setSelectorOpen(false);
    };

    const handleRemoveEntity = (index: number) => {
        setSelectedEntities(selectedEntities.filter((_, i) => i !== index));
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
            }

            const filtered = allRawData.filter(row => {
                // Match the specific entity for this column
                if (row[key] !== name) return false;
                
                // Apply global filters
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

    const allItemsForTable = useMemo(() => {
        const itemMap = new Map<string, any>();

        comparisonData.forEach(({ entity, data }) => {
            data.forEach(row => {
                const itemCode = row['ITEM CODE'];
                const itemName = row['ITEM DESCRIPTION'];
                if (!itemCode) return;

                if (!itemMap.has(itemCode)) {
                    itemMap.set(itemCode, {
                        code: itemCode,
                        name: itemName,
                        sales2024: 0,
                        sales2025: 0,
                        parents: new Set<string>()
                    });
                }
                const existing = itemMap.get(itemCode)!;
                existing.sales2024 += row.SALES2024;
                existing.sales2025 += row.SALES2025;
                existing.parents.add(`${entity.type.slice(0, 4)}: ${entity.name}`);
            });
        });
        return Array.from(itemMap.values()).map(item => ({...item, parentEntity: Array.from(item.parents).join(' | ')}));
    }, [comparisonData]);

    return (
        <div className="flex flex-col gap-8">
            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-white">Comparison Hub</h1>
                    <p className="text-slate-400">Select up to 4 entities to compare side-by-side.</p>
                </div>
                <button
                    onClick={() => setSelectorOpen(true)}
                    disabled={selectedEntities.length >= 4}
                    className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Entity to Compare
                </button>
            </div>

            {isSelectorOpen && (
                <ComparisonSelector
                    options={processedData.filterOptions}
                    onClose={() => setSelectorOpen(false)}
                    onAdd={handleAddEntities}
                    existingCount={selectedEntities.length}
                />
            )}

            {selectedEntities.length > 0 ? (
                <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start`}>
                    {comparisonData.map(({ entity, data }, index) => (
                        <ComparisonColumn
                            key={`${entity.type}-${entity.name}`}
                            entity={entity}
                            data={data}
                            onRemove={() => handleRemoveEntity(index)}
                            allRawData={allRawData}
                        />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No entities selected</h3>
                    <p className="mt-1 text-sm text-slate-400">Click "Add Entity to Compare" to get started.</p>
                </div>
            )}
            
            {allItemsForTable.length > 0 && (
                <ComparisonItemsTable
                    itemsData={allItemsForTable}
                    comparisonData={comparisonData}
                />
            )}
        </div>
    );
};

export default ComparisonPage;