
import { RawSalesDataRow, ProcessedData, ParetoResult, EntitySalesData } from '../types';

export const normalizeRow = (row: Record<string, string>, headers: string[]): RawSalesDataRow => {
    const normalized: { [key: string]: any } = {};
    
    // Header mapping with priority order. 
    // Keys defined earlier in this object take precedence in the loop below.
    const headerMapping: {[key: string]: string} = {
        'DIVISION': 'DIVISION',
        'DEPARTMENT': 'DEPARTMENT',
        'CATEGORY': 'CATEGORY',
        'BRANCH NAME': 'BRANCH NAME',
        
        // Sales Columns
        '2024 TOTAL SALES': 'SALES2024',
        '2024 CASH SALES': 'SALES2024_CASH',
        '2024 CREDIT SALES': 'SALES2024_CREDIT',
        '2025 TOTAL SALES': 'SALES2025',
        '2025 CASH SALES': 'SALES2025_CASH',
        '2025 CREDIT SALES': 'SALES2025_CREDIT',
        'SALES2024': 'SALES2024',
        'SALES2025': 'SALES2025',

        // Entity Attributes (Priority 1: Direct Matches)
        'BRAND': 'BRAND',
        'ITEM DESCRIPTION': 'ITEM DESCRIPTION',
        'ITEM NAME': 'ITEM DESCRIPTION',

        // Entity Attributes (Priority 2: Aliases/Fallbacks)
        'CLASS': 'BRAND',
        'SUBCATEGORY': 'ITEM DESCRIPTION'
    };

    const parseSalesValue = (val: any): number => {
        if (val === null || val === undefined) return 0;
        let str = String(val).trim();
        if (str === "" || str.toLowerCase() === 'n/a' || str === '#n/a') return 0;

        const isNegative = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
        const numericStr = str.replace(/[^0-9.]/g, '');
        const num = parseFloat(numericStr);

        if (isNaN(num)) return 0;

        const result = isNegative ? -Math.abs(num) : Math.abs(num);
        return result === 0 ? 0 : result;
    };

    // Iterate over the normalized keys we want
    for (const [csvHeaderPart, internalKey] of Object.entries(headerMapping)) {
        // Find the actual header in the file that contains our keyword (case insensitive)
        const fileHeader = headers.find(h => h.trim().toUpperCase() === csvHeaderPart);
        
        // Only set if we found the header AND we haven't set this internal key yet
        if (fileHeader && !normalized[internalKey]) {
            let value = row[fileHeader];

            if (internalKey.startsWith('SALES')) {
                normalized[internalKey] = parseSalesValue(value);
            } else {
                 if (typeof value === 'string') {
                    value = value.trim();
                     if (value === '#N/A' || value === 'N/A' || value === '') {
                        value = '';
                    }
                }
                normalized[internalKey] = (typeof value === 'string' ? value.toUpperCase() : value) || '';
            }
        }
    }

    // Fallback logic if specific columns weren't found via mapping
    if (!normalized['BRAND'] && normalized['CLASS']) normalized['BRAND'] = normalized['CLASS'];
    // Redundant but safe check if SUBCATEGORY was picked up as a generic key
    if (!normalized['ITEM DESCRIPTION'] && normalized['SUBCATEGORY']) normalized['ITEM DESCRIPTION'] = normalized['SUBCATEGORY'];
    
    // If Total is 0 but Cash+Credit > 0, fix Total
    const fixTotal = (year: string) => {
        const cash = normalized[`SALES${year}_CASH`] || 0;
        const credit = normalized[`SALES${year}_CREDIT`] || 0;
        const total = normalized[`SALES${year}`] || 0;
        
        if ((cash !== 0 || credit !== 0) && Math.abs(total - (cash + credit)) > 1) {
             normalized[`SALES${year}`] = cash + credit;
        }
        
        // Ensure defaults
        if (!normalized[`SALES${year}_CASH`]) normalized[`SALES${year}_CASH`] = 0;
        if (!normalized[`SALES${year}_CREDIT`]) normalized[`SALES${year}_CREDIT`] = 0;
        if (!normalized[`SALES${year}`]) normalized[`SALES${year}`] = 0;
    };

    fixTotal('2024');
    fixTotal('2025');

    return normalized as RawSalesDataRow;
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
    
    const percentOfSales = (salesFromTop20Percent / totalSales) * 100;

    return {
        result: {
            topCount: count,
            salesPercent: percentOfSales,
            totalSales,
            totalContributors,
            topSales: salesFromTop20Percent
        },
        contributors: topContributors.map(c => c.name)
    };
};

