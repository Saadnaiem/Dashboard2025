import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ProcessedData, RawSalesDataRow, LayoutContextType } from '../types';
import ComparisonSelector from './ComparisonSelector';
import ComparisonColumn from './ComparisonColumn';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import ComparisonItemsTable from './ComparisonItemsTable';
import { getSalesValue } from '../services/dataProcessor';

export type ComparisonEntityType = 'divisions' | 'departments' | 'categories' | 'brands' | 'branches' | 'items';
export interface ComparisonEntity {
    type: ComparisonEntityType;
    name: string;
}

interface ComparisonPageProps {
    allRawData: RawSalesDataRow[];
    processedData: ProcessedData;
}

const HIERARCHY: ComparisonEntityType[] = ['divisions', 'departments', 'categories', 'brands', 'items'];

const SummaryCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-700/50 p-4 rounded-lg text-center flex-1">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h4>
        <div className="text-white">{children}</div>
    </div>
);

const Breadcrumbs: React.FC<{ path: ComparisonEntity[], onNavigate: (index: number) => void }> = ({ path, onNavigate }) => (
    <nav aria-label="Breadcrumb" className="breadcrumb">
        <div className="breadcrumb-item">
            <button onClick={() => onNavigate(-1)} className="breadcrumb-link">
                Home
            </button>
        </div>
        {path.map((item, index) => (
            <React.Fragment key={index}>
                <span className="breadcrumb-separator">/</span>
                <div className="breadcrumb-item">
                    {index === path.length - 1 ? (
                        <span className="breadcrumb-current" aria-current="page">{item.name}</span>
                    ) : (
                        <button onClick={() => onNavigate(index)} className="breadcrumb-link">
                            {item.name}
                        </button>
                    )}
                </div>
            </React.Fragment>
        ))}
    </nav>
);

