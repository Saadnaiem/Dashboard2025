import { RawSalesDataRow, ProcessedData, ParetoResult, EntitySalesData, SalesMix } from '../types';

export const normalizeRow = (row: Record<string, any>, headers: string[]): RawSalesDataRow => {
    const normalized: { [key: string]: any } = {};
    
    // Exact mapping provided by the user for this specific dataset
    const headerMapping: {[key: string]: string} = {
        '2024 TOTAL SALES': 'SALES2024',
        '2024 CASH SALES': 'SALES2024_CASH',
        '2024 CREDIT SALES': 'SALES2024_CREDIT',
        '2025 TOTAL SALES': 'SALES2025',
        '2025 CASH SALES': 'SALES2025_CASH',
        '2025 CREDIT SALES': 'SALES2025_CREDIT',
        'DIVISION': 'DIVISION',
        'DEPARTMENT': 'DEPARTMENT',
        'CATEGORY': 'CATEGORY',
        'SUBCATEGORY': 'ITEM DESCRIPTION', // Map Subcategory to Description
        'CLASS': 'BRAND',                // Map Class to Brand
        'BRAND': 'BRAND',
        'BRANCH CODE': 'BRANCH CODE',
        'BRANCH NAME': 'BRANCH NAME',
        'ITEM CODE': 'ITEM CODE',
        'ITEM DESCRIPTION': 'ITEM DESCRIPTION'
    };

    const parseSalesValue = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        let str = String(val).trim();
        if (str === "" || str.toLowerCase() === 'n/a' || str === '#n/a') return 0;

        // Handle parentheses for negative numbers e.g. (1,234.50)
        const isNegative = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
        const numericStr = str.replace(/[^0-9.]/g, '');
        const num = parseFloat(numericStr);
        if (isNaN(num)) return 0;
        return isNegative ? -Math.abs(num) : Math.abs(num);
    };

    // Mapping pass with robustness for CSV variations
    Object.entries(headerMapping).forEach(([rawKey, internalKey]) => {
        // Find header in file that matches rawKey (case-insensitive trim)
        const fileHeader = headers.find(h => h.trim().toUpperCase() === rawKey) || 
                         (row[rawKey] !== undefined ? rawKey : null);
        
        if (fileHeader) {
            const value = row[fileHeader];
            if (internalKey.startsWith('SALES')) {
                normalized[internalKey] = parseSalesValue(value);
            } else {
                normalized[internalKey] = (typeof value === 'string' ? value.trim().toUpperCase() : value) || '';
            }
        }
    });

    // Ensure all numeric fields are initialized to 0 if missing
    ['SALES2024', 'SALES2024_CASH', 'SALES2024_CREDIT', 'SALES2025', 'SALES2025_CASH', 'SALES2025_CREDIT'].forEach(k => {
        if (normalized[k] === undefined) normalized[k] = 0;
    });

    return normalized as RawSalesDataRow;
};

export const getSalesValue = (row: RawSalesDataRow, year: '2024' | '2025', mix: SalesMix): number => {
    if (mix === 'Cash') return row[`SALES${year}_CASH`] || 0;
    if (mix === 'Credit') return row[`SALES${year}_CREDIT`] || 0;
    return row[`SALES${year}`] || 0;
};

export const calculatePareto = (salesData: { name: string, sales: number }[]): { result: ParetoResult, contributors: string[] } => {
    const sortedData = salesData.filter(item => item.sales > 0).sort((a, b) => b.sales - a.sales);
    const totalContributors = sortedData.length;
    if (totalContributors === 0) return { result: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0, topSales: 0 }, contributors: [] };
    const totalSales = sortedData.reduce((acc, item) => acc + item.sales, 0);
    if (totalSales === 0) return { result: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors, topSales: 0 }, contributors: [] };
    const top20PercentCount = Math.max(1, Math.ceil(totalContributors * 0.20));
    const count = Math.min(top20PercentCount, totalContributors);
    const topContributors = sortedData.slice(0, count);
    const salesFromTop20Percent = topContributors.reduce((acc, item) => acc + item.sales, 0);
    return {
        result: { topCount: count, salesPercent: (salesFromTop20Percent / totalSales) * 100, totalSales, totalContributors, topSales: salesFromTop20Percent },
        contributors: topContributors.map(c => c.name)
    };
};

