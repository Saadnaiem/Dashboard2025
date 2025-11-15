import React, { useState, useMemo } from 'react';
import { ProcessedData, RawSalesDataRow } from '../types';
import ComparisonSelector from './ComparisonSelector';
import ComparisonColumn from './ComparisonColumn';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

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
                Divisions
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
    const [drilldownPath, setDrilldownPath] = useState<ComparisonEntity[]>([]);
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const currentLevel = drilldownPath.length;
    const childType = HIERARCHY[currentLevel];

    const comparisonData = useMemo(() => {
        if (!childType || allRawData.length === 0) {
            return [];
        }

        let currentData = allRawData;
        
        // Filter data based on the drilldown path
        drilldownPath.forEach(entity => {
            const key = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentData = currentData.filter(row => row[key] === entity.name);
        });

        const childKey: keyof RawSalesDataRow = childType === 'divisions' ? 'DIVISION' : childType === 'departments' ? 'DEPARTMENT' : childType === 'categories' ? 'CATEGORY' : childType === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';

        const childSales = new Map<string, number>();
        currentData.forEach(row => {
            const childName = row[childKey];
            if (childName) {
                const currentSales = childSales.get(childName) || 0;
                childSales.set(childName, currentSales + row.SALES2025);
            }
        });

        const sortedChildren = Array.from(childSales.entries())
            .sort(([, salesA], [, salesB]) => salesB - salesA)
            .map(([name]) => ({ type: childType, name }));

        return sortedChildren;

    }, [drilldownPath, allRawData, childType]);
    
    const summaryStats = useMemo(() => {
        if (comparisonData.length === 0) return { totalSales: 0, totalEntities: 0, growth: 0 };
        
        let currentData = allRawData;
        drilldownPath.forEach(entity => {
             const key = entity.type === 'divisions' ? 'DIVISION' : entity.type === 'departments' ? 'DEPARTMENT' : entity.type === 'categories' ? 'CATEGORY' : 'BRAND';
            currentData = currentData.filter(row => row[key] === entity.name);
        });

        const childKey: keyof RawSalesDataRow = childType === 'divisions' ? 'DIVISION' : childType === 'departments' ? 'DEPARTMENT' : childType === 'categories' ? 'CATEGORY' : childType === 'brands' ? 'BRAND' : 'ITEM DESCRIPTION';
        
        const relevantData = currentData.filter(row => comparisonData.some(e => e.name === row[childKey]));

        const { s24, s25 } = relevantData.reduce((acc, row) => {
            acc.s24 += row.SALES2024;
            acc.s25 += row.SALES2025;
            return acc;
        }, { s24: 0, s25: 0 });

        const growth = s24 === 0 ? (s25 > 0 ? Infinity : 0) : ((s25 - s24) / s24) * 100;

        return { totalSales: s25, totalEntities: comparisonData.length, growth };
    }, [comparisonData, allRawData, drilldownPath, childType]);


    const handleDrilldown = (entity: ComparisonEntity) => {
        if (entity.type === 'items') return; // Cannot drill down further than items
        setDrilldownPath(prev => [...prev, entity]);
    };

    const handleBreadcrumbNavigate = (index: number) => {
        setDrilldownPath(prev => prev.slice(0, index + 1));
    };
    
    const handleInitialSelect = (entity: ComparisonEntity) => {
        // This is called from the selector modal. It should always start a new drilldown.
        setDrilldownPath([entity]);
        setSelectorOpen(false);
    };

    const handleBack = () => {
        setDrilldownPath(prev => prev.slice(0, prev.length - 1));
    };

    const getChildTypeLabel = () => {
        if (!childType) return 'Items';
        return childType.charAt(0).toUpperCase() + childType.slice(1);
    };


    return (
        <div className="flex flex-col gap-8">
            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-white">Comparison Hub</h1>
                    <p className="text-slate-400">Drill down through your business hierarchy.</p>
                </div>
                <div className="flex items-center gap-2">
                    {drilldownPath.length > 0 && (
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
                        Start New Analysis
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
            
            {comparisonData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard title="Total Sales (2025)">
                            <p className="text-3xl font-bold">{formatNumberAbbreviated(summaryStats.totalSales)}</p>
                        </SummaryCard>
                         <SummaryCard title="YoY Growth">
                            <GrowthIndicator value={summaryStats.growth} className="text-3xl" />
                        </SummaryCard>
                        <SummaryCard title={`Comparing ${getChildTypeLabel()}`}>
                            <p className="text-3xl font-bold">{summaryStats.totalEntities}</p>
                        </SummaryCard>
                    </div>

                    <div className="flex flex-col gap-3">
                        {comparisonData.map((entity) => (
                            <ComparisonColumn
                                key={`${entity.type}-${entity.name}`}
                                entity={entity}
                                allRawData={allRawData}
                                onDrilldown={handleDrilldown}
                                drilldownPath={drilldownPath}
                            />
                        ))}
                    </div>
                </>
            ) : (
                 <div className="text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-white">
                        {drilldownPath.length > 0 ? "End of the line!" : "No analysis selected"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                        {drilldownPath.length > 0 ? "This entity has no further components to analyze." : "Click 'Start New Analysis' to begin."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ComparisonPage;