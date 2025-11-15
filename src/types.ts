// FIX: Removed self-import which caused a conflict with the local declaration.
export interface RawSalesDataRow {
    [key: string]: any;
    'DIVISION': string;
    'DEPARTMENT': string;
    'SALES2024': number;
    'SALES2025': number;
    'BRANCH CODE': string;
    'BRANCH NAME': string;
    'CATEGORY': string;
    'BRAND': string;
    'ITEM CODE': string;
    'ITEM DESCRIPTION': string;
}

export interface ParetoResult {
    topCount: number;
    salesPercent: number;
    totalSales: number;
    totalContributors: number;
    topSales: number;
}

export interface EntitySalesData {
    name: string;
    sales2024: number;
    sales2025: number;
    growth: number;
    code?: string;
}

export interface ProcessedData {
    totalSales2024: number;
    totalSales2025: number;
    salesGrowthPercentage: number;
    
    salesByDivision: EntitySalesData[];
    salesByBrand: EntitySalesData[];
    salesByBranch: EntitySalesData[];
    salesByItem: EntitySalesData[];
    
    top10Brands: { name: string; sales2024: number; sales2025: number }[];
    top50Items: { name: string; sales2024: number; sales2025: number }[];

    branchCount2024: number;
    branchCount2025: number;
    brandCount2024: number;
    brandCount2025: number;
    itemCount2024: number;
    itemCount2025: number;
    totalUniqueItemCount: number;

    topDivision: { name: string; sales2024: number; sales2025: number; growth: number; } | null;

    pareto: {
        branches: ParetoResult;
        brands: ParetoResult;
        items: ParetoResult;
    };
    
    paretoContributors: {
        branches: EntitySalesData[];
        brands: EntitySalesData[];
        items: EntitySalesData[];
    };
    
    newEntities: {
        branches: { count: number; sales: number; percentOfTotal: number };
        // FIX: Changed literal type `0` to `number` for `sales` and `percentOfTotal` to allow assignment of calculated numeric values.
        brands: { count: number; sales: number; percentOfTotal: number };
        // FIX: Changed literal type `0` to `number` for `sales` and `percentOfTotal` to allow assignment of calculated numeric values.
        items: { count: number; sales: number; percentOfTotal: number };
    };

    newBrandsList: { name: string; sales2025: number }[];
    newItemsList: { name: string; sales2025: number; code: string }[];

    lostEntities: {
        brands: { count: number; sales2024: number; percentOfTotal: number };
        items: { count: number; sales2024: number; percentOfTotal: number };
    };

    lostBrandsList: { name: string; sales2024: number }[];
    lostItemsList: { name: string; sales2024: number; code: string }[];

    filterOptions: {
        divisions: string[];
        departments: string[];
        categories: string[];
        branches: string[];
        brands: string[];
        items: string[];
    };
}

export interface FilterState {
    divisions: string[];
    departments: string[];
    categories: string[];
    branches: string[];
    brands: string[];
    items: string[];
}