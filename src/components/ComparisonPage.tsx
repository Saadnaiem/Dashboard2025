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
    <div className="bg-slate-800/60 p-5 rounded-2xl text-center flex-1 border border-slate-700 shadow-xl">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</h4>
        <div className="text-white">{children}</div>
    </div>
);

const Breadcrumbs: React.FC<{ path: ComparisonEntity[], onNavigate: (index: number) => void }> = ({ path, onNavigate }) => (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <button onClick={() => onNavigate(-1)} className="font-black uppercase tracking-widest text-slate-500 hover:text-sky-400 transition-colors">
            Global
        </button>
        {path.map((item, index) => (
            <React.Fragment key={index}>
                <span className="text-slate-600 font-bold">/</span>
                {index === path.length - 1 ? (
                    <span className="text-sky-400 font-black uppercase tracking-widest" aria-current="page">{item.name}</span>
                ) : (
                    <button onClick={() => onNavigate(index)} className="font-black uppercase tracking-widest text-slate-400 hover:text-sky-300 transition-colors">
                        {item.name}
                    </button>
                )}
            </React.Fragment>
        ))}
    </nav>
);

const ComparisonPage: React.FC<ComparisonPageProps> = ({ allRawData, processedData }) => {
    const { salesMix, setSalesMix } = useOutletContext<LayoutContextType>();
    const [drilldownPath, setDrilldownPath] = useState<ComparisonEntity[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<ComparisonEntity[]>([]);
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const displayData = useMemo(() => {
        return selectedEntities;
    }, [selectedEntities]);

    const summaryStats = useMemo(() => {
        if (displayData.length === 0) return { s24: 0, s25: 0, totalEntities: 0, growth: 0 };
        
        let currentData = allRawData;
        drilldownPath.forEach(entity => {
             const key = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentData = currentData.filter(row => row[key] === entity.name);
        });

        const filterKey = displayData[0].type === 'divisions' ? 'DIVISION' : 
                          displayData[0].type === 'departments' ? 'DEPARTMENT' : 
                          displayData[0].type === 'categories' ? 'CATEGORY' : 
                          displayData[0].type === 'brands' ? 'BRAND' : 
                          displayData[0].type === 'branches' ? 'BRANCH NAME' : 'ITEM DESCRIPTION';
        
        const relevantNames = new Set(displayData.map(e => e.name));
        const relevantData = currentData.filter(row => relevantNames.has(row[filterKey]));

        const totals = relevantData.reduce((acc, row) => {
            acc.s24 += getSalesValue(row, '2024', salesMix);
            acc.s25 += getSalesValue(row, '2025', salesMix);
            return acc;
        }, { s24: 0, s25: 0 });

        const growth = totals.s24 === 0 ? (totals.s25 > 0 ? Infinity : 0) : ((totals.s25 - totals.s24) / totals.s24) * 100;

        return { ...totals, totalEntities: displayData.length, growth };
    }, [displayData, allRawData, drilldownPath, salesMix]);

    const aggregatedItemsData = useMemo(() => {
        if (displayData.length === 0) return [];

        const itemsMap = new Map<string, any>();
        let currentScopeData = allRawData;
        drilldownPath.forEach(pathEntity => {
            const pathKey = pathEntity.type === 'divisions' ? 'DIVISION' : pathEntity.type === 'departments' ? 'DEPARTMENT' : pathEntity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentScopeData = currentScopeData.filter(row => row[pathKey] === pathEntity.name);
        });

        const filterKey = displayData[0].type === 'divisions' ? 'DIVISION' : 
                          displayData[0].type === 'departments' ? 'DEPARTMENT' : 
                          displayData[0].type === 'categories' ? 'CATEGORY' : 
                          displayData[0].type === 'brands' ? 'BRAND' : 
                          displayData[0].type === 'branches' ? 'BRANCH NAME' : 'ITEM DESCRIPTION';

        const relevantNames = new Set(displayData.map(e => e.name));
        const targetData = currentScopeData.filter(row => relevantNames.has(row[filterKey]));

        const grand = targetData.reduce((acc, r) => {
            acc.s25 += r.SALES2025 || 0;
            acc.c25 += r.SALES2025_CASH || 0;
            acc.cr25 += r.SALES2025_CREDIT || 0;
            return acc;
        }, { s25: 0, c25: 0, cr25: 0 });

        targetData.forEach((row: RawSalesDataRow) => {
            const itemCode = row['ITEM CODE'] || 'UNKNOWN';
            const itemName = row['ITEM DESCRIPTION'] || 'NO DESCRIPTION';
            
            if (!itemsMap.has(itemCode)) {
                itemsMap.set(itemCode, {
                    code: itemCode, name: itemName,
                    sales2024: 0, sales2025: 0,
                    cash2024: 0, cash2025: 0,
                    credit2024: 0, credit2025: 0,
                    parentEntity: row[filterKey]
                });
            }
            const item = itemsMap.get(itemCode)!;
            item.sales2024 += row.SALES2024 || 0;
            item.sales2025 += row.SALES2025 || 0;
            item.cash2024 += row.SALES2024_CASH || 0;
            item.cash2025 += row.SALES2025_CASH || 0;
            item.credit2024 += row.SALES2024_CREDIT || 0;
            item.credit2025 += row.SALES2025_CREDIT || 0;
        });

        return Array.from(itemsMap.values()).map(item => ({
            ...item,
            growth: item.sales2024 === 0 ? (item.sales2025 > 0 ? Infinity : 0) : ((item.sales2025 - item.sales2024) / item.sales2024) * 100,
            cashGrowth: item.cash2024 === 0 ? (item.cash2025 > 0 ? Infinity : 0) : ((item.cash2025 - item.cash2024) / item.cash2024) * 100,
            creditGrowth: item.credit2024 === 0 ? (item.credit2025 > 0 ? Infinity : 0) : ((item.credit2025 - item.credit2024) / item.credit2024) * 100,
            contribution2025: grand.s25 > 0 ? (item.sales2025 / grand.s25) * 100 : 0,
            cashContrib2025: grand.c25 > 0 ? (item.cash2025 / grand.c25) * 100 : 0,
            creditContrib2025: grand.cr25 > 0 ? (item.credit2025 / grand.cr25) * 100 : 0,
        }));
    }, [displayData, allRawData, drilldownPath]);

    const handleDrilldown = (entity: ComparisonEntity) => {
        if (entity.type === 'items') return;
        
        const newPath = [...drilldownPath, entity];
        setDrilldownPath(newPath);
        
        const nextType = HIERARCHY[newPath.length];
        if (!nextType) return;

        let currentData = allRawData;
        newPath.forEach(pathEntity => {
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
        
        // Temporarily reset to navigate properly
        const basePath = drilldownPath.slice(0, index);
        setDrilldownPath(basePath);
        
        // Re-trigger drilldown with correct context
        handleDrilldownFromState(lastEntity, basePath);
    };

    const handleDrilldownFromState = (entity: ComparisonEntity, basePath: ComparisonEntity[]) => {
        if (entity.type === 'items') return;
        const newPath = [...basePath, entity];
        setDrilldownPath(newPath);
        const nextType = HIERARCHY[newPath.length];
        if (!nextType) return;
        let currentData = allRawData;
        newPath.forEach(pe => {
            const key = pe.type === 'divisions' ? 'DIVISION' : pe.type === 'departments' ? 'DEPARTMENT' : pe.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentData = currentData.filter(row => row[key] === pe.name);
        });
        const childKey: keyof RawSalesDataRow = nextType === 'departments' ? 'DEPARTMENT' : nextType === 'categories' ? 'CATEGORY' : nextType === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';
        const children = [...new Set(currentData.map(r => r[childKey]).filter(Boolean))].map(name => ({ type: nextType, name }));
        setSelectedEntities(children);
    };

    const handleBack = () => {
        if (drilldownPath.length === 0) {
            setSelectedEntities([]);
            setSelectorOpen(true);
            return;
        }
        const newPath = drilldownPath.slice(0, -1);
        if (newPath.length === 0) {
            setDrilldownPath([]);
            setSelectedEntities([]);
            setSelectorOpen(true);
        } else {
            handleDrilldownFromState(newPath[newPath.length - 1], newPath.slice(0, -1));
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="p-6 bg-slate-800/40 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Comparison Hub</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Multi-entity relational analysis</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-700">
                        {['Total', 'Cash', 'Credit'].map((m) => (
                            <button key={m} onClick={() => setSalesMix(m as any)} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${salesMix === m ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{m}</button>
                        ))}
                    </div>
                    {displayData.length > 0 && (
                        <button onClick={handleBack} className="px-5 py-2.5 bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-xl hover:bg-slate-600 transition-all border border-slate-600">
                            Back
                        </button>
                    )}
                     <button onClick={() => setSelectorOpen(true)} className="px-6 py-2.5 bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-xl hover:bg-sky-500 transition-all border border-sky-400/20">
                        Select Comparison
                    </button>
                </div>
            </div>

            {isSelectorOpen && (
                <ComparisonSelector options={processedData.filterOptions} onClose={() => setSelectorOpen(false)} onSelect={handleInitialSelect} />
            )}

            {drilldownPath.length > 0 && (
                 <div className="px-6 py-3 bg-slate-900/40 rounded-xl border border-slate-800">
                    <Breadcrumbs path={drilldownPath} onNavigate={handleBreadcrumbNavigate} />
                 </div>
            )}
            
            {displayData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SummaryCard title={`Group Total ${salesMix} Sales`}>
                            <p className="text-3xl font-numeric font-black text-sky-400">{formatNumberAbbreviated(summaryStats.s25)}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Prev Year: {formatNumberAbbreviated(summaryStats.s24)}</p>
                        </SummaryCard>
                         <SummaryCard title="Group Performance">
                            <GrowthIndicator value={summaryStats.growth} className="text-3xl" />
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Aggregate YoY Variance</p>
                        </SummaryCard>
                        <SummaryCard title="Entities Compared">
                            <p className="text-3xl font-numeric font-black text-emerald-400">{summaryStats.totalEntities}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Active {displayData[0]?.type}</p>
                        </SummaryCard>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 border-b border-slate-700 pb-2">Individual Entity performance</h3>
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
                    </div>

                    <div className="mt-12">
                        <ComparisonItemsTable itemsData={aggregatedItemsData} />
                    </div>
                </>
            ) : (
                 <div className="text-center py-32 bg-slate-800/10 rounded-3xl border-2 border-dashed border-slate-700/50">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Workspace Empty</h3>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Initialize a comparison by selecting divisions, brands, or departments.</p>
                    <button onClick={() => setSelectorOpen(true)} className="mt-8 px-8 py-3 bg-sky-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-2xl hover:bg-sky-500 transition-all">Start New Comparison</button>
                </div>
            )}
        </div>
    );
};

export default ComparisonPage;