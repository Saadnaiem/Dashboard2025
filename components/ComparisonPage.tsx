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

const Breadcrumbs: React.FC<{ path: ComparisonEntity[], onNavigate: (index: number) => void }> = ({ path, onNavigate }) => (
    <nav aria-label="Breadcrumb" className="flex items-center gap-3">
        <div className="breadcrumb-item">
            <button onClick={() => onNavigate(-1)} className="breadcrumb-link font-black uppercase tracking-widest text-[10px]">
                Lab Home
            </button>
        </div>
        {path.map((item, index) => (
            <React.Fragment key={index}>
                <span className="text-slate-600 text-xs">/</span>
                <div className="breadcrumb-item">
                    {index === path.length - 1 ? (
                        <span className="text-sky-400 font-black uppercase tracking-widest text-[10px]" aria-current="page">{item.name}</span>
                    ) : (
                        <button onClick={() => onNavigate(index)} className="breadcrumb-link font-black uppercase tracking-widest text-[10px]">
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
    const [selectedEntities, setSelectedEntities] = useState<ComparisonEntity[]>([]);
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const displayData = useMemo(() => {
        if (selectedEntities.length === 0 && drilldownPath.length === 0) return [];
        return selectedEntities;
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

        const totals = relevantData.reduce((acc, row) => {
            acc.s24 += getSalesValue(row, '2024', salesMix);
            acc.s25 += getSalesValue(row, '2025', salesMix);
            return acc;
        }, { s24: 0, s25: 0 });

        const growth = totals.s24 === 0 ? (totals.s25 > 0 ? Infinity : 0) : ((totals.s25 - totals.s24) / totals.s24) * 100;

        return { totalSales: totals.s25, totalEntities: displayData.length, growth };
    }, [displayData, allRawData, drilldownPath, salesMix]);

    const itemsDataForTable = useMemo(() => {
        if (displayData.length === 0) return [];

        const itemsMap = new Map<string, any>();

        displayData.forEach(entity => {
            let currentData = allRawData;
            drilldownPath.forEach(pathEntity => {
                const pathKey = pathEntity.type === 'divisions' ? 'DIVISION' : pathEntity.type === 'departments' ? 'DEPARTMENT' : pathEntity.type === 'categories' ? 'CATEGORY' : 'BRAND';
                currentData = currentData.filter(row => row[pathKey] === pathEntity.name);
            });
            const key = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : entity.type === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';
            const entityData = currentData.filter(row => row[key] === entity.name);

            entityData.forEach((row: RawSalesDataRow) => {
                const itemCode = row['ITEM CODE'] || 'NC';
                const itemName = row['ITEM DESCRIPTION'] || 'Unnamed';
                if (!itemName) return;

                const s24 = getSalesValue(row, '2024', salesMix);
                const s25 = getSalesValue(row, '2025', salesMix);

                if (!itemsMap.has(itemCode)) {
                    itemsMap.set(itemCode, {
                        code: itemCode,
                        name: itemName,
                        sales2024: 0,
                        sales2025: 0,
                        parentEntity: entity.name,
                    });
                }
                const item = itemsMap.get(itemCode)!;
                item.sales2024 += s24;
                item.sales2025 += s25;
                item.growth = item.sales2024 === 0 ? (item.sales2025 > 0 ? Infinity : 0) : ((item.sales2025 - item.sales2024) / item.sales2024) * 100;
            });
        });

        return Array.from(itemsMap.values());
    }, [displayData, allRawData, drilldownPath, salesMix]);

    const handleDrilldown = (entity: ComparisonEntity) => {
        if (entity.type === 'items') return;
        setDrilldownPath(prev => [...prev, entity]);
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

    return (
        <div className="flex flex-col gap-8">
            <div className="p-8 glass rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Comparison Lab</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Cross-Entity Behavioral Analysis</p>
                </div>
                <div className="flex items-center gap-4">
                    {displayData.length > 0 && (
                        <button
                            onClick={() => { setDrilldownPath([]); setSelectedEntities([]); setSelectorOpen(true); }}
                            className="px-6 py-3 bg-slate-900 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl border border-slate-800 hover:text-white transition-all"
                        >
                            Reset Scope
                        </button>
                    )}
                     <button
                        onClick={() => setSelectorOpen(true)}
                        className="px-8 py-4 bg-sky-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-sky-500 transition-all flex items-center gap-3 text-[10px]"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Configure Experiment
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
                 <div className="p-4 bg-slate-900/40 rounded-[1.5rem] border border-slate-800/50">
                    <Breadcrumbs path={drilldownPath} onNavigate={handleBreadcrumbNavigate} />
                 </div>
            )}
            
            {displayData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-8 rounded-[2rem] text-center border-emerald-500/10">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Group Revenue (2025)</h4>
                            <p className="text-4xl font-numeric font-black text-emerald-400">{formatNumberAbbreviated(summaryStats.totalSales)}</p>
                        </div>
                        <div className="glass p-8 rounded-[2rem] text-center border-sky-500/10">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Aggregated Growth</h4>
                            <GrowthIndicator value={summaryStats.growth} className="text-4xl" />
                        </div>
                        <div className="glass p-8 rounded-[2rem] text-center border-slate-500/10">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Entity Count</h4>
                            <p className="text-4xl font-numeric font-black text-white">{summaryStats.totalEntities}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
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

                    <div className="mt-8 animate-in fade-in duration-1000">
                        <ComparisonItemsTable
                            itemsData={itemsDataForTable}
                        />
                    </div>
                </>
            ) : (
                 <div className="text-center py-32 glass rounded-[3rem] border-2 border-dashed border-slate-800">
                    <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="h-10 w-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Laboratory Scope Empty</h3>
                    <p className="mt-2 text-xs text-slate-500 font-bold uppercase tracking-widest">Select target entities to initialize comparison analysis</p>
                </div>
            )}
        </div>
    );
};

export default ComparisonPage;