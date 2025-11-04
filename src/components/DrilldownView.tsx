import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import { RawSalesDataRow, ProcessedData, FilterState, EntitySalesData } from '../types';
import { processSalesData } from '../services/dataProcessor';
import Header from './Header';
import { formatNumberAbbreviated, GrowthIndicator } from '../utils/formatters';

const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaMAAABfCAYAAABaDu4AAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAA9wSURBVHhe7Z3/i9NWAMf7j1rVKn/r/68q8U+1WlUqtapV/1erlKq8W61WXW3l3mq1VlXG9973Y86dc+455+Q7+ZzkZDLJJPN7zsnM5HI5vB0REROJGEiMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBESMBes/";

interface DrilldownViewProps {
    allRawData: RawSalesDataRow[];
    globalFilterOptions?: ProcessedData['filterOptions'];
}

type SortableKeys = keyof EntitySalesData | 'sales2024' | 'sales2025' | 'growth' | 'code' | 'name' | 'contribution2024' | 'contribution2025';

const ContributionCell: React.FC<{ value: number; }> = ({ value }) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return <span className="text-right block">-</span>;
    }
    const percentage = value.toFixed(2);

    return (
        <div className="flex items-center justify-end gap-2 w-full">
            <span>{percentage}%</span>
            <div className="w-16 bg-slate-600 rounded-full h-2.5 flex-shrink-0">
                <div
                    className="bg-sky-500 h-2.5 rounded-full"
                    style={{ width: `${Math.min(value, 100)}%` }}
                    title={`${percentage}%`}
                ></div>
            </div>
        </div>
    );
};


