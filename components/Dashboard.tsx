import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ProcessedData, FilterState, EntitySalesData, LayoutContextType } from '../types';
import FilterControls from './FilterControls';
import SummaryCards from './SummaryCards';
import Charts from './Charts';
import AiSalesAdvisor from './AiSalesAdvisor';
import { calculatePareto } from '../services/dataProcessor';

interface DashboardProps {
    data: ProcessedData;
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, filters, onFilterChange, searchTerm, onSearchChange }) => {
    const { salesMix } = useOutletContext<LayoutContextType>();

    const handleReset = () => {
        onFilterChange({ divisions: [], departments: [], categories: [], branches: [], brands: [], items: [] });
        onSearchChange('');
    };

    const transformedData = useMemo(() => {
        if (salesMix === 'Total') return data;

        const mapEntity = (e: EntitySalesData): EntitySalesData => {
            const s24 = salesMix === 'Cash' ? e.cash2024 : e.credit2024;
            const s25 = salesMix === 'Cash' ? e.cash2025 : e.credit2025;
            return {
                ...e,
                sales2024: s24,
                sales2025: s25,
                growth: s24 === 0 ? (s25 > 0 ? Infinity : 0) : ((s25 - s24) / s24) * 100
            };
        };

        const salesByDivision = data.salesByDivision.map(mapEntity).sort((a,b) => b.sales2025 - a.sales2025);
        const salesByBrand = data.salesByBrand.map(mapEntity).sort((a,b) => b.sales2025 - a.sales2025);
        const salesByBranch = data.salesByBranch.map(mapEntity).sort((a,b) => b.sales2025 - a.sales2025);
        const salesByItem = data.salesByItem.map(mapEntity).sort((a,b) => b.sales2025 - a.sales2025);

        const totalSales2024 = salesMix === 'Cash' ? data.totalCash2024 : data.totalCredit2024;
        const totalSales2025 = salesMix === 'Cash' ? data.totalCash2025 : data.totalCredit2025;
        const salesGrowthPercentage = salesMix === 'Cash' ? data.cashGrowthPercentage : data.creditGrowthPercentage;

        const top10Brands = salesByBrand.slice(0, 10);
        const top50Items = salesByItem.slice(0, 50);
        const topDivision = salesByDivision[0] || null;

        const calcPareto = (list: EntitySalesData[]) => calculatePareto(list.map(i => ({ name: i.name, sales: i.sales2025 }))).result;
        
        return {
            ...data,
            totalSales2024,
            totalSales2025,
            salesGrowthPercentage,
            salesByDivision,
            salesByBrand,
            salesByBranch,
            salesByItem,
            top10Brands,
            top50Items,
            topDivision,
            pareto: {
                branches: calcPareto(salesByBranch),
                brands: calcPareto(salesByBrand),
                items: calcPareto(salesByItem)
            }
        };
    }, [data, salesMix]);

    return (
        <div className="flex flex-col gap-8">
            <FilterControls
                options={data.filterOptions}
                filters={filters}
                onFilterChange={onFilterChange}
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                onReset={handleReset}
            />

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3">
                    <SummaryCards data={transformedData} searchTerm={searchTerm} filters={filters} />
                </div>
                <div className="xl:col-span-1">
                    <AiSalesAdvisor data={transformedData} mix={salesMix} />
                </div>
            </div>
            
            <div className="animate-in fade-in duration-1000">
                <Charts data={transformedData} filters={filters} onFilterChange={onFilterChange} />
            </div>

            <div className="mt-12 flex justify-center">
                <button 
                    onClick={handleReset} 
                    className="px-12 py-5 bg-slate-900 text-slate-500 font-black uppercase tracking-[0.4em] rounded-[1.5rem] border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 transition-all text-[10px] shadow-2xl"
                >
                    Recalibrate All Intelligence Filters
                </button>
            </div>
        </div>
    );
};

export default Dashboard;