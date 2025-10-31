import React from 'react';
import { ProcessedData, FilterState } from '../types';
import Header from './Header';
import FilterControls from './FilterControls';
import SummaryCards from './SummaryCards';
import Charts from './Charts';

interface DashboardProps {
    data: ProcessedData;
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, filters, onFilterChange }) => {
    return (
        <div className="flex flex-col gap-6">
            <Header />
            <FilterControls
                options={data.filterOptions}
                filters={filters}
                onFilterChange={onFilterChange}
            />
            <SummaryCards data={data} />
            <Charts data={data} onFilterChange={onFilterChange} />
        </div>
    );
};

export default Dashboard;
