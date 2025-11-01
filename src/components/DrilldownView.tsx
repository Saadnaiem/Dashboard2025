
import React, { useState, useMemo } from 'react';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
    key: string;
    direction: SortDirection;
}

interface DrilldownData {
    name: string;
    sales2024: number;
    sales2025: number;
    growth: number;
}

interface DrilldownViewProps {
    title: string;
    data: DrilldownData[];
    totalSales2025: number;
    onBack: () => void;
}

const DrilldownView: React.FC<DrilldownViewProps> = ({ title, data, totalSales2025, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sales2025', direction: 'descending' });

    const processedData = useMemo(() => {
        let sortedData = [...data];

        // Search filtering
        if (searchTerm) {
            sortedData = sortedData.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sorting
        if (sortConfig.key) {
            sortedData.sort((a, b) => {
                const aValue = (a as any)[sortConfig.key];
                const bValue = (b as any)[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        // Add contribution percentage
        return sortedData.map(item => ({
            ...item,
            contribution: totalSales2025 > 0 ? (item.sales2025 / totalSales2025) * 100 : 0
        }));
    }, [data, searchTerm, sortConfig, totalSales2025]);

    const requestSort = (key: string) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortClassName = (name: string) => {
        if (!sortConfig || sortConfig.key !== name) {
            return '';
        }
        return sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';
    };

    const headers = [
        { key: 'name', label: 'Name', className: 'w-1/3' },
        { key: 'sales2025', label: '2025 Sales', className: 'text-right' },
        { key: 'sales2024', label: '2024 Sales', className: 'text-right' },
        { key: 'growth', label: 'Growth %', className: 'text-right' },
        { key: 'contribution', label: 'Contribution %', className: 'text-right' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-md bg-slate-700 hover:bg-sky-600 transition-colors" aria-label="Back to dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-extrabold text-white">{title}</h1>
                </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Detailed Breakdown</h2>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-300 table-sortable">
                        <thead className="bg-slate-700/50 text-xs text-slate-200 uppercase tracking-wider">
                            <tr>
                                {headers.map(header => (
                                    <th key={header.key} scope="col" className={`p-4 ${header.className}`} onClick={() => requestSort(header.key)}>
                                        <span className={getSortClassName(header.key)}>{header.label}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((item) => (
                                <tr key={item.name} className="border-b border-slate-700 hover:bg-slate-800/60 transition-colors">
                                    <td className="p-4 font-medium text-white truncate max-w-sm" title={item.name}>{item.name}</td>
                                    <td className="p-4 text-right font-semibold text-green-300">{formatNumberAbbreviated(item.sales2025)}</td>
                                    <td className="p-4 text-right">{formatNumberAbbreviated(item.sales2024)}</td>
                                    <td className="p-4 text-right"><GrowthIndicator value={item.growth} /></td>
                                    <td className="p-4 text-right">{item.contribution.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {processedData.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        No results found for your search.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrilldownView;
