
import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { CustomYAxisTick } from './charts/CustomYAxisTick';
import { getSalesValue } from '../services/dataProcessor';

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

const ContributionCell: React.FC<{ value: number }> = ({ value }) => {
    if (isNaN(value)) return <span className="text-right block w-full">-</span>;
    return <span className="text-right block w-full">{value.toFixed(2)}%</span>;
};


interface DivisionDetailViewProps {
    allRawData: RawSalesDataRow[];
}

type TableData = {
    department: string;
    category: string;
    sales2024: number;
    cash2024: number;
    credit2024: number;
    sales2025: number;
    cash2025: number;
    credit2025: number;
    contribution2024: number;
    contribution2025: number;
    cashPercent2025: number;
    growth: number;
    cashGrowth: number;
    creditGrowth: number;
};

const DEPT_ROW_COLORS = [
    'bg-sky-900/20', 'bg-indigo-900/20', 'bg-emerald-900/20', 'bg-rose-900/20', 'bg-amber-900/20', 'bg-violet-900/20'
];

const DivisionDetailView: React.FC<DivisionDetailViewProps> = ({ allRawData }) => {
    const { divisionName } = useParams<{ divisionName: string }>();
    const { salesMix } = useOutletContext<LayoutContextType>();
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState<{ key: keyof TableData; direction: 'asc' | 'desc' }>({ key: 'sales2025', direction: 'desc' });
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

    const allBranchesList = useMemo(() => {
        return [...new Set(allRawData.map(r => r['BRANCH NAME']))].filter(Boolean);
    }, [allRawData]);

    const divisionData = useMemo(() => {
        return allRawData.filter(row => row['DIVISION'] === divisionName);
    }, [allRawData, divisionName]);

    const handleDepartmentClick = (data: any) => {
        if (data && data.name) {
            const departmentName = data.name;
            setSelectedDepartment(prev => (prev === departmentName ? null : departmentName));
        }
    };
    
    const handleRowClick = (departmentName: string, categoryName: string) => {
        if (categoryName && departmentName && divisionName) {
            navigate(`/division/${encodeURIComponent(divisionName)}/${encodeURIComponent(departmentName)}/${encodeURIComponent(categoryName)}`);
        }
    };


    const processedData = useMemo(() => {
        if (!divisionData.length) return null;

        let totalSales2024 = 0, totalSales2025 = 0;
        let totalCash2024 = 0, totalCredit2024 = 0, totalCash2025 = 0, totalCredit2025 = 0;

        const departments: { [key: string]: { s24: number, s25: number } } = {};
        const tableMap = new Map<string, { department: string; category: string; s24: number; c24: number; cr24: number; s25: number; c25: number; cr25: number; }>();

        divisionData.forEach(row => {
            // Apply sales mix filter if needed
            const s24 = getSalesValue(row, '2024', salesMix);
            const s25 = getSalesValue(row, '2025', salesMix);
            
            // These remain full totals regardless of mix for detailed breakdown if needed, 
            // but for the main table view we might want consistency.
            // However, the detailed view specifically shows cash/credit columns, so we should keep original values for those specific columns
            const c24 = row.SALES2024_CASH || 0;
            const cr24 = row.SALES2024_CREDIT || 0;
            const c25 = row.SALES2025_CASH || 0;
            const cr25 = row.SALES2025_CREDIT || 0;

            totalSales2024 += s24;
            totalSales2025 += s25;
            
            // Accumulate raw totals for footer
            totalCash2024 += c24;
            totalCredit2024 += cr24;
            totalCash2025 += c25;
            totalCredit2025 += cr25;

            if (row.DEPARTMENT) {
                departments[row.DEPARTMENT] = departments[row.DEPARTMENT] || { s24: 0, s25: 0 };
                departments[row.DEPARTMENT].s24 += s24;
                departments[row.DEPARTMENT].s25 += s25;
            }
            const tableKey = `${row.DEPARTMENT}|${row.CATEGORY}`;
            if (!tableMap.has(tableKey)) tableMap.set(tableKey, { department: row.DEPARTMENT, category: row.CATEGORY, s24: 0, c24: 0, cr24: 0, s25: 0, c25: 0, cr25: 0 });
            const entry = tableMap.get(tableKey)!;
            entry.s24 += s24;
            entry.c24 += c24;
            entry.cr24 += cr24;
            entry.s25 += s25;
            entry.c25 += c25;
            entry.cr25 += cr25;
        });

        const departmentsData = Object.entries(departments).map(([name, { s24, s25 }]) => ({
            name, sales2024: s24, sales2025: s25, growth: calculateGrowth(s25, s24),
            contribution2024: totalSales2024 > 0 ? (s24 / totalSales2024) * 100 : 0,
            contribution2025: totalSales2025 > 0 ? (s25 / totalSales2025) * 100 : 0,
        })).sort((a,b) => b.sales2025 - a.sales2025);

        const tableData: TableData[] = Array.from(tableMap.values()).map(d => ({
            department: d.department, category: d.category, 
            sales2024: d.s24, cash2024: d.c24, credit2024: d.cr24,
            sales2025: d.s25, cash2025: d.c25, credit2025: d.cr25,
            contribution2024: totalSales2024 > 0 ? (d.s24 / totalSales2024) * 100 : 0,
            contribution2025: totalSales2025 > 0 ? (d.s25 / totalSales2025) * 100 : 0,
            cashPercent2025: d.s25 > 0 ? (d.c25 / d.s25) * 100 : 0,
            growth: calculateGrowth(d.s25, d.s24),
            cashGrowth: calculateGrowth(d.c25, d.c24),
            creditGrowth: calculateGrowth(d.cr25, d.cr24),
        }));

        const grandTotal = {
            sales2024: totalSales2024, cash2024: totalCash2024, credit2024: totalCredit2024,
            sales2025: totalSales2025, cash2025: totalCash2025, credit2025: totalCredit2025,
            growth: calculateGrowth(totalSales2025, totalSales2024),
            cashGrowth: calculateGrowth(totalCash2025, totalCash2024),
            creditGrowth: calculateGrowth(totalCredit2025, totalCredit2024),
            contribution2024: 100, contribution2025: 100,
            cashPercent2025: totalSales2025 > 0 ? (totalCash2025 / totalSales2025) * 100 : 0
        };

        return { totalSales2024, totalSales2025, departmentsData, tableData, grandTotal };
    }, [divisionData, salesMix]);
    
    const departmentFilteredDivisionData = useMemo(() => {
        if (!selectedDepartment) return divisionData;
        return divisionData.filter(row => row['DEPARTMENT'] === selectedDepartment);
    }, [divisionData, selectedDepartment]);


    const allBranchesData = useMemo(() => {
        if (!processedData) return [];
        // Use division total for consistent contribution %
        const { totalSales2025 } = processedData;
        const sourceData = departmentFilteredDivisionData; 
        
        const salesByBranch: { [key: string]: { s24: number, s25: number } } = {};
        sourceData.forEach(row => {
            if (row['BRANCH NAME']) {
                salesByBranch[row['BRANCH NAME']] = salesByBranch[row['BRANCH NAME']] || { s24: 0, s25: 0 };
                salesByBranch[row['BRANCH NAME']].s24 += getSalesValue(row, '2024', salesMix);
                salesByBranch[row['BRANCH NAME']].s25 += getSalesValue(row, '2025', salesMix);
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

        const sortedBranches = allBranchesSales.sort((a, b) => b.sales2025 - a.sales2025);
        
        if (selectedDepartment) {
            // Only show branches that have sales for the selected department
            return sortedBranches.filter(b => b.sales2024 !== 0 || b.sales2025 !== 0);
        }

        return sortedBranches;

    }, [departmentFilteredDivisionData, allBranchesList, processedData, selectedDepartment, salesMix]);

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
                acc.sales2024 += row.sales2024; acc.cash2024 += row.cash2024; acc.credit2024 += row.credit2024;
                acc.sales2025 += row.sales2025; acc.cash2025 += row.cash2025; acc.credit2025 += row.credit2025;
                return acc;
            }, { sales2024: 0, cash2024: 0, credit2024: 0, sales2025: 0, cash2025: 0, credit2025: 0 });

            const finalTotal: TableData = {
                department: departmentName, category: 'TOTAL', 
                sales2024: total.sales2024, cash2024: total.cash2024, credit2024: total.credit2024,
                sales2025: total.sales2025, cash2025: total.cash2025, credit2025: total.credit2025,
                growth: calculateGrowth(total.sales2025, total.sales2024),
                cashGrowth: calculateGrowth(total.cash2025, total.cash2024),
                creditGrowth: calculateGrowth(total.credit2025, total.credit2024),
                contribution2024: processedData.totalSales2024 > 0 ? (total.sales2024 / processedData.totalSales2024) * 100 : 0,
                contribution2025: processedData.totalSales2025 > 0 ? (total.sales2025 / processedData.totalSales2025) * 100 : 0,
                cashPercent2025: total.sales2025 > 0 ? (total.cash2025 / total.sales2025) * 100 : 0,
            };
            return { departmentName, categories: sortedCategories, total: finalTotal };
        });
        return result.sort((a, b) => b.total.sales2025 - a.total.sales2025);
    }, [processedData, sortConfig]);

    const finalGroupedData = useMemo(() => {
        if (!selectedDepartment) return groupedData;
        return groupedData.filter(group => group.departmentName === selectedDepartment);
    }, [groupedData, selectedDepartment]);

    const handleExport = (format: 'csv' | 'pdf') => {
        const doc = new jsPDF() as jsPDF & { autoTable: (options: any) => jsPDF; };
        const title = `Division Analysis: ${divisionName}${selectedDepartment ? ` - ${selectedDepartment}`: ''}`;
        const head = [['Department', 'Category', '2024 Sales', '2025 Sales', '2025 Cash', '2025 Credit', 'Cash %', 'Growth %', 'Cash Gr%', 'Credit Gr%']];
        
        const body: (string|number)[][] = [];
        
        if (!selectedDepartment && processedData) {
            body.push(['GRAND TOTAL', '---', 
                formatNumberAbbreviated(processedData.grandTotal.sales2024), 
                formatNumberAbbreviated(processedData.grandTotal.sales2025),
                formatNumberAbbreviated(processedData.grandTotal.cash2025), 
                formatNumberAbbreviated(processedData.grandTotal.credit2025),
                `${processedData.grandTotal.cashPercent2025.toFixed(2)}%`,
                `${processedData.grandTotal.growth.toFixed(2)}%`,
                `${processedData.grandTotal.cashGrowth.toFixed(2)}%`,
                `${processedData.grandTotal.creditGrowth.toFixed(2)}%`
            ]);
        }

        finalGroupedData.forEach(group => {
            body.push([group.departmentName, 'TOTAL', 
                formatNumberAbbreviated(group.total.sales2024), formatNumberAbbreviated(group.total.sales2025), 
                formatNumberAbbreviated(group.total.cash2025), formatNumberAbbreviated(group.total.credit2025),
                `${group.total.cashPercent2025.toFixed(2)}%`,
                `${group.total.growth.toFixed(2)}%`, `${group.total.cashGrowth.toFixed(2)}%`, `${group.total.creditGrowth.toFixed(2)}%`
            ]);
            group.categories.forEach(cat => {
                body.push([group.departmentName, cat.category,
                    formatNumberAbbreviated(cat.sales2024), formatNumberAbbreviated(cat.sales2025),
                    formatNumberAbbreviated(cat.cash2025), formatNumberAbbreviated(cat.credit2025),
                    `${cat.cashPercent2025.toFixed(2)}%`,
                    `${cat.growth.toFixed(2)}%`, `${cat.cashGrowth.toFixed(2)}%`, `${cat.creditGrowth.toFixed(2)}%`
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
    
    const allTableColumns: { key: keyof TableData; header: string; isNumeric?: boolean }[] = [
        { key: 'category', header: 'Category' }, 
        { key: 'sales2024', header: '2024 Total', isNumeric: true },
        { key: 'cash2024', header: '2024 Cash', isNumeric: true },
        { key: 'credit2024', header: '2024 Credit', isNumeric: true },
        { key: 'sales2025', header: '2025 Total', isNumeric: true }, 
        { key: 'cash2025', header: '2025 Cash', isNumeric: true },
        { key: 'credit2025', header: '2025 Credit', isNumeric: true },
        { key: 'cashPercent2025', header: 'Cash %', isNumeric: true },
        { key: 'growth', header: 'Growth %', isNumeric: true },
        { key: 'cashGrowth', header: 'Cash Gr%', isNumeric: true },
        { key: 'creditGrowth', header: 'Credit Gr%', isNumeric: true },
    ];

    const tableColumns = allTableColumns.filter(col => {
        if (salesMix === 'Total') return true;
        const k = col.key.toString().toLowerCase();
        return !k.startsWith('cash') && !k.startsWith('credit');
    });

    const departmentChartHeight = Math.max(400, (processedData?.departmentsData?.length || 0) * 40);
    const branchChartHeight = Math.max(500, allBranchesData.length * 35);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white text-center sm:text-left">
                    Division Analysis: <span className="text-sky-400">{divisionName}</span>
                </h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>
                    Back to Dashboard
                </Link>
            </div>
            
            <ChartCard title={`Department Sales Performance (${salesMix} View)`} className="lg:col-span-2">
                 <ResponsiveContainer width="100%" height={departmentChartHeight}>
                    <BarChart data={processedData?.departmentsData || []} layout="vertical" margin={{ left: 100, right: 20 }} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="white" tickFormatter={formatNumberAbbreviated} />
                        <YAxis type="category" dataKey="name" stroke="white" width={100} tick={<CustomYAxisTick maxChars={15} />} interval={0} />
                        <Tooltip content={<EnhancedTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }}/>
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="sales2024" name="2024 Sales" onClick={handleDepartmentClick}>
                            {(processedData?.departmentsData || []).map((entry, index) => (
                                <Cell key={`cell-24-${index}`} cursor="pointer" fill="#38bdf8" opacity={!selectedDepartment || selectedDepartment === entry.name ? 1 : 0.3} />
                            ))}
                        </Bar>
                        <Bar dataKey="sales2025" name="2025 Sales" onClick={handleDepartmentClick}>
                             {(processedData?.departmentsData || []).map((entry, index) => (
                                <Cell key={`cell-25-${index}`} cursor="pointer" fill="#34d399" opacity={!selectedDepartment || selectedDepartment === entry.name ? 1 : 0.3} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard title={`Branch Performance${selectedDepartment ? ` for ${selectedDepartment}` : ''} (${salesMix} View)`}>
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
                    <h3 className="text-xl font-bold text-white text-center">
                        Detailed Performance {selectedDepartment ? ` for ${selectedDepartment}` : ' (All Departments)'}
                    </h3>
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
                             {!selectedDepartment && (
                                <tr className="bg-sky-900/60 font-bold text-white sticky top-[41px] z-10 backdrop-blur-sm">
                                    <td className="p-3 whitespace-nowrap" colSpan={2}>GRAND TOTAL</td>
                                    {tableColumns.slice(1).map(col => {
                                        let content: React.ReactNode = '';
                                        const key = col.key as keyof typeof processedData.grandTotal;
                                        
                                        if (col.key.toString().startsWith('sales') || col.key.toString().startsWith('cash') && !col.key.toString().includes('Percent') || col.key.toString().startsWith('credit')) {
                                            content = formatNumberAbbreviated(processedData.grandTotal[key as 'sales2024']);
                                        } else if (col.key === 'cashPercent2025') {
                                            content = `${processedData.grandTotal.cashPercent2025.toFixed(2)}%`;
                                        } else if (col.key.toString().startsWith('contribution')) {
                                            // grand total contribution is always 100% or summed up
                                            content = "100.00%";
                                        } else {
                                            content = <GrowthIndicator value={processedData.grandTotal[key as 'growth']} />;
                                        }

                                        return (
                                            <td key={col.key} className={`p-3 whitespace-nowrap text-right ${col.key === 'cashPercent2025' ? 'text-emerald-400' : ''}`}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                             )}
                            {finalGroupedData.map((group, deptIndex) => (
                                <React.Fragment key={group.departmentName}>
                                    <tr className="bg-slate-700/60 font-bold text-white text-sm">
                                        <td className="p-3 whitespace-nowrap" colSpan={2}>{group.departmentName} TOTAL</td>
                                        {tableColumns.slice(1).map(col => {
                                            let content: React.ReactNode = '';
                                            const key = col.key as keyof typeof group.total;
                                            
                                            if (col.key.toString().startsWith('sales') || col.key.toString().startsWith('cash') && !col.key.toString().includes('Percent') || col.key.toString().startsWith('credit')) {
                                                content = formatNumberAbbreviated(group.total[key as 'sales2024']);
                                            } else if (col.key === 'cashPercent2025') {
                                                content = `${group.total.cashPercent2025.toFixed(2)}%`;
                                            } else if (col.key.toString().startsWith('contribution')) {
                                                content = <ContributionCell value={group.total[key as 'contribution2024']} />;
                                            } else {
                                                content = <GrowthIndicator value={group.total[key as 'growth']} />;
                                            }

                                            return (
                                                <td key={col.key} className={`p-3 whitespace-nowrap text-right ${col.key === 'cashPercent2025' ? 'text-emerald-400' : ''}`}>
                                                    {content}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {group.categories.map((row, catIndex) => (
                                        <tr 
                                            key={`${group.departmentName}-${catIndex}`} 
                                            className={`hover:bg-slate-700/50 transition-colors text-sm cursor-pointer ${DEPT_ROW_COLORS[deptIndex % DEPT_ROW_COLORS.length]}`}
                                            onClick={() => handleRowClick(group.departmentName, row.category)}
                                            role="link"
                                            aria-label={`View items for category ${row.category} in department ${group.departmentName}`}
                                        >
                                           <td className="p-3 whitespace-nowrap border-l-4 border-transparent"></td>
                                           {tableColumns.map(col => (
                                               <td key={col.key} className={`p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''}`}>
                                                    {(() => {
                                                        const value = row[col.key];
                                                        switch(col.key) {
                                                            case 'sales2024': case 'sales2025': return formatNumberAbbreviated(value as number);
                                                            case 'cash2024': case 'cash2025': case 'credit2024': case 'credit2025': return formatNumberAbbreviated(value as number);
                                                            case 'contribution2024': case 'contribution2025': return <ContributionCell value={value as number} />;
                                                            case 'cashPercent2025': return <span className="text-right block w-full">{(value as number).toFixed(2)}%</span>;
                                                            case 'growth': case 'cashGrowth': case 'creditGrowth': return <GrowthIndicator value={value as number} />;
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
