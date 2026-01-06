import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ProcessedData, FilterState, EntitySalesData, LayoutContextType } from '../types';
import FilterControls from './FilterControls';
import SummaryCards from './SummaryCards';
import Charts from './Charts';
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

        // When viewing Cash, set Credit totals to 0 to reflect the view, and vice versa
        const totalCash2024 = salesMix === 'Cash' ? data.totalCash2024 : 0;
        const totalCash2025 = salesMix === 'Cash' ? data.totalCash2025 : 0;
        const totalCredit2024 = salesMix === 'Credit' ? data.totalCredit2024 : 0;
        const totalCredit2025 = salesMix === 'Credit' ? data.totalCredit2025 : 0;

        const top10Brands = salesByBrand.slice(0, 10);
        const top50Items = salesByItem.slice(0, 50);
        const topDivision = salesByDivision[0] || null;

        const calcPareto = (list: EntitySalesData[]) => calculatePareto(list.map(i => ({ name: i.name, sales: i.sales2025 }))).result;
        
        const calcNew = (list: EntitySalesData[]) => {
            const newEnts = list.filter(i => i.sales2024 === 0 && i.sales2025 > 0);
            const sales = newEnts.reduce((sum, i) => sum + i.sales2025, 0);
            return {
                count: newEnts.length,
                sales,
                percentOfTotal: totalSales2025 > 0 ? (sales / totalSales2025) * 100 : 0
            };
        };
        const calcLost = (list: EntitySalesData[]) => {
            const lostEnts = list.filter(i => i.sales2024 > 0 && i.sales2025 === 0);
            const sales = lostEnts.reduce((sum, i) => sum + i.sales2024, 0);
            return {
                count: lostEnts.length,
                sales2024: sales,
                percentOfTotal: totalSales2024 > 0 ? (sales / totalSales2024) * 100 : 0
            };
        };

        return {
            ...data,
            totalSales2024,
            totalSales2025,
            totalCash2024,
            totalCash2025,
            totalCredit2024,
            totalCredit2025,
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
            },
            newEntities: {
                branches: calcNew(salesByBranch),
                brands: calcNew(salesByBrand),
                items: calcNew(salesByItem)
            },
            lostEntities: {
                brands: calcLost(salesByBrand),
                items: calcLost(salesByItem)
            },
            newBrandsList: salesByBrand.filter(i => i.sales2024 === 0 && i.sales2025 > 0),
            newItemsList: salesByItem.filter(i => i.sales2024 === 0 && i.sales2025 > 0),
            lostBrandsList: salesByBrand.filter(i => i.sales2024 > 0 && i.sales2025 === 0),
            lostItemsList: salesByItem.filter(i => i.sales2024 > 0 && i.sales2025 === 0),
        };
    }, [data, salesMix]);

    return (
        <div className="flex flex-col gap-6">
            <FilterControls
                options={data.filterOptions}
                filters={filters}
                onFilterChange={onFilterChange}
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                onReset={handleReset}
            />
            
            <div className="flex flex-col gap-6">
                <SummaryCards data={transformedData} searchTerm={searchTerm} filters={filters} />
                <Charts data={transformedData} filters={filters} onFilterChange={onFilterChange} />
            </div>

            <div className="mt-8 flex justify-center">
                <button 
                    onClick={handleReset} 
                    className="px-6 py-3 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 transition-all flex items-center gap-2"
                    aria-label="Reset all filters"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
                    </svg>
                    Reset All Filters
                </button>
            </div>
        </div>
    );
};

export default Dashboard;