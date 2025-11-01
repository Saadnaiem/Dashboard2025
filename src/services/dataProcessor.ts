
import { RawSalesDataRow, ProcessedData, ParetoResult } from '../types';

export const normalizeRow = (row: Record<string, string>, headers: string[]): RawSalesDataRow => {
    const normalized: { [key: string]: any } = {};
    const allPossibleHeaders = ['DIVISION', 'DEPARTMENT', 'SALES2024', 'SALES2025', 'BRANCH CODE', 'BRANCH NAME', 'CATEGORY', 'BRAND', 'ITEM CODE', 'ITEM DESCRIPTION'];
    
    for (const header of allPossibleHeaders) {
        const fileHeader = headers.find(h => h.trim().toUpperCase() === header);
        let value = fileHeader ? row[fileHeader] : undefined;

        if (typeof value === 'string') {
            value = value.trim();
             if (value === '#N/A' || value === 'N/A' || value === '') {
                value = header.startsWith('SALES') ? '0' : '';
            }
        }
        
        if (header.startsWith('SALES')) {
            const parseSalesValue = (val: any): number => {
                if (val === null || val === undefined) return 0;
                let str = String(val).trim();
                if (str === "" || str.toLowerCase() === 'n/a' || str === '#n/a') return 0;

                // Determine if the number is negative from various accounting formats
                const isNegative = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
                
                // Remove all non-digit characters except for the decimal point
                const numericStr = str.replace(/[^0-9.]/g, '');

                const num = parseFloat(numericStr);

                if (isNaN(num)) {
                    return 0;
                }

                // Apply the sign and ensure we don't create -0
                const result = isNegative ? -Math.abs(num) : Math.abs(num);
                return result === 0 ? 0 : result;
            };
            normalized[header] = parseSalesValue(value);
        } else {
            normalized[header] = (typeof value === 'string' ? value.toUpperCase() : value) || '';
        }
    }

    return normalized as RawSalesDataRow;
};

const calculatePareto = (salesData: { [key: string]: number }): ParetoResult => {
    const sortedData = Object.entries(salesData)
        .map(([name, sales]) => ({ name, sales }))
        .filter(item => item.sales > 0)
        .sort((a, b) => b.sales - a.sales);

    const totalContributors = sortedData.length;
    if (totalContributors === 0) {
        return { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0 };
    }

    const totalSales = sortedData.reduce((acc, item) => acc + item.sales, 0);
    if (totalSales === 0) {
        return { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors };
    }

    const top20PercentCount = Math.max(1, Math.ceil(totalContributors * 0.20));
    const count = Math.min(top20PercentCount, totalContributors);
    let salesFromTop20Percent = 0;
    for (let i = 0; i < count; i++) {
        salesFromTop20Percent += sortedData[i].sales;
    }

    const percentOfSales = (salesFromTop20Percent / totalSales) * 100;

    return {
        topCount: count,
        salesPercent: percentOfSales,
        totalSales,
        totalContributors
    };
};

