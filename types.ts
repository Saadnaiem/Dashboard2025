
export interface RawSalesDataRow {
    [key: string]: any;
    'DIVISION': string;
    'DEPARTMENT'?: string;
    'SALES2024': number;
    'SALES2025': number;
    'BRANCH CODE'?: string;
    'BRANCH NAME': string;
    'CATEGORY'?: string;
    'BRAND': string;
    'ITEM CODE'?: string;
    'ITEM DESCRIPTION': string;
}

export interface ParetoResult {
    topCount: number;
    salesPercent: number;
    totalSales: number;
    totalContributors: number;
}

export interface ProcessedData {
    totalSales2024: number;
    totalSales2025: number;
    salesGrowthPercentage: number;
    
    salesByDivision: { name: string; sales2024: number; sales2025: number }[];
    salesByBrand: { name: string; sales2024: number; sales2025: number }[];
    salesByBranch: { name: string; sales2024: number; sales2025: number; growth: number }[];
    
    top10Brands: { name: string; sales2024: number; sales2025: number }[];
    top50Items: { name: string; sales2024: number; sales2025: number }[];

    branchCount2024: number;
    branchCount2025: number;
    brandCount2024: number;
    brandCount2025: number;
    itemCount2024: number;
    itemCount2025: number;

    topDivision: { name: string; sales2024: number; sales2025: number; growth: number; } | null;

    pareto: {
        branches: ParetoResult;
        brands: ParetoResult;
        items: ParetoResult;
    };
    
    newEntities: {
        branches: { count: number; sales: number; percentOfTotal: number };
        brands: { count: number; sales: number; percentOfTotal: number };
        items: { count: number; sales: number; percentOfTotal: number };
    };

    lostEntities: {
        brands: { count: number; sales2024: number; percentOfTotal: number };
        items: { count: number; sales2024: number; percentOfTotal: number };
    };

    filterOptions: {
        divisions: string[];
        branches: string[];
        brands: string[];
    };
}

export interface FilterState {
    divisions: string[];
    branches: string[];
    brands: string[];
    items: string[];
}