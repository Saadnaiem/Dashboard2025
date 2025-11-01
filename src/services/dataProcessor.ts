import { RawSalesDataRow, ProcessedData, ParetoResult, EntitySalesData } from '../types';

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

                const isNegative = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
                const numericStr = str.replace(/[^0-9.]/g, '');
                const num = parseFloat(numericStr);

                if (isNaN(num)) return 0;

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

const calculatePareto = (salesData: { name: string, sales: number }[]): { result: ParetoResult, contributors: string[] } => {
    const sortedData = salesData.filter(item => item.sales > 0).sort((a, b) => b.sales - a.sales);
    
    const totalContributors = sortedData.length;
    if (totalContributors === 0) return { result: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors: 0 }, contributors: [] };

    const totalSales = sortedData.reduce((acc, item) => acc + item.sales, 0);
    if (totalSales === 0) return { result: { topCount: 0, salesPercent: 0, totalSales: 0, totalContributors }, contributors: [] };

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
            totalContributors
        },
        contributors: topContributors.map(c => c.name)
    };
};

export const processSalesData = (data: RawSalesDataRow[], existingFilterOptions?: ProcessedData['filterOptions']): ProcessedData => {
    if (data.length === 0) return null as any; 

    let totalSales2024 = 0;
    let totalSales2025 = 0;
    const divisions: { [key: string]: { s24: number, s25: number } } = {};
    const brands: { [key: string]: { s24: number, s25: number } } = {};
    const branches: { [key: string]: { s24: number, s25: number } } = {};
    const items: { [key: string]: { s24: number, s25: number, code: string } } = {};
    
    const distinct = {
        branches24: new Set<string>(), branches25: new Set<string>(),
        brands24: new Set<string>(), brands25: new Set<string>(),
        items24: new Set<string>(), items25: new Set<string>(),
    };

    data.forEach(row => {
        const s24 = row['SALES2024'];
        const s25 = row['SALES2025'];
        totalSales2024 += s24;
        totalSales2025 += s25;

        const aggr = (store: any, key: string) => {
            if (key) {
                store[key] = store[key] || { s24: 0, s25: 0 };
                store[key].s24 += s24;
                store[key].s25 += s25;
            }
        };

        const aggrItems = (store: any, key: string, code: string) => {
             if (key) {
                store[key] = store[key] || { s24: 0, s25: 0, code: code || '' };
                store[key].s24 += s24;
                store[key].s25 += s25;
            }
        };
        
        aggr(divisions, row['DIVISION']);
        aggr(brands, row['BRAND']);
        aggr(branches, row['BRANCH NAME']);
        aggrItems(items, row['ITEM DESCRIPTION'], row['ITEM CODE'] || '');

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

    const transform = (obj: { [key: string]: { s24: number, s25: number, code?: string } }): EntitySalesData[] => 
        Object.entries(obj).map(([name, { s24, s25, code }]) => ({ 
            name, 
            sales2024: s24, 
            sales2025: s25,
            growth: calculateGrowth(s25, s24),
            code: code
        }));

    const salesByDivision = transform(divisions).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByBrand = transform(brands).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByItem = transform(items).sort((a,b) => b.sales2025 - a.sales2025);
    const salesByBranch = transform(branches).sort((a,b) => b.sales2025 - a.sales2025);

    const top10Brands = salesByBrand.slice(0, 10).map(({ name, sales2024, sales2025 }) => ({ name, sales2024, sales2025 }));
    const top50Items = salesByItem.slice(0, 50).map(({ name, sales2024, sales2025 }) => ({ name, sales2024, sales2025 }));
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
    const newBrands = { count: 0, sales: 0 };
    const lostBrands = { count: 0, sales2024: 0 };
    const newBrandsList: { name: string; sales2025: number }[] = [];
    const lostBrandsList: { name: string; sales2024: number }[] = [];
    
    Object.entries(brands).forEach(([key, {s24, s25}]) => { 
      if(s25 > 0 && s24 === 0) {
        newBrands.count++;
        newBrands.sales += s25;
        newBrandsList.push({ name: key, sales2025: s25 });
      }
      if(s24 > 0 && s25 === 0) {
        lostBrands.count++;
        lostBrands.sales2024 += s24;
        lostBrandsList.push({ name: key, sales2024: s24 });
      }
    });
    
    const newItems = { count: 0, sales: 0 };
    const lostItems = { count: 0, sales2024: 0 };
    const newItemsList: { name: string; sales2025: number; code: string }[] = [];
    const lostItemsList: { name: string; sales2024: number; code: string }[] = [];

    Object.entries(items).forEach(([key, {s24, s25, code}]) => { 
      if(s25 > 0 && s24 === 0) {
        newItems.count++;
        newItems.sales += s25;
        newItemsList.push({ name: key, sales2025: s25, code });
      }
      if(s24 > 0 && s25 === 0) {
        lostItems.count++;
        lostItems.sales2024 += s24;
        lostItemsList.push({ name: key, sales2024: s24, code });
      }
    });

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
            branches: paretoBranches.result,
            brands: paretoBrands.result,
            items: paretoItems.result,
        },
        paretoContributors,
        newEntities: {
            branches: { count: distinct.branches25.size - distinct.branches24.size, sales: 0, percentOfTotal: 0 },
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
            branches: [...new Set(data.map(r => r['BRANCH NAME']))].filter(Boolean).sort(),
            brands: [...new Set(data.map(r => r['BRAND']))].filter(Boolean).sort(),
        },
    };
};