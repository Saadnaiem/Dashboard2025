import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
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

const EnhancedTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-lg shadow-lg text-sm">
                <p className="font-bold text-green-300 mb-2">{label || data.name}</p>
                {data.sales2024 !== undefined && <p className="text-sky-400">2024 Sales: {formatNumberAbbreviated(data.sales2024)}</p>}
                {data.sales2025 !== undefined && <p className="text-green-400">2025 Sales: {formatNumberAbbreviated(data.sales2025)}</p>}
                {data.growth !== undefined && <div className="flex items-center gap-1">Growth: <GrowthIndicator value={data.growth} /></div>}
                {data.contribution2025 !== undefined && <p className="text-slate-300">Contrib %: {data.contribution2025.toFixed(2)}%</p>}
            </div>
        );
    }
    return null;
};

const CustomYAxisTick: React.FC<any> = ({ x, y, payload, maxChars = 20 }) => {
    const value = payload.value as string;
    const truncatedValue = value.length > maxChars ? `${value.substring(0, maxChars)}...` : value;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={4} textAnchor="end" fill="white" fontSize={12} fontWeight="bold">
                <title>{value}</title>
                {truncatedValue}
            </text>
        </g>
    );
};

const ContributionCell: React.FC<{ value: number }> = ({ value }) => {
    if (isNaN(value)) return <span className="text-right block w-full">-</span>;
    return (
        <div className="flex items-center justify-end gap-2 w-full">
            <span className="font-mono w-14 text-right">{value.toFixed(2)}%</span>
            <div className="w-24 bg-slate-600 rounded-full h-2.5 flex-shrink-0">
                <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
        </div>
    );
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
    'bg-sky-900/20', 'bg-indigo-900/20', 'bg-emerald-900/20', 'bg-rose-900/20', 'bg-amber-900/20', 'bg-violet-900/20'
];

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ allRawData }) => {
    const { divisionName } = useParams<{ divisionName: string }>();
    const [sortConfig, setSortConfig] = useState<{ key: keyof TableData; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });

    const allBranchesList = useMemo(() => {
        return [...new Set(allRawData.map(r => r['BRANCH NAME']))].filter(Boolean);
    }, [allRawData]);

    const divisionData = useMemo(() => {
        return allRawData.filter(row => row['DIVISION'] === divisionName);
    }, [allRawData, divisionName]);

    const processedData = useMemo(() => {
        if (!divisionData.length) return null;

        let totalSales2024 = 0, totalSales2025 = 0;
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
            name, sales2024: s24, sales2025: s25, growth: calculateGrowth(s25, s24),
            contribution2024: totalSales2024 > 0 ? (s24 / totalSales2024) * 100 : 0,
            contribution2025: totalSales2025 > 0 ? (s25 / totalSales2025) * 100 : 0,
        })).sort((a,b) => b.sales2025 - a.sales2025);

        const tableData = Array.from(tableMap.values()).map(d => ({
            department: d.department, category: d.category, sales2024: d.s24, sales2025: d.s25,
            contribution2024: totalSales2024 > 0 ? (d.s24 / totalSales2024) * 100 : 0,
            contribution2025: totalSales2025 > 0 ? (d.s25 / totalSales2025) * 100 : 0,
            growth: calculateGrowth(d.s25, d.s24),
        }));

        const grandTotal = {
            sales2024: totalSales2024, sales2025: totalSales2025, growth: calculateGrowth(totalSales2025, totalSales2024),
            contribution2024: 100, contribution2025: 100
        };

        return { totalSales2024, totalSales2025, departmentsData, tableData, grandTotal };
    }, [divisionData]);

    const allBranchesData = useMemo(() => {
        if (!processedData) return [];
        const { totalSales2025 } = processedData;
        const sourceData = divisionData;
        
        const salesByBranch: { [key: string]: { s24: number, s25: number } } = {};
        sourceData.forEach(row => {
            if (row['BRANCH NAME']) {
                salesByBranch[row['BRANCH NAME']] = salesByBranch[row['BRANCH NAME']] || { s24: 0, s25: 0 };
                salesByBranch[row['BRANCH NAME']].s24 += row.SALES2024;
                salesByBranch[row['BRANCH NAME']].s25 += row.SALES2025;
            }
        });

        const allBranchesSales = allBranchesList.map(branchName => {
            const sales = salesByBranch[branchName] || { s24: 0, s25: 0 };
            return {
                name: branchName, sales2024: sales.s24, sales2025: sales.s25,
                growth: calculateGrowth(sales.s25, sales.s24),
                contribution2025: totalSales2025 > 0 ? (sales.s25 / totalSales2025) * 100 : 0,
            };
        });
        return allBranchesSales.sort((a, b) => b.sales2025 - a.sales2025);
    }, [divisionData, allBranchesList, processedData]);

    const groupedData = useMemo(() => {
        if (!processedData?.tableData) return [];
        const groups: Record<string, TableData[]> = {};
        for (const row of processedData.tableData) {
            if (!groups[row.department]) groups[row.department] = [];
            groups[row.department].push(row);
        }

        const result = Object.entries(groups).map(([departmentName, categories]) => {
            const sortedCategories = [...categories].sort((a, b) => {
                 const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
                 if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                 if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                 return 0;
            });

            const total = categories.reduce((acc, row) => {
                acc.sales2024 += row.sales2024; acc.sales2025 += row.sales2025; return acc;
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

    const handleExport = (format: 'csv' | 'pdf') => {
        const doc = new jsPDF() as jsPDF & { autoTable: (options: any) => jsPDF; };
        const title = `Division Analysis: ${divisionName}`;
        const head = [['Department', 'Category', '2024 Sales', '2025 Sales', 'Contrib % 2024', 'Contrib % 2025', 'Growth %']];
        
        const body: (string|number)[][] = [];
        body.push(['GRAND TOTAL', '---', 
            formatNumberAbbreviated(processedData!.grandTotal.sales2024), 
            formatNumberAbbreviated(processedData!.grandTotal.sales2025), 
            '100.00%', '100.00%', 
            `${processedData!.grandTotal.growth.toFixed(2)}%`
        ]);

        groupedData.forEach(group => {
            body.push([group.departmentName, 'TOTAL', 
                formatNumberAbbreviated(group.total.sales2024), formatNumberAbbreviated(group.total.sales2025), 
                `${group.total.contribution2024.toFixed(2)}%`, `${group.total.contribution2025.toFixed(2)}%`, 
                `${group.total.growth.toFixed(2)}%`
            ]);
            group.categories.forEach(cat => {
                body.push([group.departmentName, cat.category,
                    formatNumberAbbreviated(cat.sales2024), formatNumberAbbreviated(cat.sales2025),
                    `${cat.contribution2024.toFixed(2)}%`, `${cat.contribution2025.toFixed(2)}%`,
                    `${cat.growth.toFixed(2)}%`
                ]);
            });
        });
        
        const filename = `division_analysis_${divisionName?.toLowerCase().replace(/ /g, '_')}`;

        if (format === 'pdf') {
            doc.text(title, 14, 15);
            doc.autoTable({ startY: 20, head, body, theme: 'striped' });
            doc.save(`${filename}.pdf`);
        } else {
            const csv = Papa.unparse({ fields: head[0], data: body });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!processedData) return <div className="text-center py-10">No data available for this division or filter combination.</div>;
    
    const branchChartHeight = Math.max(400, allBranchesData.length * 25);
    const tableColumns: { key: keyof TableData; header: string; isNumeric?: boolean }[] = [
        { key: 'category', header: 'Category' }, { key: 'sales2024', header: '2024 Sales', isNumeric: true },
        { key: 'sales2025', header: '2025 Sales', isNumeric: true }, { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true },
        { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true }, { key: 'growth', header: 'Growth %', isNumeric: true },
    ];

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
            
            <ChartCard title="Department Sales Performance" className="lg:col-span-2">
                 <ResponsiveContainer width="100%" height={Math.max(300, processedData.departmentsData.length * 40)}>
                    <BarChart data={processedData.departmentsData} layout="vertical" margin={{ left: 100, right: 20 }} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="white" tickFormatter={formatNumberAbbreviated} />
                        <YAxis type="category" dataKey="name" stroke="white" width={100} tick={<CustomYAxisTick maxChars={15} />} interval={0} />
                        <Tooltip content={<EnhancedTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }}/>
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="sales2024" name="2024 Sales" fill="#38bdf8" />
                        <Bar dataKey="sales2025" name="2025 Sales" fill="#34d399" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard title={'Branch Performance'}>
                <ResponsiveContainer width="100%" height={branchChartHeight}>
                    <BarChart layout="vertical" data={allBranchesData} margin={{ left: 120, right: 20 }} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="white" tickFormatter={formatNumberAbbreviated} />
                        <YAxis type="category" dataKey="name" stroke="white" width={120} tick={<CustomYAxisTick maxChars={18} />} interval={0} />
                        <Tooltip content={<EnhancedTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="sales2024" name="2024 Sales" fill="#38bdf8" />
                        <Bar dataKey="sales2025" name="2025 Sales" fill="#34d399" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                 <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white text-center">Detailed Department & Category Performance</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">Export CSV</button>
                        <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">Export PDF</button>
                    </div>
                 </div>
                <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-20">
                            <tr>
                                <th className="p-3">Department</th>
                                {tableColumns.map(col => (
                                    <th key={col.key} scope="col" className={`p-3 cursor-pointer ${col.isNumeric ? 'text-right' : 'text-left'}`} onClick={() => setSortConfig(c => ({key: col.key, direction: c.key === col.key && c.direction === 'asc' ? 'desc' : 'asc'}))}>
                                        {col.header} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                             <tr className="bg-sky-900/60 font-bold text-white sticky top-[41px] z-10 backdrop-blur-sm">
                                <td className="p-3 whitespace-nowrap" colSpan={2}>GRAND TOTAL</td>
                                <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(processedData.grandTotal.sales2024)}</td>
                                <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(processedData.grandTotal.sales2025)}</td>
                                <td className="p-3 whitespace-nowrap text-right"><ContributionCell value={100} /></td>
                                <td className="p-3 whitespace-nowrap text-right"><ContributionCell value={100} /></td>
                                <td className="p-3 whitespace-nowrap text-right"><GrowthIndicator value={processedData.grandTotal.growth} /></td>
                            </tr>
                            {groupedData.map((group, deptIndex) => (
                                <React.Fragment key={group.departmentName}>
                                    <tr className="bg-slate-700/60 font-bold text-white text-sm">
                                        <td className="p-3 whitespace-nowrap" colSpan={2}>{group.departmentName} TOTAL</td>
                                        <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(group.total.sales2024)}</td>
                                        <td className="p-3 whitespace-nowrap text-right">{formatNumberAbbreviated(group.total.sales2025)}</td>
                                        <td className="p-3 whitespace-nowrap text-right"><ContributionCell value={group.total.contribution2024} /></td>
                                        <td className="p-3 whitespace-nowrap text-right"><ContributionCell value={group.total.contribution2025} /></td>
                                        <td className="p-3 whitespace-nowrap text-right"><GrowthIndicator value={group.total.growth} /></td>
                                    </tr>
                                    {group.categories.map((row, catIndex) => (
                                        <tr key={`${group.departmentName}-${catIndex}`} className={`hover:bg-slate-700/50 transition-colors text-sm ${DEPT_ROW_COLORS[deptIndex % DEPT_ROW_COLORS.length]}`}>
                                           <td className="p-3 whitespace-nowrap border-l-4 border-transparent"></td>
                                           {tableColumns.map(col => (
                                               <td key={col.key} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                                    {(() => {
                                                        const value = row[col.key];
                                                        switch(col.key) {
                                                            case 'sales2024': case 'sales2025': return formatNumberAbbreviated(value as number);
                                                            case 'contribution2024': case 'contribution2025': return <ContributionCell value={value as number} />;
                                                            case 'growth': return <GrowthIndicator value={value as number} />;
                                                            default: return value;
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