export const processSalesData = (data: RawSalesDataRow[], existingFilterOptions?: ProcessedData['filterOptions']): ProcessedData => {
    if (data.length === 0) return null as any; 

    let totalS24 = 0, totalC24 = 0, totalCr24 = 0;
    let totalS25 = 0, totalC25 = 0, totalCr25 = 0;

    const divisions: Record<string, any> = {};
    const brands: Record<string, any> = {};
    const branches: Record<string, any> = {};
    const items: Record<string, any> = {};
    
    const distinct = {
        branches24: new Set<string>(), branches25: new Set<string>(),
        brands24: new Set<string>(), brands25: new Set<string>(),
        items24: new Set<string>(), items25: new Set<string>(),
    };

    data.forEach(row => {
        const s24 = row['SALES2024'], c24 = row['SALES2024_CASH'], cr24 = row['SALES2024_CREDIT'];
        const s25 = row['SALES2025'], c25 = row['SALES2025_CASH'], cr25 = row['SALES2025_CREDIT'];

        totalS24 += s24; totalC24 += c24; totalCr24 += cr24;
        totalS25 += s25; totalC25 += c25; totalCr25 += cr25;

        const aggr = (store: any, key: string, code?: string) => {
            if (!key) return;
            store[key] = store[key] || { s24: 0, c24: 0, cr24: 0, s25: 0, c25: 0, cr25: 0, code: '' };
            store[key].s24 += s24; store[key].c24 += c24; store[key].cr24 += cr24;
            store[key].s25 += s25; store[key].c25 += c25; store[key].cr25 += cr25;
            if (code) store[key].code = code;
        };
        
        aggr(divisions, row['DIVISION']);
        aggr(brands, row['BRAND']);
        aggr(branches, row['BRANCH NAME']);
        aggr(items, row['ITEM DESCRIPTION'], row['ITEM CODE']);

        if(row['BRANCH NAME']) { if (s24 > 0) distinct.branches24.add(row['BRANCH NAME']); if (s25 > 0) distinct.branches25.add(row['BRANCH NAME']); }
        if(row['BRAND']) { if (s24 > 0) distinct.brands24.add(row['BRAND']); if (s25 > 0) distinct.brands25.add(row['BRAND']); }
        if(row['ITEM DESCRIPTION']) { if (s24 > 0) distinct.items24.add(row['ITEM DESCRIPTION']); if (s25 > 0) distinct.items25.add(row['ITEM DESCRIPTION']); }
    });

    const calculateGrowth = (current: number, previous: number) => 
        previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

    const transform = (obj: any): EntitySalesData[] => 
        Object.entries(obj).map(([name, s]: [string, any]) => ({ 
            name, 
            sales2024: s.s24, cash2024: s.c24, credit2024: s.cr24,
            sales2025: s.s25, cash2025: s.c25, credit2025: s.cr25,
            growth: calculateGrowth(s.s25, s.s24),
            cashGrowth: calculateGrowth(s.c25, s.c24),
            creditGrowth: calculateGrowth(s.cr25, s.cr24),
            code: s.code 
        }));

    const salesByDivision = transform(divisions).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByBrand = transform(brands).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByItem = transform(items).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByBranch = transform(branches).sort((a,b) => b.sales2025 - a.sales2025);

    return {
        totalSales2024: totalS24, totalCash2024: totalC24, totalCredit2024: totalCr24,
        totalSales2025: totalS25, totalCash2025: totalC25, totalCredit2025: totalCr25,
        salesGrowthPercentage: calculateGrowth(totalS25, totalS24),
        cashGrowthPercentage: calculateGrowth(totalC25, totalC24),
        creditGrowthPercentage: calculateGrowth(totalCr25, totalCr24),
        salesByDivision, salesByBrand, salesByBranch, salesByItem,
        top10Brands: salesByBrand.slice(0, 10), top50Items: salesByItem.slice(0, 50), topDivision: salesByDivision[0] || null,
        branchCount2024: distinct.branches24.size, branchCount2025: distinct.branches25.size,
        brandCount2024: distinct.brands24.size, brandCount2025: distinct.brands25.size,
        itemCount2024: distinct.items24.size, itemCount2025: distinct.items25.size,
        totalUniqueItemCount: new Set([...distinct.items24, ...distinct.items25]).size,
        pareto: {
            branches: calculatePareto(salesByBranch.map(b => ({name: b.name, sales: b.sales2025}))).result,
            brands: calculatePareto(salesByBrand.map(b => ({name: b.name, sales: b.sales2025}))).result,
            items: calculatePareto(salesByItem.map(i => ({name: i.name, sales: i.sales2025}))).result,
        },
        newEntities: {
            branches: { count: 0, sales: 0, percentOfTotal: 0 },
            brands: { count: 0, sales: 0, percentOfTotal: 0 },
            items: { count: 0, sales: 0, percentOfTotal: 0 }
        },
        lostEntities: {
            brands: { count: 0, sales2024: 0, percentOfTotal: 0 },
            items: { count: 0, sales2024: 0, percentOfTotal: 0 }
        },
        filterOptions: existingFilterOptions || {
            divisions: [...new Set(data.map(r => r['DIVISION']))].filter(Boolean).sort(),
            departments: [...new Set(data.map(r => r['DEPARTMENT']))].filter(Boolean).sort(),
            categories: [...new Set(data.map(r => r['CATEGORY']))].filter(Boolean).sort(),
            branches: [...new Set(data.map(r => r['BRANCH NAME']))].filter(Boolean).sort(),
            brands: [...new Set(data.map(r => r['BRAND']))].filter(Boolean).sort(),
            items: [...new Set(data.map(r => r['ITEM DESCRIPTION']))].filter(Boolean).sort(),
        },
    } as any;
};