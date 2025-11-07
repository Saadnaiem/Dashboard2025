
import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RawSalesDataRow } from '../types';
import Header from './Header';
import { formatNumber, formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

const calculateGrowth = (current: number, previous: number) => 
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

const ChartCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 hover:border-sky-500 hover:shadow-sky-500/10 hover:-translate-y-1 transition-all duration-300 ${className}`}>
        <h2 className="text-xl font-bold text-white mb-4 text-center">{title}</h2>
        {children}
    </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-lg shadow-lg text-sm">
                <p className="font-bold text-green-300 mb-2">{label || data.name}</p>
                {data.sales2025 !== undefined && <p style={{ color: '#34d399' }}>2025 Sales: {formatNumberAbbreviated(data.sales2025)}</p>}
                {data.sales2024 !== undefined && <p style={{ color: '#38bdf8' }}>2024 Sales: {formatNumberAbbreviated(data.sales2024)}</p>}
                {data.contribution2025 !== undefined && <p className="text-slate-300">Contrib %: {data.contribution2025.toFixed(2)}%</p>}
            </div>
        );
    }
    return null;
};

interface DivisionDetailViewProps {
    allRawData: RawSalesDataRow[];
}

type TableData = {
    department: string;
    category: string;
    sales2024: number;
    sales2025: number;
    contribution2024: number;
    contribution2025: number;
    growth: number;
};

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ allRawData }) => {
    const { divisionName } = useParams<{ divisionName: string }>();
    const [searchParams] = useSearchParams();
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof TableData; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const divisionData = useMemo(() => {
        const filters = {
            departments: searchParams.get('departments')?.split(',') || [],
            categories: searchParams.get('categories')?.split(',') || [],
            branches: searchParams.get('branches')?.split(',') || [],
            brands: searchParams.get('brands')?.split(',') || [],
        };
        const searchTerm = searchParams.get('search')?.toLowerCase() || '';

        return allRawData.filter(row => {
            if (row['DIVISION'] !== divisionName) return false;

            const { departments, categories, branches, brands } = filters;
            const departmentMatch = departments.length === 0 || departments.includes(row['DEPARTMENT']);
            const categoryMatch = categories.length === 0 || categories.includes(row['CATEGORY']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
            if (!(departmentMatch && categoryMatch && branchMatch && brandMatch)) return false;
            
            if (searchTerm) {
                 return (row['BRANCH NAME']?.toLowerCase().includes(searchTerm)) ||
                        (row['BRAND']?.toLowerCase().includes(searchTerm)) ||
                        (row['ITEM DESCRIPTION']?.toLowerCase().includes(searchTerm));
            }

            return true;
        });
    }, [allRawData, divisionName, searchParams]);

    const processedData = useMemo(() => {
        if (!divisionData.length) return null;

        let totalSales2024 = 0;
        let totalSales2025 = 0;
        const departments: { [key: string]: { s24: number, s25: number } } = {};
        const categories: { [key: string]: { s24: number, s25: number } } = {};
        const tableMap = new Map<string, { department: string; category: string; s24: number; s25: number }>();

        divisionData.forEach(row => {
            totalSales2024 += row.SALES2024;
            totalSales2025 += row.SALES2025;

            if (row.DEPARTMENT) {
                departments[row.DEPARTMENT] = departments[row.DEPARTMENT] || { s24: 0, s25: 0 };
                departments[row.DEPARTMENT].s24 += row.SALES2024;
                departments[row.DEPARTMENT].s25 += row.SALES2025;
            }
            if (row.CATEGORY) {
                 categories[row.CATEGORY] = categories[row.CATEGORY] || { s24: 0, s25: 0 };
                 categories[row.CATEGORY].s24 += row.SALES2024;
                 categories[row.CATEGORY].s25 += row.SALES2025;
            }
            
            const tableKey = `${row.DEPARTMENT}|${row.CATEGORY}`;
            if (!tableMap.has(tableKey)) tableMap.set(tableKey, { department: row.DEPARTMENT, category: row.CATEGORY, s24: 0, s25: 0 });
            const entry = tableMap.get(tableKey)!;
            entry.s24 += row.SALES2024;
            entry.s25 += row.SALES2025;
        });

        const departmentsData = Object.entries(departments).map(([name, { s24, s25 }]) => ({
            name,
            sales2024: s24,
            sales2025: s25,
            contribution2025: totalSales2025 > 0 ? (s25 / totalSales2025) * 100 : 0,
        })).sort((a,b) => b.sales2025 - a.sales2025);

        const tableData = Array.from(tableMap.values()).map(d => ({
            department: d.department,
            category: d.category,
            sales2024: d.s24,
            sales2025: d.s25,
            contribution2024: totalSales2024 > 0 ? (d.s24 / totalSales2024) * 100 : 0,
            contribution2025: totalSales2025 > 0 ? (d.s25 / totalSales2025) * 100 : 0,
            growth: calculateGrowth(d.s25, d.s24),
        }));

        return { totalSales2024, totalSales2025, departmentsData, tableData };
    }, [divisionData]);

    const categoryChartData = useMemo(() => {
        if (!processedData) return [];
        const sourceData = selectedDepartment ? divisionData.filter(r => r['DEPARTMENT'] === selectedDepartment) : divisionData;
        const totalSales2025 = sourceData.reduce((acc, row) => acc + row.SALES2025, 0);
        
        const categories: { [key: string]: { s24: number, s25: number } } = {};
        sourceData.forEach(row => {
            if (row.CATEGORY) {
                categories[row.CATEGORY] = categories[row.CATEGORY] || { s24: 0, s25: 0 };
                categories[row.CATEGORY].s24 += row.SALES2024;
                categories[row.CATEGORY].s25 += row.SALES2025;
            }
        });
        return Object.entries(categories).map(([name, { s24, s25 }]) => ({
            name,
            sales2024: s24,
            sales2025: s25,
            contribution2025: totalSales2025 > 0 ? (s25 / totalSales2025) * 100 : 0,
        })).sort((a,b) => b.sales2025 - a.sales2025);
    }, [divisionData, processedData, selectedDepartment]);

    const topBranchesData = useMemo(() => {
        const sourceData = selectedDepartment ? divisionData.filter(r => r['DEPARTMENT'] === selectedDepartment) : divisionData;
        const branches: { [key: string]: { s25: number } } = {};
        sourceData.forEach(row => {
            if (row['BRANCH NAME']) {
                branches[row['BRANCH NAME']] = branches[row['BRANCH NAME']] || { s25: 0 };
                branches[row['BRANCH NAME']].s25 += row.SALES2025;
            }
        });
        return Object.entries(branches).map(([name, { s25 }]) => ({
            name,
            sales2025: s25,
        })).sort((a, b) => b.sales2025 - a.sales2025).slice(0, 10);
    }, [divisionData, selectedDepartment]);

    const sortedTableData = useMemo(() => {
        return [...(processedData?.tableData || [])].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [processedData?.tableData, sortConfig]);

    const handleDepartmentClick = (payload: any) => {
        if (payload && payload.name) {
            setSelectedDepartment(prev => prev === payload.name ? null : payload.name);
        }
    };
    
    const requestSort = (key: keyof TableData) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (!processedData) return <div className="text-center py-10">No data available for this division or filter combination.</div>;

    const PIE_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fb7185', '#facc15', '#9ca3af'];

    return (
        <div className="flex flex-col gap-6">
            <Header />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white text-center sm:text-left">
                    Division Analysis: <span className="text-sky-400">{divisionName}</span>
                </h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>
                    Back to Dashboard
                </Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Department Sales & Contribution (2025)">
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={processedData.departmentsData} layout="vertical" margin={{ left: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="white" tickFormatter={formatNumberAbbreviated} />
                            <YAxis type="category" dataKey="name" stroke="white" width={80} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="sales2025" fill="#34d399" className="cursor-pointer" onClick={(data) => handleDepartmentClick(data)}>
                                {processedData.departmentsData.map((entry) => (
                                    <Cell key={entry.name} fill={selectedDepartment === entry.name ? '#f59e0b' : '#34d399'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title={selectedDepartment ? `Categories in ${selectedDepartment}` : 'All Categories Sales (2025)'}>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={categoryChartData} dataKey="sales2025" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
            
            <ChartCard title={selectedDepartment ? `Top 10 Branches in ${selectedDepartment}` : 'Top 10 Branches'}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topBranchesData} margin={{ bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="white" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                        <YAxis stroke="white" tickFormatter={formatNumberAbbreviated} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sales2025" fill="#818cf8" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="bg-slate-800/50 p-4 rounded-2xl shadow-lg border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Detailed Department & Category Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-300 table-sortable table-banded">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                            <tr>
                                {(Object.keys(sortConfig) as Array<keyof TableData>).map(key => (
                                    <th key={key} scope="col" className="p-3 cursor-pointer" onClick={() => requestSort(key)}>
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        {sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTableData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-800/80 transition-colors text-sm">
                                    <td className="p-3">{row.department}</td>
                                    <td className="p-3">{row.category}</td>
                                    <td className="p-3 text-right">{formatNumberAbbreviated(row.sales2024)}</td>
                                    <td className="p-3 text-right">{formatNumberAbbreviated(row.sales2025)}</td>
                                    <td className="p-3 text-right">{row.contribution2024.toFixed(2)}%</td>
                                    <td className="p-3 text-right">{row.contribution2025.toFixed(2)}%</td>
                                    <td className="p-3 text-right"><GrowthIndicator value={row.growth} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DivisionDetailView;