export const processSalesData = (data: RawSalesDataRow[], existingFilterOptions?: ProcessedData['filterOptions']): ProcessedData => {
    if (data.length === 0) return null as any; 

    let totalSales2024 = 0;
    let totalCash2024 = 0;
    let totalCredit2024 = 0;

    let totalSales2025 = 0;
    let totalCash2025 = 0;
    let totalCredit2025 = 0;

    // Helper interface for aggregation
    interface AggregatedStats { 
        s24: number; c24: number; cr24: number; 
        s25: number; c25: number; cr25: number; 
        code?: string;
    }

    const divisions: { [key: string]: AggregatedStats } = {};
    const brands: { [key: string]: AggregatedStats } = {};
    const branches: { [key: string]: AggregatedStats } = {};
    const items: { [key: string]: AggregatedStats } = {};
    
    const distinct = {
        branches24: new Set<string>(), branches25: new Set<string>(),
        brands24: new Set<string>(), brands25: new Set<string>(),
        items24: new Set<string>(), items25: new Set<string>(),
    };

    data.forEach(row => {
        const s24 = row['SALES2024'] || 0;
        const c24 = row['SALES2024_CASH'] || 0;
        const cr24 = row['SALES2024_CREDIT'] || 0;
        
        const s25 = row['SALES2025'] || 0;
        const c25 = row['SALES2025_CASH'] || 0;
        const cr25 = row['SALES2025_CREDIT'] || 0;

        totalSales2024 += s24;
        totalCash2024 += c24;
        totalCredit2024 += cr24;

        totalSales2025 += s25;
        totalCash2025 += c25;
        totalCredit2025 += cr25;

        const aggr = (store: any, key: string, code?: string) => {
            if (key) {
                store[key] = store[key] || { s24: 0, c24: 0, cr24: 0, s25: 0, c25: 0, cr25: 0, code: code || '' };
                store[key].s24 += s24;
                store[key].c24 += c24;
                store[key].cr24 += cr24;
                
                store[key].s25 += s25;
                store[key].c25 += c25;
                store[key].cr25 += cr25;
            }
        };
        
        aggr(divisions, row['DIVISION']);
        aggr(brands, row['BRAND']);
        aggr(branches, row['BRANCH NAME']);
        aggr(items, row['ITEM DESCRIPTION'], row['ITEM CODE']);

        if(row['BRANCH NAME']) {
          if (s24 > 0) distinct.branches24.add(row['BRANCH NAME']);
          if (s25 > 0) distinct.branches25.add(row['BRANCH NAME']);
        }
        if(row['BRAND']) {
          if (s24 > 0) distinct.brands24.add(row['BRAND']);
          if (s25 > 0) distinct.brands25.add(row['BRAND']);
        }
        if(row['ITEM DESCRIPTION']) {
          if (s24 > 0) distinct.items24.add(row['ITEM DESCRIPTION']);
          if (s25 > 0) distinct.items25.add(row['ITEM DESCRIPTION']);
        }
    });

    const calculateGrowth = (current: number, previous: number) => 
        previous === 0 ? (current > 0 ? Infinity : 0) : ((current - previous) / previous) * 100;

    const salesGrowthPercentage = calculateGrowth(totalSales2025, totalSales2024);
    const cashGrowthPercentage = calculateGrowth(totalCash2025, totalCash2024);
    const creditGrowthPercentage = calculateGrowth(totalCredit2025, totalCredit2024);

    const transform = (obj: { [key: string]: AggregatedStats }): EntitySalesData[] => 
        Object.entries(obj).map(([name, stats]) => ({ 
            name, 
            sales2024: stats.s24,
            cash2024: stats.c24,
            credit2024: stats.cr24,
            sales2025: stats.s25,
            cash2025: stats.c25,
            credit2025: stats.cr25,
            growth: calculateGrowth(stats.s25, stats.s24),
            cashGrowth: calculateGrowth(stats.c25, stats.c24),
            creditGrowth: calculateGrowth(stats.cr25, stats.cr24),
            code: stats.code
        }));

    const salesByDivision = transform(divisions).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByBrand = transform(brands).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByItem = transform(items).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByBranch = transform(branches).sort((a,b) => b.sales2025 - a.sales2025);

    const top10Brands = salesByBrand.slice(0, 10);
    const top50Items = salesByItem.slice(0, 50);
    const topDivision = salesByDivision[0] || null;

    // Pareto
    const paretoBranches = calculatePareto(Object.entries(branches).map(([name, data]) => ({ name, sales: data.s25 })));
    const paretoBrands = calculatePareto(Object.entries(brands).map(([name, data]) => ({ name, sales: data.s25 })));
    const paretoItems = calculatePareto(Object.entries(items).map(([name, data]) => ({ name, sales: data.s25 })));
    
    const paretoContributors = {
      branches: salesByBranch.filter(b => paretoBranches.contributors.includes(b.name)),
      brands: salesByBrand.filter(b => paretoBrands.contributors.includes(b.name)),
      items: salesByItem.filter(i => paretoItems.contributors.includes(i.name)),
    };

    // New/Lost entities
    const newBranchNames = [...distinct.branches25].filter(b => !distinct.branches24.has(b));
    const newBranchesSales = newBranchNames.reduce((acc, branchName) => acc + (branches[branchName]?.s25 || 0), 0);
    const newBranches = { 
        count: newBranchNames.length, 
        sales: newBranchesSales,
        percentOfTotal: totalSales2025 > 0 ? (newBranchesSales / totalSales2025) * 100 : 0
    };

    const newBrands = { count: 0, sales: 0 };
    const lostBrands = { count: 0, sales2024: 0 };
    const newBrandsList: EntitySalesData[] = [];
    const lostBrandsList: EntitySalesData[] = [];
    
    // Helper to create entity data for list (simplified transform)
    const createEnt = (name: string, stats: AggregatedStats): EntitySalesData => ({
        name,
        sales2024: stats.s24, cash2024: stats.c24, credit2024: stats.cr24,
        sales2025: stats.s25, cash2025: stats.c25, credit2025: stats.cr25,
        growth: calculateGrowth(stats.s25, stats.s24),
        cashGrowth: calculateGrowth(stats.c25, stats.c24),
        creditGrowth: calculateGrowth(stats.cr25, stats.cr24),
        code: stats.code
    });

    Object.entries(brands).forEach(([key, stats]) => { 
      if(stats.s25 > 0 && stats.s24 === 0) {
        newBrands.count++;
        newBrands.sales += stats.s25;
        newBrandsList.push(createEnt(key, stats));
      }
      if(stats.s24 > 0 && stats.s25 === 0) {
        lostBrands.count++;
        lostBrands.sales2024 += stats.s24;
        lostBrandsList.push(createEnt(key, stats));
      }
    });
    
    const newItems = { count: 0, sales: 0 };
    const lostItems = { count: 0, sales2024: 0 };
    const newItemsList: EntitySalesData[] = [];
    const lostItemsList: EntitySalesData[] = [];

    Object.entries(items).forEach(([key, stats]) => { 
      if(stats.s25 > 0 && stats.s24 === 0) {
        newItems.count++;
        newItems.sales += stats.s25;
        newItemsList.push(createEnt(key, stats));
      }
      if(stats.s24 > 0 && stats.s25 === 0) {
        lostItems.count++;
        lostItems.sales2024 += stats.s24;
        lostItemsList.push(createEnt(key, stats));
      }
    });

    const totalUniqueItemCount = new Set([...distinct.items24, ...distinct.items25]).size;

    return {
        totalSales2024,
        totalCash2024,
        totalCredit2024,
        
        totalSales2025,
        totalCash2025,
        totalCredit2025,
        
        salesGrowthPercentage,
        cashGrowthPercentage,
        creditGrowthPercentage,
        
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
        totalUniqueItemCount,
        pareto: {
            branches: paretoBranches.result,
            brands: paretoBrands.result,
            items: paretoItems.result,
        },
        paretoContributors,
        newEntities: {
            branches: newBranches,
            brands: { ...newBrands, percentOfTotal: totalSales2025 > 0 ? (newBrands.sales/totalSales2025)*100 : 0 },
            items: { ...newItems, percentOfTotal: totalSales2025 > 0 ? (newItems.sales/totalSales2025)*100 : 0 },
        },
        newBrandsList: newBrandsList.sort((a,b) => b.sales2025 - a.sales2025),
        newItemsList: newItemsList.sort((a,b) => b.sales2025 - a.sales2025),
        lostEntities: {
            brands: { ...lostBrands, percentOfTotal: totalSales2024 > 0 ? (lostBrands.sales2024/totalSales2024)*100 : 0 },
            items: { ...lostItems, percentOfTotal: totalSales2024 > 0 ? (lostItems.sales2024/totalSales2024)*100 : 0 },
        },
        lostBrandsList: lostBrandsList.sort((a,b) => b.sales2024 - a.sales2024),
        lostItemsList: lostItemsList.sort((a,b) => b.sales2024 - a.sales2024),
        filterOptions: existingFilterOptions || {
            divisions: [...new Set(data.map(r => r['DIVISION']))].filter(Boolean).sort(),
            departments: [...new Set(data.map(r => r['DEPARTMENT']))].filter(Boolean).sort(),
            categories: [...new Set(data.map(r => r['CATEGORY']))].filter(Boolean).sort(),
            branches: [...new Set(data.map(r => r['BRANCH NAME']))].filter(Boolean).sort(),
            brands: [...new Set(data.map(r => r['BRAND'] || r['CLASS']))].filter(Boolean).sort(),
            items: [...new Set(data.map(r => r['ITEM DESCRIPTION'] || r['SUBCATEGORY']))].filter(Boolean).sort(),
        },
    };
};
