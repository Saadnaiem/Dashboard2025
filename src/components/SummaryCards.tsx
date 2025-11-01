
import React from 'react';
import { ProcessedData } from '../types';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

const SummaryCard: React.FC<{ title: string; icon: string; children: React.ReactNode; onClick?: () => void; }> = ({ title, icon, children, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex flex-col h-full bg-slate-800/50 rounded-2xl shadow-xl p-6 border border-slate-700 hover:border-sky-500 hover:shadow-sky-500/10 hover:-translate-y-1 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{icon}</span>
            <div className="text-base font-bold text-slate-300 uppercase tracking-wider">{title}</div>
        </div>
        <div className="flex-1 flex flex-col justify-center text-left text-base font-medium text-slate-300">
            {children}
        </div>
    </div>
);

const MetricCard: React.FC<{ title: string; icon: string; value2025: number; value2024: number; onClick?: () => void; }> = ({ title, icon, value2025, value2024, onClick }) => (
    <SummaryCard title={title} icon={icon} onClick={onClick}>
        <div className="text-3xl font-extrabold text-green-400">{formatNumber(value2025, 0)}</div>
        <div className="text-base font-bold text-slate-400">2024: {formatNumber(value2024, 0)}</div>
        <GrowthIndicator value={value2025 - value2024} unit="" className="text-xl" />
    </SummaryCard>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-lg font-semibold text-slate-400 tracking-wider mb-4 border-b-2 border-slate-700 pb-2">{children}</h3>
);


interface SummaryCardsProps {
    data: ProcessedData;
    onViewChange: (view: string, title: string) => void;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, onViewChange }) => {
    return (
        <div className="flex flex-col gap-8">
            <section>
                <SectionTitle>Key Metrics</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <SummaryCard title="Total Sales (2025)" icon="💰">
                        <div className="text-3xl font-extrabold text-green-400">{formatNumberAbbreviated(data.totalSales2025)}</div>
                        <div className="text-base font-bold text-slate-400 mb-1">2024: {formatNumberAbbreviated(data.totalSales2024)}</div>
                        <GrowthIndicator value={data.salesGrowthPercentage} className="text-xl" />
                    </SummaryCard>
                    
                    <SummaryCard title="Top Division" icon="🏆">
                         {data.topDivision ? (
                            <>
                                <div className="text-xl font-bold text-sky-400 truncate" title={data.topDivision.name}>{data.topDivision.name}</div>
                                <div className="text-sm text-slate-400">2025 Sales: {formatNumberAbbreviated(data.topDivision.sales2025)}</div>
                                <GrowthIndicator value={data.topDivision.growth} className="text-xl" />
                            </>
                         ) : <div className="text-xl font-bold text-slate-400">-</div>}
                    </SummaryCard>
                    
                    <MetricCard title="Branches" icon="🏬" value2025={data.branchCount2025} value2024={data.branchCount2024} onClick={() => onViewChange('branches', 'Branches Deep Dive')} />
                    <MetricCard title="Brands" icon="🏷️" value2025={data.brandCount2025} value2024={data.brandCount2024} onClick={() => onViewChange('brands', 'Brands Deep Dive')} />
                    <MetricCard title="Items" icon="📦" value2025={data.itemCount2025} value2024={data.itemCount2024} onClick={() => onViewChange('items', 'Items Deep Dive')} />
                </div>
            </section>

            <section>
                <SectionTitle>Pareto Analysis (80/20 Rule)</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard title="Branches" icon="📊">
                         <p>Top <b>{data.pareto.branches.topCount}</b> (20%) of <b>{data.pareto.branches.totalContributors}</b> branches generate <b>{data.pareto.branches.salesPercent.toFixed(1)}%</b> of 2025 sales.</p>
                    </SummaryCard>
                    <SummaryCard title="Brands" icon="📊">
                         <p>Top <b>{data.pareto.brands.topCount}</b> (20%) of <b>{data.pareto.brands.totalContributors}</b> brands generate <b>{data.pareto.brands.salesPercent.toFixed(1)}%</b> of 2025 sales.</p>
                    </SummaryCard>
                    <SummaryCard title="Items" icon="📊">
                         <p>Top <b>{data.pareto.items.topCount}</b> (20%) of <b>{data.pareto.items.totalContributors}</b> items generate <b>{data.pareto.items.salesPercent.toFixed(1)}%</b> of sales.</p>
                    </SummaryCard>
                </div>
            </section>

            <section>
                <SectionTitle>Brand & Item Lifecycle</SectionTitle>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard title="New Brands (2025)" icon="✨">
                        <div className="text-3xl font-extrabold text-green-400">{formatNumber(data.newEntities.brands.count)}</div>
                        <div className="text-sm">Sales: {formatNumberAbbreviated(data.newEntities.brands.sales)}</div>
                        <div className="text-sm">{data.newEntities.brands.percentOfTotal.toFixed(2)}% of Total Sales</div>
                    </SummaryCard>
                    
                    <SummaryCard title="Lost Brands (2024)" icon="👋">
                         <div className="text-3xl font-extrabold text-rose-400">{formatNumber(data.lostEntities.brands.count)}</div>
                        <div className="text-base font-bold text-slate-400">2024 Sales: {formatNumberAbbreviated(data.lostEntities.brands.sales2024)}</div>
                        <div className="text-sm">{data.lostEntities.brands.percentOfTotal.toFixed(2)}% of 2024 Sales</div>
                    </SummaryCard>

                    <SummaryCard title="New Items (2025)" icon="💡">
                         <div className="text-3xl font-extrabold text-green-400">{formatNumber(data.newEntities.items.count)}</div>
                        <div className="text-sm">Sales: {formatNumberAbbreviated(data.newEntities.items.sales)}</div>
                        <div className="text-sm">{data.newEntities.items.percentOfTotal.toFixed(2)}% of Total Sales</div>
                    </SummaryCard>
                    
                    <SummaryCard title="Lost Items (2024)" icon="📉">
                         <div className="text-3xl font-extrabold text-rose-400">{formatNumber(data.lostEntities.items.count)}</div>
                        <div className="text-base font-bold text-slate-400">2024 Sales: {formatNumberAbbreviated(data.lostEntities.items.sales2024)}</div>
                        <div className="text-sm">{data.lostEntities.items.percentOfTotal.toFixed(2)}% of 2024 Sales</div>
                    </SummaryCard>
                 </div>
            </section>
        </div>
    );
};

export default SummaryCards;