const DrilldownView: React.FC<DrilldownViewProps> = ({ allRawData, globalFilterOptions }) => {
    const { viewType } = useParams<{ viewType: string }>();
    const [searchParams] = useSearchParams();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'sales2025', direction: 'desc' });
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [localFilters, setLocalFilters] = useState<FilterState>({ divisions: [], branches: [], brands: [], items: [] });
    
    const [aiSummary, setAiSummary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const isLostView = viewType === 'lost_brands' || viewType === 'lost_items';
    const isNewView = viewType === 'new_brands' || viewType === 'new_items';

    const globalFilters: FilterState = useMemo(() => ({
        divisions: searchParams.get('divisions')?.split(',') || [],
        branches: searchParams.get('branches')?.split(',') || [],
        brands: searchParams.get('brands')?.split(',') || [],
        items: searchParams.get('items')?.split(',') || [],
    }), [searchParams]);

    const globalSearchTerm = useMemo(() => searchParams.get('search') || '', [searchParams]);

    useEffect(() => {
        setLocalFilters({
            divisions: searchParams.get('divisions_local')?.split(',').filter(Boolean) || [],
            branches: searchParams.get('branches_local')?.split(',').filter(Boolean) || [],
            brands: searchParams.get('brands_local')?.split(',').filter(Boolean) || [],
            items: [],
        });
        setLocalSearchTerm(searchParams.get('search_local') || '');
        setAiSummary('');
        setAiError('');
    }, [searchParams, viewType]);

    const globallyFilteredRawData = useMemo(() => {
        const lowercasedTerm = globalSearchTerm.toLowerCase();
        return allRawData.filter(row => {
            const { divisions, branches, brands, items } = globalFilters;
            const divisionMatch = divisions.length === 0 || divisions.includes(row['DIVISION']);
            const branchMatch = branches.length === 0 || branches.includes(row['BRANCH NAME']);
            const brandMatch = brands.length === 0 || brands.includes(row['BRAND']);
            const itemMatch = items.length === 0 || items.includes(row['ITEM DESCRIPTION']);
            const dropdownMatch = divisionMatch && branchMatch && brandMatch && itemMatch;

            if (!dropdownMatch) return false;

            if (globalSearchTerm) {
                return (
                    (row['DIVISION']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRANCH NAME']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['BRAND']?.toLowerCase().includes(lowercasedTerm)) ||
                    (row['ITEM DESCRIPTION']?.toLowerCase().includes(lowercasedTerm))
                );
            }
            return true;
        });
    }, [allRawData, globalFilters, globalSearchTerm]);

    const processedViewData = useMemo(() => {
        if (globallyFilteredRawData.length === 0) return null;
        return processSalesData(globallyFilteredRawData, globalFilterOptions);
    }, [globallyFilteredRawData, globalFilterOptions]);

    const { title, dataForTable, columns, performanceMetric } = useMemo(() => {
        if (!processedViewData) return { title: 'Loading...', dataForTable: [], columns: [], performanceMetric: null };

        let title = '';
        let data: any[] = [];
        let columns: { key: SortableKeys | 'no'; header: string; isNumeric?: boolean }[] = [];
        let performanceMetric: { title: string, value: number, subtext: string } | null = null;
        
        const totalBranchesInSystem = globalFilterOptions ? globalFilterOptions.branches.length : 40;

        const baseColumns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
            { key: 'name', header: 'Name', isNumeric: false },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
        ];
        
        const itemBaseColumns: { key: SortableKeys; header: string; isNumeric?: boolean }[] = [
            { key: 'code', header: 'Item Code', isNumeric: false },
            { key: 'name', header: 'Item Name', isNumeric: false },
            { key: 'sales2024', header: '2024 Sales', isNumeric: true },
            { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true },
            { key: 'sales2025', header: '2025 Sales', isNumeric: true },
            { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true },
            { key: 'growth', header: 'Growth %', isNumeric: true },
        ];

        const addContribution = (d: any[]) => d.map(row => ({
            ...row,
            contribution2024: processedViewData.totalSales2024 > 0 ? (row.sales2024 / processedViewData.totalSales2024) * 100 : 0,
            contribution2025: processedViewData.totalSales2025 > 0 ? (row.sales2025 / processedViewData.totalSales2025) * 100 : 0,
        }));
        
        const perfRate = (count: number, total: number) => total > 0 ? (count / total) * 100 : 0;
        const hasGlobalContext = globalFilters.divisions.length > 0 || globalFilters.branches.length > 0 || globalFilters.brands.length > 0 || !!globalSearchTerm;

        switch (viewType) {
            case 'divisions':
                title = 'All Divisions'; data = addContribution(processedViewData.salesByDivision); columns = baseColumns; break;
            case 'branches':
                title = 'All Branches'; data = addContribution(processedViewData.salesByBranch); columns = baseColumns;
                performanceMetric = { title: 'Branch Availability %', value: perfRate(processedViewData.branchCount2025, totalBranchesInSystem), subtext: `${processedViewData.branchCount2025} / ${totalBranchesInSystem} Available` };
                break;
            case 'brands':
                title = 'All Brands'; data = addContribution(processedViewData.salesByBrand); columns = baseColumns;
                performanceMetric = { title: 'Brand Performance Rate', value: perfRate(processedViewData.brandCount2025, processedViewData.brandCount2024), subtext: `${processedViewData.brandCount2025} / ${processedViewData.brandCount2024} Active` };
                break;
            case 'items':
                title = 'All Items'; data = addContribution(processedViewData.salesByItem); columns = itemBaseColumns;
                if (hasGlobalContext) {
                    performanceMetric = { 
                        title: 'Item Availability %', 
                        value: perfRate(processedViewData.itemCount2025, processedViewData.itemCount2024), 
                        subtext: `${processedViewData.itemCount2025} / ${processedViewData.itemCount2024} Active` 
                    };
                } else {
                    performanceMetric = { 
                        title: 'Item Availability %', 
                        value: perfRate(processedViewData.itemCount2025, processedViewData.totalUniqueItemCount), 
                        subtext: `${processedViewData.itemCount2025} / ${processedViewData.totalUniqueItemCount} Total Items` 
                    };
                }
                break;
            case 'pareto_branches':
                title = 'Top 20% Branches (Pareto)'; data = addContribution(processedViewData.paretoContributors.branches); columns = baseColumns;
                performanceMetric = { title: 'Top 20% Branches', value: perfRate(data.length, processedViewData.branchCount2025), subtext: `${data.length} / ${processedViewData.branchCount2025} Active Branches` };
                break;
            case 'pareto_brands':
                title = 'Top 20% Brands (Pareto)'; data = addContribution(processedViewData.paretoContributors.brands); columns = baseColumns;
                performanceMetric = { title: 'Top 20% Brands', value: perfRate(data.length, processedViewData.brandCount2025), subtext: `${data.length} / ${processedViewData.brandCount2025} Active Brands` };
                break;
            case 'pareto_items':
                title = 'Top 20% Items (Pareto)'; data = addContribution(processedViewData.paretoContributors.items); columns = itemBaseColumns;
                performanceMetric = { title: 'Top 20% Items', value: perfRate(data.length, processedViewData.itemCount2025), subtext: `${data.length} / ${processedViewData.itemCount2025} Active Items` };
                break;
            case 'new_brands':
                title = 'New Brands in 2025'; data = addContribution(processedViewData.newBrandsList); columns = [{ key: 'name', header: 'Brand Name', isNumeric: false }, { key: 'sales2025', header: '2025 Sales', isNumeric: true }, { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true }]; break;
            case 'lost_brands':
                title = 'Lost Brands from 2024'; data = addContribution(processedViewData.lostBrandsList); columns = [{ key: 'name', header: 'Brand Name', isNumeric: false }, { key: 'sales2024', header: '2024 Sales', isNumeric: true }, { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true }]; break;
            case 'new_items':
                title = 'New Items in 2025'; data = addContribution(processedViewData.newItemsList); columns = [{ key: 'code', header: 'Item Code', isNumeric: false }, { key: 'name', header: 'Item Name', isNumeric: false }, { key: 'sales2025', header: '2025 Sales', isNumeric: true }, { key: 'contribution2025', header: 'Contrib % (2025)', isNumeric: true }];
                performanceMetric = { title: 'New Items %', value: perfRate(data.length, processedViewData.itemCount2025), subtext: `${data.length} / ${processedViewData.itemCount2025} Total Items` };
                break;
            case 'lost_items':
                title = 'Lost Items from 2024'; data = addContribution(processedViewData.lostItemsList); columns = [{ key: 'code', header: 'Item Code', isNumeric: false }, { key: 'name', header: 'Item Name', isNumeric: false }, { key: 'sales2024', header: '2024 Sales', isNumeric: true }, { key: 'contribution2024', header: 'Contrib % (2024)', isNumeric: true }]; break;
            default:
                title = 'Unknown View';
        }
        
        const finalColumns = [{ key: 'no', header: 'No.', isNumeric: false }, ...columns];
        return { title, dataForTable: data, columns: finalColumns, performanceMetric };
    }, [viewType, processedViewData, globalFilterOptions, globalFilters, globalSearchTerm]);

    const finalData = useMemo(() => {
        if (!dataForTable) return [];
        const lowercasedTerm = localSearchTerm.toLowerCase();
        
        const noFiltersApplied = Object.values(localFilters).every((f: string[]) => f.length === 0);

        if (!localSearchTerm && noFiltersApplied) {
            return dataForTable;
        }

        return dataForTable.filter(row => {
            const searchMatch = !localSearchTerm || Object.values(row).some(val => 
                String(val).toLowerCase().includes(lowercasedTerm)
            );

            const filterMatch = true; 

            return searchMatch && filterMatch;
        });
    }, [dataForTable, localSearchTerm, localFilters]);

    const totalRow = useMemo(() => {
        if (!finalData || finalData.length === 0) return null;

        const totalSales2024 = finalData.reduce((acc, row) => acc + (row.sales2024 || 0), 0);
        const totalSales2025 = finalData.reduce((acc, row) => acc + (row.sales2025 || 0), 0);

        const calculateGrowth = (current: number, previous: number) =>
            previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

        return {
            name: `Total (${finalData.length})`,
            code: 'TOTAL',
            sales2024: totalSales2024,
            sales2025: totalSales2025,
            contribution2024: finalData.reduce((acc, row) => acc + (row.contribution2024 || 0), 0),
            contribution2025: finalData.reduce((acc, row) => acc + (row.contribution2025 || 0), 0),
            growth: calculateGrowth(totalSales2025, totalSales2024),
        };
    }, [finalData]);

    const sortedData = useMemo(() => {
        if (!finalData) return [];
        let sortableData = [...finalData];
        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                
                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [finalData, sortConfig]);
    
    const requestSort = (key: SortableKeys | 'no') => {
        if (key === 'no') return;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig(null);
            return;
        }
        setSortConfig({ key, direction });
    };

    const getSortClassName = (key: SortableKeys | 'no') => {
        if (!sortConfig || sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc';
    };

    const getContextString = () => {
        const parts = [];
        if(globalFilters.divisions.length) parts.push(`Division: ${globalFilters.divisions.join(', ')}`);
        if(globalFilters.brands.length) parts.push(`Brand: ${globalFilters.brands.join(', ')}`);
        if(globalFilters.branches.length) parts.push(`Branch: ${globalFilters.branches.join(', ')}`);
        if(globalSearchTerm) parts.push(`Search: "${globalSearchTerm}"`);
        return parts.join(' | ');
    };
    const contextString = getContextString();

    const handleExport = (format: 'pdf' | 'csv') => {
        const doc = new jsPDF() as jsPDF & { autoTable: (options: any) => jsPDF; };
        const exportTitle = `${title}`;
        const exportSubtitle = contextString || 'All Data';

        const head = [columns.map(c => c.header)];

        const totalBodyRow = totalRow ? [columns.map(col => {
            if (col.key === 'no') return 'TOTAL';
            const value = totalRow[col.key as keyof typeof totalRow];
            if (col.key === 'name') return totalRow.name;
            if (col.key === 'code') return totalRow.code;
            if (col.key === 'growth') return value === Infinity ? 'New' : `${value.toFixed(2)}%`;
            if (col.key === 'contribution2024' || col.key === 'contribution2025') return `${value.toFixed(2)}%`;
            if (col.key === 'sales2024' || col.key === 'sales2025') return formatNumberAbbreviated(value);
            return '';
        })] : [];

        const body = sortedData.map((row, index) => {
             return columns.map(col => {
                if (col.key === 'no') return index + 1;
                const value = row[col.key as keyof typeof row];
                if (col.key === 'growth') return value === Infinity ? 'New' : `${value.toFixed(2)}%`;
                if (col.key === 'contribution2024' || col.key === 'contribution2025') return `${value.toFixed(2)}%`;
                if (col.key === 'sales2024' || col.key === 'sales2025') return formatNumberAbbreviated(value);
                return value;
            });
        });

        const finalBody = [...totalBodyRow, ...body];
        const filename = `${title.toLowerCase().replace(/ /g, '_')}_${contextString.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'export'}`;

        if (format === 'pdf') {
            const logoData = logoBase64.split(',')[1];
            doc.addImage(logoData, 'PNG', 14, 10, 60, 14);

            doc.setFontSize(16);
            doc.text(exportTitle, 14, 35);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(exportSubtitle, 14, 41);

            doc.autoTable({
                startY: 45,
                head: head,
                body: finalBody,
                theme: 'striped',
                headStyles: { fillColor: [14, 165, 233] }, // sky-500
            });
            doc.save(`${filename}.pdf`);
        } else {
            const csvContent = Papa.unparse({
                fields: head[0],
                data: finalBody
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleGetAiSummary = async () => {
        if (!process.env.API_KEY) {
            setAiError("API key is not configured.");
            return;
        }

        setIsAiLoading(true);
        setAiSummary('');
        setAiError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const dataForPrompt = sortedData.slice(0, 20).map(row => {
                const { name, sales2024, sales2025, growth } = row;
                return { name, sales2024, sales2025, growth: growth === Infinity ? 'New' : `${growth?.toFixed(1)}%` };
            });

            const prompt = `You are a senior pharmacy business analyst. Based on the following data table for "${title}", provide a concise summary of the top 3-5 key insights and actionable recommendations. The data is pre-filtered with the context: "${contextString || 'None'}". Focus on major growth, decline, and concentration. Format your response in markdown.

            Data (Top 20 rows):
            ${JSON.stringify(dataForPrompt, null, 2)}
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAiSummary(response.text || '');

        } catch (error) {
            console.error("Error fetching AI summary:", error);
            setAiError(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsAiLoading(false);
        }
    };

    if (!processedViewData) {
        return <div className="min-h-screen flex items-center justify-center text-white text-xl">
            <div className="flex flex-col items-center gap-4">
                <svg className="animate-spin h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing View Data...
            </div>
        </div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <Header />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white text-center sm:text-left">{title}</h2>
                <Link to="/" className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg shadow-md hover:bg-sky-700 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg>
                    Back to Dashboard
                </Link>
            </div>
            
             {contextString && (
                <div className="p-4 bg-slate-700/50 rounded-lg text-slate-300 text-center text-sm border border-slate-600">
                    <span className="font-bold">Context:</span> {contextString}
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLostView ? (
                    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                        <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-2">
                            Total Lost Sales (2024)
                        </h3>
                        <div className="text-5xl font-extrabold text-rose-400">
                            {formatNumberAbbreviated(
                                viewType === 'lost_brands' 
                                ? processedViewData.lostEntities.brands.sales2024 
                                : processedViewData.lostEntities.items.sales2024
                            )}
                        </div>
                        <div className="text-sm font-bold text-slate-400 mt-1">
                            {viewType === 'lost_brands' 
                                ? `${processedViewData.lostEntities.brands.percentOfTotal.toFixed(2)}% of 2024 Total`
                                : `${processedViewData.lostEntities.items.percentOfTotal.toFixed(2)}% of 2024 Total`
                            }
                        </div>
                    </div>
                ) : isNewView ? (
                    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                        <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-2">
                            Total New Sales (2025)
                        </h3>
                        <div className="text-5xl font-extrabold text-green-400">
                            {formatNumberAbbreviated(
                                viewType === 'new_brands' 
                                ? processedViewData.newEntities.brands.sales
                                : processedViewData.newEntities.items.sales
                            )}
                        </div>
                         <div className="text-sm font-bold text-slate-400 mt-1">
                            {viewType === 'new_brands' 
                                ? `${processedViewData.newEntities.brands.percentOfTotal.toFixed(2)}% of 2025 Total`
                                : `${processedViewData.newEntities.items.percentOfTotal.toFixed(2)}% of 2025 Total`
                            }
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                        <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-2">Total Sales (2025)</h3>
                        <div className="text-5xl font-extrabold text-green-400">{formatNumberAbbreviated(processedViewData.totalSales2025)}</div>
                        <div className="text-sm font-bold text-slate-400 mt-1">2024: {formatNumberAbbreviated(processedViewData.totalSales2024)}</div>
                        <GrowthIndicator value={processedViewData.salesGrowthPercentage} className="text-2xl mt-2" />
                    </div>
                )}

                {performanceMetric && (
                    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                        <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-2">{performanceMetric.title}</h3>
                        <div className="text-5xl font-extrabold text-green-400">{performanceMetric.value.toFixed(1)}%</div>
                        <div className="text-sm font-bold text-slate-400 mt-1">{performanceMetric.subtext}</div>
                    </div>
                )}
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-4">
                <button 
                    onClick={handleGetAiSummary} 
                    disabled={isAiLoading}
                    className="w-full sm:w-auto self-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                >
                    {isAiLoading ? (
                         <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Generating Insights...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-4z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                            Get AI Summary
                        </>
                    )}
                </button>
                {aiError && <div className="text-center text-red-400 bg-red-900/30 p-3 rounded-lg">{aiError}</div>}
                {aiSummary && <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-600 whitespace-pre-wrap">{aiSummary}</div>}
            </div>

            <div>
                 <div className="p-4 bg-slate-800/50 rounded-t-2xl border-t border-x border-slate-700 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full flex-grow">
                        <input
                            type="text"
                            placeholder={`Search within ${title}...`}
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                         <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            Export CSV
                        </button>
                        <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg shadow-md hover:bg-slate-500 transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>
                            Export PDF
                        </button>
                     </div>
                 </div>
                <div className="overflow-x-auto bg-slate-800/50 p-1 rounded-b-2xl shadow-lg border-b border-x border-slate-700">
                    <table className="w-full text-left text-slate-300 table-sortable table-banded">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-20">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} scope="col" className={`p-3 transition-colors ${col.key !== 'no' ? 'cursor-pointer hover:bg-slate-600/50' : ''} ${col.isNumeric ? 'text-right' : 'text-left'} ${getSortClassName(col.key as SortableKeys)}`} onClick={() => requestSort(col.key as SortableKeys)}>
                                       {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                             {totalRow && (
                                <tr className="bg-sky-900/60 font-bold text-white sticky top-[41px] z-10 backdrop-blur-sm">
                                    {columns.map(col => {
                                        const tdClassName = `p-3 whitespace-nowrap border-b-2 border-slate-600 ${col.isNumeric ? 'text-right' : ''}`;
                                        let content: React.ReactNode = '';
                                        
                                        switch(col.key) {
                                            case 'no': content = ''; break;
                                            case 'name': content = totalRow.name; break;
                                            case 'code': content = totalRow.code; break;
                                            case 'growth': content = <GrowthIndicator value={totalRow.growth} />; break;
                                            case 'contribution2024': content = <ContributionCell value={totalRow.contribution2024} />; break;
                                            case 'contribution2025': content = <ContributionCell value={totalRow.contribution2025} />; break;
                                            case 'sales2024': content = formatNumberAbbreviated(totalRow.sales2024); break;
                                            case 'sales2025': content = formatNumberAbbreviated(totalRow.sales2025); break;
                                            default: content = '';
                                        }

                                        return <td key={`total-${col.key}`} className={tdClassName}>{content}</td>;
                                    })}
                                </tr>
                            )}
                            {sortedData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-800/80 transition-colors text-sm">
                                    {columns.map(col => {
                                        const is2024Col = col.key === 'sales2024' || col.key === 'contribution2024';
                                        const is2025Col = col.key === 'sales2025' || col.key === 'contribution2025';

                                        let yearStyle = '';
                                        if (is2024Col) {
                                            yearStyle = 'font-bold text-lg text-sky-400';
                                        } else if (is2025Col) {
                                            yearStyle = 'font-bold text-lg text-green-400';
                                        }
                                        
                                        const tdClassName = `p-3 whitespace-nowrap ${col.isNumeric ? 'text-right' : ''} ${yearStyle}`;

                                        return (
                                            <td key={col.key} className={tdClassName}>
                                                {(() => {
                                                    if (col.key === 'no') return <div className="text-center w-full">{index + 1}</div>;
                                                    const value = row[col.key as keyof typeof row];
                                                    if (col.key === 'growth') return <GrowthIndicator value={value} />;
                                                    if (col.key === 'contribution2024' || col.key === 'contribution2025') return <ContributionCell value={value} />;
                                                    if (col.key === 'sales2024' || col.key === 'sales2025') return formatNumberAbbreviated(value);
                                                    return value;
                                                })()}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedData.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            No data available for this view.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DrilldownView;