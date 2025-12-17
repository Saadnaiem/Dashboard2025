import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { RawSalesDataRow, LayoutContextType } from '../types';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';
import { getSalesValue } from '../services/dataProcessor';

const calculateGrowth = (current: number, previous: number) => 
    previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

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
    const [selectedDepartment] = useState<string | null>(null);

    const divisionData = useMemo(() => {
        return allRawData.filter(row => row['DIVISION'] === divisionName);
    }, [allRawData, divisionName]);

    const handleRowClick = (departmentName: string, categoryName: string) => {
        if (categoryName && departmentName && divisionName) {
            navigate(`/division/${encodeURIComponent(divisionName)}/${encodeURIComponent(departmentName)}/${encodeURIComponent(categoryName)}`);
        }
    };

    const processedData = useMemo(() => {
        if (!divisionData.length) return null;

        let totalSales2024 = 0, totalSales2025 = 0;
        let totalCash2024 = 0, totalCredit2024 = 0, totalCash2025 = 0, totalCredit2025 = 0;

        const tableMap = new Map<string, { department: string; category: string; s24: number; c24: number; cr24: number; s25: number; c25: number; cr25: number; }>();

        divisionData.forEach(row => {
            const s24 = getSalesValue(row, '2024', salesMix);
            const s25 = getSalesValue(row, '2025', salesMix);
            
            const c24 = row.SALES2024_CASH || 0;
            const cr24 = row.SALES2024_CREDIT || 0;
            const c25 = row.SALES2025_CASH || 0;
            const cr25 = row.SALES2025_CREDIT || 0;

            totalSales2024 += s24;
            totalSales2025 += s25;
            
            totalCash2024 += c24;
            totalCredit2024 += cr24;
            totalCash2025 += c25;
            totalCredit2025 += cr25;

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

        return { totalSales2024, totalSales2025, tableData, grandTotal };
    }, [divisionData, salesMix]);
    
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

    if (!processedData) return <div className="text-center py-10">No data available.</div>;
    
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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white">
                    Division: <span className="text-sky-400">{divisionName}</span>
                </h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    Back to Dashboard
                </Link>
            </div>
            
            <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700">
                <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-slate-300 table-sortable">
                        <thead className="text-xs uppercase bg-slate-800 sticky top-0 z-20 font-bold">
                            <tr>
                                <th className="p-3 text-slate-400">Department</th>
                                {tableColumns.map(col => {
                                    let colorClass = 'text-sky-300';
                                    if (col.header.includes('2024')) colorClass = 'text-sky-400';
                                    if (col.header.includes('2025')) colorClass = 'text-green-400';
                                    
                                    return (
                                        <th key={col.key} scope="col" className={`p-3 whitespace-nowrap cursor-pointer hover:bg-slate-700 ${colorClass} ${col.isNumeric ? 'text-right' : 'text-left'}`} onClick={() => setSortConfig(c => ({key: col.key, direction: c.key === col.key && c.direction === 'asc' ? 'desc' : 'asc'}))}>
                                            {col.header} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                             {!selectedDepartment && (
                                <tr className="bg-sky-900/60 font-bold text-white sticky top-[41px] z-10 backdrop-blur-sm">
                                    <td className="p-3" colSpan={2}>GRAND TOTAL</td>
                                    {tableColumns.slice(1).map(col => (
                                        <td key={col.key} className={`p-3 text-right`}>
                                            {(() => {
                                                const val = processedData.grandTotal[col.key as keyof typeof processedData.grandTotal];
                                                if (col.key === 'growth') return <GrowthIndicator value={val as number} />;
                                                if (col.key === 'cashPercent2025') return `${(val as number).toFixed(2)}%`;
                                                return formatNumberAbbreviated(val as number);
                                            })()}
                                        </td>
                                    ))}
                                </tr>
                             )}
                            {finalGroupedData.map((group, deptIndex) => (
                                <React.Fragment key={group.departmentName}>
                                    <tr className="bg-slate-700/60 font-bold text-white text-sm">
                                        <td className="p-3" colSpan={2}>{group.departmentName} TOTAL</td>
                                        {tableColumns.slice(1).map(col => (
                                            <td key={col.key} className={`p-3 text-right`}>
                                                {(() => {
                                                    const val = group.total[col.key as keyof typeof group.total];
                                                    if (col.key === 'growth') return <GrowthIndicator value={val as number} />;
                                                    if (col.key === 'cashPercent2025') return `${(val as number).toFixed(2)}%`;
                                                    return formatNumberAbbreviated(val as number);
                                                })()}
                                            </td>
                                        ))}
                                    </tr>
                                    {group.categories.map((row, catIndex) => (
                                        <tr 
                                            key={`${group.departmentName}-${catIndex}`} 
                                            className={`hover:bg-slate-700/50 transition-colors text-sm cursor-pointer ${DEPT_ROW_COLORS[deptIndex % DEPT_ROW_COLORS.length]}`}
                                            onClick={() => handleRowClick(group.departmentName, row.category)}
                                        >
                                           <td className="p-3"></td>
                                           {tableColumns.map(col => (
                                               <td key={col.key} className={`p-3 ${col.isNumeric ? 'text-right font-mono' : ''}`}>
                                                    {(() => {
                                                        const value = row[col.key as keyof typeof row];
                                                        if (col.key === 'growth') return <GrowthIndicator value={value as number} />;
                                                        if (col.isNumeric) return formatNumberAbbreviated(value as number);
                                                        return value;
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