const ComparisonPage: React.FC<ComparisonPageProps> = ({ allRawData, processedData }) => {
    const { salesMix } = useOutletContext<LayoutContextType>();
    const [drilldownPath, setDrilldownPath] = useState<ComparisonEntity[]>([]);
    // Support multiple selected entities at the current level
    const [selectedEntities, setSelectedEntities] = useState<ComparisonEntity[]>([]);
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const displayData = useMemo(() => {
        // If we haven't selected anything yet, show empty
        if (selectedEntities.length === 0 && drilldownPath.length === 0) return [];
        
        // If we have selectedEntities, show them
        if (selectedEntities.length > 0) return selectedEntities;

        return [];
    }, [selectedEntities, drilldownPath]);

    const summaryStats = useMemo(() => {
        if (displayData.length === 0) return { totalSales: 0, totalEntities: 0, growth: 0 };
        
        let currentData = allRawData;
        drilldownPath.forEach(entity => {
             const key = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentData = currentData.filter(row => row[key] === entity.name);
        });

        const filterKey = displayData[0].type === 'divisions' ? 'DIVISION' : displayData[0].type === 'departments' ? 'DEPARTMENT' : displayData[0].type === 'categories' ? 'CATEGORY' : displayData[0].type === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';
        
        const relevantNames = new Set(displayData.map(e => e.name));
        const relevantData = currentData.filter(row => relevantNames.has(row[filterKey]));

        const { s24, s25 } = relevantData.reduce((acc, row) => {
            acc.s24 += getSalesValue(row, '2024', salesMix);
            acc.s25 += getSalesValue(row, '2025', salesMix);
            return acc;
        }, { s24: 0, s25: 0 });

        const growth = s24 === 0 ? (s25 > 0 ? Infinity : 0) : ((s25 - s24) / s24) * 100;

        return { totalSales: s25, totalEntities: displayData.length, growth };
    }, [displayData, allRawData, drilldownPath, salesMix]);

    const comparisonDataForTable = useMemo(() => {
        return displayData.map(entity => {
            let currentData = allRawData;
            drilldownPath.forEach(pathEntity => {
                const pathKey = pathEntity.type === 'divisions' ? 'DIVISION' : pathEntity.type === 'departments' ? 'DEPARTMENT' : pathEntity.type === 'categories' ? 'CATEGORY' : 'BRAND';
                currentData = currentData.filter(row => row[pathKey] === pathEntity.name);
            });
            const key = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : entity.type === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';
            const entityData = currentData.filter(row => row[key] === entity.name);
            return { entity, data: entityData };
        });
    }, [displayData, allRawData, drilldownPath]);

    const aggregatedItemsData = useMemo(() => {
        if (displayData.length === 0) return [];

        const itemsMap = new Map<string, {
            code: string;
            name: string;
            sales2024: number;
            sales2025: number;
            cash2024: number;
            credit2024: number;
            cash2025: number;
            credit2025: number;
            parentEntities: Set<string>;
        }>();

        comparisonDataForTable.forEach(({ entity, data }) => {
            const parentEntityLabel = `${entity.type.slice(0, 4)}: ${entity.name}`;
            data.forEach((row: RawSalesDataRow) => {
                const itemCode = row['ITEM CODE'];
                const itemName = row['ITEM DESCRIPTION'];
                if (!itemCode || !itemName) return;

                const s24 = getSalesValue(row, '2024', salesMix);
                const s25 = getSalesValue(row, '2025', salesMix);

                if (!itemsMap.has(itemCode)) {
                    itemsMap.set(itemCode, {
                        code: itemCode,
                        name: itemName,
                        sales2024: 0,
                        sales2025: 0,
                        cash2024: 0,
                        credit2024: 0,
                        cash2025: 0,
                        credit2025: 0,
                        parentEntities: new Set(),
                    });
                }
                const item = itemsMap.get(itemCode)!;
                item.sales2024 += s24;
                item.sales2025 += s25;
                item.cash2024 += row.SALES2024_CASH || 0;
                item.credit2024 += row.SALES2024_CREDIT || 0;
                item.cash2025 += row.SALES2025_CASH || 0;
                item.credit2025 += row.SALES2025_CREDIT || 0;
                item.parentEntities.add(parentEntityLabel);
            });
        });

        return Array.from(itemsMap.values()).map(item => ({
            ...item,
            parentEntity: Array.from(item.parentEntities).join(' | '),
        }));

    }, [comparisonDataForTable, displayData, salesMix]);


    const handleDrilldown = (entity: ComparisonEntity) => {
        if (entity.type === 'items') return;
        setDrilldownPath(prev => [...prev, entity]);
        // After drilldown, we need to show the CHILDREN of this new entity
        const nextType = HIERARCHY[drilldownPath.length + 1];
        if (!nextType) return;

        let currentData = allRawData;
        const fullPath = [...drilldownPath, entity];
        fullPath.forEach(pathEntity => {
            const key = pathEntity.type === 'divisions' ? 'DIVISION' : pathEntity.type === 'departments' ? 'DEPARTMENT' : pathEntity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentData = currentData.filter(row => row[key] === pathEntity.name);
        });

        const childKey: keyof RawSalesDataRow = nextType === 'departments' ? 'DEPARTMENT' : nextType === 'categories' ? 'CATEGORY' : nextType === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';
        const children = [...new Set(currentData.map(r => r[childKey]).filter(Boolean))].map(name => ({ type: nextType, name }));
        setSelectedEntities(children);
    };

    const handleInitialSelect = (entities: ComparisonEntity[]) => {
        setDrilldownPath([]);
        setSelectedEntities(entities);
        setSelectorOpen(false);
    };

    const handleBreadcrumbNavigate = (index: number) => {
        if (index === -1) {
            setDrilldownPath([]);
            setSelectedEntities([]);
            setSelectorOpen(true);
            return;
        }
        const newPath = drilldownPath.slice(0, index + 1);
        const lastEntity = newPath[newPath.length - 1];
        setDrilldownPath(newPath.slice(0, -1));
        handleDrilldown(lastEntity);
    };

    const handleBack = () => {
        if (drilldownPath.length === 0) {
            setSelectedEntities([]);
            return;
        }
        const newPath = drilldownPath.slice(0, -1);
        setDrilldownPath(newPath);
        // If we went back, we might want to reset to the previous siblings or something? 
        // For simplicity, just clearing for now or re-triggering selector
        if (newPath.length === 0) {
            setSelectedEntities([]);
            setSelectorOpen(true);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-white">Comparison Hub</h1>
                    <p className="text-slate-400">Select and compare multiple items across categories.</p>
                </div>
                <div className="flex items-center gap-2">
                    {displayData.length > 0 && (
                        <button
                            onClick={handleBack}
                            className="px-4 py-3 bg-slate-600 text-white font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Back
                        </button>
                    )}
                     <button
                        onClick={() => setSelectorOpen(true)}
                        className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                        Select Comparison
                    </button>
                </div>
            </div>

            {isSelectorOpen && (
                <ComparisonSelector
                    options={processedData.filterOptions}
                    onClose={() => setSelectorOpen(false)}
                    onSelect={handleInitialSelect}
                />
            )}

            {drilldownPath.length > 0 && (
                 <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <Breadcrumbs path={drilldownPath} onNavigate={handleBreadcrumbNavigate} />
                 </div>
            )}
            
            {displayData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard title={`Group Total ${salesMix} Sales`}>
                            <p className="text-3xl font-bold">{formatNumberAbbreviated(summaryStats.totalSales)}</p>
                        </SummaryCard>
                         <SummaryCard title="Avg YoY Growth">
                            <GrowthIndicator value={summaryStats.growth} className="text-3xl" />
                        </SummaryCard>
                        <SummaryCard title={`Items in Comparison`}>
                            <p className="text-3xl font-bold">{summaryStats.totalEntities}</p>
                        </SummaryCard>
                    </div>

                    <div className="flex flex-col gap-3">
                        {displayData.map((entity) => (
                            <ComparisonColumn
                                key={`${entity.type}-${entity.name}`}
                                entity={entity}
                                allRawData={allRawData}
                                onDrilldown={handleDrilldown}
                                drilldownPath={drilldownPath}
                            />
                        ))}
                    </div>

                    <div className="mt-8">
                        <ComparisonItemsTable
                            itemsData={aggregatedItemsData}
                            comparisonData={comparisonDataForTable}
                        />
                    </div>
                </>
            ) : (
                 <div className="text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No items selected for comparison</h3>
                    <p className="mt-1 text-sm text-slate-400">Click "Select Comparison" to choose divisions, brands, or departments.</p>
                </div>
            )}
        </div>
    );
};

export default ComparisonPage;