export const processSalesData = (data: RawSalesDataRow[], existingFilterOptions?: ProcessedData['filterOptions']): ProcessedData => {
    if (data.length === 0) {
        // This case is handled in App.tsx by createEmptyProcessedData, but as a safeguard:
        return null as any; 
    }

    let totalSales2024 = 0;
    let totalSales2025 = 0;
    const divisions: { [key: string]: { s24: number, s25: number } } = {};
    const brands: { [key: string]: { s24: number, s25: number } } = {};
    const branches: { [key: string]: { s24: number, s25: number } } = {};
    const items: { [key: string]: { s24: number, s25: number } } = {};
    
    const distinct = {
        branches24: new Set<string>(), branches25: new Set<string>(),
        brands24: new Set<string>(), brands25: new Set<string>(),
        items24: new Set<string>(), items25: new Set<string>(),
    };

    data.forEach(row => {
        const s24 = row['SALES2024'];
        const s25 = row['SALES2025'];
        const div = row['DIVISION'];
        const brand = row['BRAND'];
        const branch = row['BRANCH NAME'];
        const item = row['ITEM DESCRIPTION'];

        totalSales2024 += s24;
        totalSales2025 += s25;

        if (div) {
            divisions[div] = divisions[div] || { s24: 0, s25: 0 };
            divisions[div].s24 += s24;
            divisions[div].s25 += s25;
        }
        if (brand) {
            brands[brand] = brands[brand] || { s24: 0, s25: 0 };
            brands[brand].s24 += s24;
            brands[brand].s25 += s25;
            if (s24 > 0) distinct.brands24.add(brand);
            if (s25 > 0) distinct.brands25.add(brand);
        }
        if (branch) {
            branches[branch] = branches[branch] || { s24: 0, s25: 0 };
            branches[branch].s24 += s24;
            branches[branch].s25 += s25;
            if (s24 > 0) distinct.branches24.add(branch);
            if (s25 > 0) distinct.branches25.add(branch);
        }
        if (item) {
            items[item] = items[item] || { s24: 0, s25: 0 };
            items[item].s24 += s24;
            items[item].s25 += s25;
            if (s24 > 0) distinct.items24.add(item);
            if (s25 > 0) distinct.items25.add(item);
        }
    });

    const calculateGrowth = (current: number, previous: number) => 
        previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

    const salesGrowthPercentage = calculateGrowth(totalSales2025, totalSales2024);

    const transform = (obj: { [key: string]: { s24: number, s25: number } }) => 
        Object.entries(obj).map(([name, { s24, s25 }]) => ({ name, sales2024: s24, sales2025: s25 }));

    const salesByDivision = transform(divisions).sort((a,b) => b.sales2025 - a.sales2025);
    
    const salesByBrand = transform(brands)
        .map(d => ({ ...d, growth: calculateGrowth(d.sales2025, d.sales2024) }))
        .sort((a,b) => b.sales2025 - a.sales2025);

    const salesByItem = transform(items)
        .map(d => ({ ...d, growth: calculateGrowth(d.sales2025, d.sales2024) }))
        .sort((a,b) => b.sales2025 - a.sales2025);

    const salesByBranch = Object.entries(branches).map(([name, { s24, s25 }]) => ({
        name, 
        sales2024: s24, 
        sales2025: s25,
        growth: calculateGrowth(s25, s24)
    })).sort((a,b) => b.sales2025 - a.sales2025);

    const top10Brands = salesByBrand.slice(0, 10);
    const top50Items = salesByItem.slice(0, 50);
    const topDivisionEntry = salesByDivision[0];
    const topDivision = topDivisionEntry ? {
        ...topDivisionEntry,
        growth: calculateGrowth(topDivisionEntry.sales2025, topDivisionEntry.sales2024)
    } : null;
    
    // New/Lost entities
    const newBranches = { count: 0, sales: 0 };
    Object.entries(branches).forEach(([_key, {s24, s25}]) => { if(s25 > 0 && s24 === 0) { newBranches.count++; newBranches.sales += s25; }});
    
    const newBrands = { count: 0, sales: 0 };
    const lostBrands = { count: 0, sales2024: 0 };
    Object.entries(brands).forEach(([_key, {s24, s25}]) => { 
      if(s25 > 0 && s24 === 0) { newBrands.count++; newBrands.sales += s25; }
      if(s24 > 0 && s25 === 0) { lostBrands.count++; lostBrands.sales2024 += s24; }
    });
    
    const newItems = { count: 0, sales: 0 };
    const lostItems = { count: 0, sales2024: 0 };
    Object.entries(items).forEach(([_key, {s24, s25}]) => { 
      if(s25 > 0 && s24 === 0) { newItems.count++; newItems.sales += s25; }
      if(s24 > 0 && s25 === 0) { lostItems.count++; lostItems.sales2024 += s24; }
    });
    
    const getSalesData = (obj: {[key: string]: {s24: number, s25: number}}) => 
      Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, val.s25]));

    return {
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
        branchCount2024: distinct.branches24.size,
        branchCount2025: distinct.branches25.size,
        brandCount2024: distinct.brands24.size,
        brandCount2025: distinct.brands25.size,
        itemCount2024: distinct.items24.size,
        itemCount2025: distinct.items25.size,
        pareto: {
            branches: calculatePareto(getSalesData(branches)),
            brands: calculatePareto(getSalesData(brands)),
            items: calculatePareto(getSalesData(items)),
        },
        newEntities: {
            branches: { ...newBranches, percentOfTotal: totalSales2025 > 0 ? (newBranches.sales/totalSales2025)*100 : 0 },
            brands: { ...newBrands, percentOfTotal: totalSales2025 > 0 ? (newBrands.sales/totalSales2025)*100 : 0 },
            items: { ...newItems, percentOfTotal: totalSales2025 > 0 ? (newItems.sales/totalSales2025)*100 : 0 },
        },
        lostEntities: {
            brands: { ...lostBrands, percentOfTotal: totalSales2024 > 0 ? (lostBrands.sales2024/totalSales2024)*100 : 0 },
            items: { ...lostItems, percentOfTotal: totalSales2024 > 0 ? (lostItems.sales2024/totalSales2024)*100 : 0 },
        },
        filterOptions: existingFilterOptions || {
            divisions: [...new Set(data.map(r => r['DIVISION']))].filter(Boolean).sort(),
            branches: [...new Set(data.map(r => r['BRANCH NAME']))].filter(Boolean).sort(),
            brands: [...new Set(data.map(r => r['BRAND']))].filter(Boolean).sort(),
        },
    };
};
