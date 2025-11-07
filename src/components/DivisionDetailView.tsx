import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RawSalesDataRow } from '../types';
import Header from './Header';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

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

const DEPT_ROW_COLORS = [
    'bg-sky-900/20',
    'bg-indigo-900/20',
    'bg-emerald-900/20',
    'bg-rose-900/20',
    'bg-amber-900/20',
    'bg-violet-900/20'
];

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ allRawData }) => {
    const { divisionName } = useParams<{ divisionName: string }>();
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof TableData; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const allBranchesList = useMemo(() => {
        return [...new Set(allRawData.map(r => r['BRANCH NAME']))].filter(Boolean);
    }, [allRawData]);

    const divisionData = useMemo(() => {
        return allRawData.filter(row => row['DIVISION'] === divisionName);
    }, [allRawData, divisionName]);

    const processedData = useMemo(() => {
        if (!divisionData.length) return null;

        let totalSales2024 = 0;
        let totalSales2025 = 0;
        const departments: { [key: string]: { s24: number, s25: number } } = {};
        const tableMap = new Map<string, { department: string; category: string; s24: number; s25: number }>();

        divisionData.forEach(row => {
            totalSales2024 += row.SALES2024;
            totalSales2025 += row.SALES2025;

            if (row.DEPARTMENT) {
                departments[row.DEPARTMENT] = departments[row.DEPARTMENT] || { s24: 0, s25: 0 };
                departments[row.DEPARTMENT].s24 += row.SALES2024;
                departments[row.DEPARTMENT].s25 += row.SALES2025;
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

        const grandTotal = {
            sales2024: totalSales2024,
            sales2025: totalSales2025,
            growth: calculateGrowth(totalSales2025, totalSales2024),
            contribution2024: 100,
            contribution2025: 100
        };

        return { totalSales2024, totalSales2025, departmentsData, tableData, grandTotal };
    }, [divisionData]);

    const allBranchesData = useMemo(() => {
        const sourceData = selectedDepartment ? divisionData.filter(r => r['DEPARTMENT'] === selectedDepartment) : divisionData;
        
        const salesByBranch: { [key: string]: number } = {};
        sourceData.forEach(row => {
            if (row['BRANCH NAME']) {
                salesByBranch[row['BRANCH NAME']] = (salesByBranch[row['BRANCH NAME']] || 0) + row.SALES2025;
            }
        });

        const allBranchesSales = allBranchesList.map(branchName => ({
            name: branchName,
            sales2025: salesByBranch[branchName] || 0,
        }));

        return allBranchesSales.sort((a, b) => b.sales2025 - a.sales2025);
    }, [divisionData, selectedDepartment, allBranchesList]);

    const groupedData = useMemo(() => {
        if (!processedData?.tableData) return [];

        const groups: Record<string, TableData[]> = {};
        for (const row of processedData.tableData) {
            if (!groups[row.department]) groups[row.department] = [];
            groups[row.department].push(row);
        }

        const result = Object.entries(groups).map(([departmentName, categories]) => {
            const sortedCategories = [...categories].sort((a, b) => {
                 const aVal = a[sortConfig.key];
                 const bVal = b[sortConfig.key];
                 if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                 if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                 return 0;
            });

            const total = categories.reduce((acc, row) => {
                acc.sales2024 += row.sales2024;
                acc.sales2025 += row.sales2025;
                return acc;
            }, { sales2024: 0, sales2025: 0 });

            const finalTotal: TableData = {
                department: departmentName, category: 'TOTAL', sales2024: total.sales2024, sales2025: total.sales2025,
                growth: calculateGrowth(total.sales2025, total.sales2024),
                contribution2024: processedData.totalSales2024 > 0 ? (total.sales2024 / processedData.totalSales2024) * 100 : 0,
                contribution2025: processedData.totalSales2025 > 0 ? (total.sales2025 / processedData.totalSales2025) * 100 : 0,
            };
            
            return { departmentName, categories: sortedCategories, total: finalTotal };
        });

        return result.sort((a, b) => b.total.sales2025 - a.total.sales2025);
    }, [processedData, sortConfig]);

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
    
    const tableColumns: { key: keyof TableData; header: string; isNumeric?: boolean }[] = [
        { key: 'category', header: 'Category' }, { key: 'sales2024', header: '2024 Sales', isNumeric: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true }, { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true },
        { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true }, { key: 'growth', header: 'Growth %', isNumeric: true },
    ];

    const branchChartHeight = Math.max(400, allBranchesData.length * 25);

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
            
            <ChartCard title="Department Sales & Contribution (2025)" className="lg:col-span-2">
                 <ResponsiveContainer width="100%" height={Math.max(300, processedData.departmentsData.length * 30)}>
                    <BarChart data={processedData.departmentsData} layout="vertical" margin={{ left: 120, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="white" tickFormatter={formatNumberAbbreviated} />
                        <YAxis type="category" dataKey="name" stroke="white" width={120} tick={{ fontSize: 12 }} interval={0} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sales2025" fill="#34d399" className="cursor-pointer" onClick={(data) => handleDepartmentClick(data)}>
                            {processedData.departmentsData.map((entry) => (
                                <Cell key={entry.name} fill={selectedDepartment === entry.name ? '#f59e0b' : '#34d399'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard title={selectedDepartment ? `Branch Performance in ${selectedDepartment}` : 'Branch Performance'}>
                <ResponsiveContainer width="100%" height={branchChartHeight}>
                    <BarChart layout="vertical" data={allBranchesData} margin={{ left: 120, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="white" tickFormatter={formatNumberAbbreviated} />
                        <YAxis type="category" dataKey="name" stroke="white" width={120} tick={{ fontSize: 12 }} interval={0} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sales2025" fill="#818cf8" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="bg-slate-800/50 p-4 rounded-2xl shadow-lg border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Detailed Department & Category Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-20">
                            <tr>
                                <th className="p-3">Department</th>
                                {tableColumns.map(col => (
                                    <th key={col.key} scope="col" className={`p-3 cursor-pointer ${col.isNumeric ? 'text-right' : 'text-left'}`} onClick={() => requestSort(col.key)}>
                                        {col.header}
                                        {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                             <tr className="bg-sky-900/60 font-bold text-white sticky top-[41px] z-10 backdrop-blur-sm">
                                <td className="p-3 whitespace-nowrap" colSpan={2}>GRAND TOTAL</td>
                                <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(processedData.grandTotal.sales2024)}</td>
                                <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(processedData.grandTotal.sales2025)}</td>
                                <td className="p-3 whitespace-nowrap text-right">100.00%</td>
                                <td className="p-3 whitespace-nowrap text-right">100.00%</td>
                                <td className="p-3 whitespace-nowrap text-right"><GrowthIndicator value={processedData.grandTotal.growth} /></td>
                            </tr>
                            {groupedData.map((group, deptIndex) => (
                                <React.Fragment key={group.departmentName}>
                                    <tr className="bg-slate-700/60 font-bold text-white text-sm">
                                        <td className="p-3 whitespace-nowrap" colSpan={2}>{group.departmentName} TOTAL</td>
                                        <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(group.total.sales2024)}</td>
                                        <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(group.total.sales2025)}</td>
                                        <td className="p-3 whitespace-nowrap text-right">{group.total.contribution2024.toFixed(2)}%</td>
                                        <td className="p-3 whitespace-nowrap text-right">{group.total.contribution2025.toFixed(2)}%</td>
                                        <td className="p-3 whitespace-nowrap text-right"><GrowthIndicator value={group.total.growth} /></td>
                                    </tr>
                                    {group.categories.map((row, catIndex) => (
                                        <tr key={`${group.departmentName}-${catIndex}`} className={`hover:bg-slate-700/50 transition-colors text-sm ${DEPT_ROW_COLORS[deptIndex % DEPT_ROW_COLORS.length]}`}>
                                           <td className="p-3 whitespace-nowrap"></td>
                                           {tableColumns.map(col => (
                                               <td key={col.key} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                                    {(() => {
                                                        const value = row[col.key];
                                                        switch(col.key) {
                                                            case 'sales2024':
                                                            case 'sales2025':
                                                                return formatNumberAbbreviated(value as number);
                                                            case 'contribution2024':
                                                            case 'contribution2025':
                                                                return `${(value as number).toFixed(2)}%`;
                                                            case 'growth':
                                                                return <GrowthIndicator value={value as number} />;
                                                            default:
                                                                return value;
                                                        }
                                                    })()}
                                               </td>
                                           ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DivisionDetailView;