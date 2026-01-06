
export interface RawSalesDataRow {
    [key: string]: any;
    'DIVISION': string;
    'DEPARTMENT': string;
    'SALES2024': number;
    'SALES2024_CASH': number;
    'SALES2024_CREDIT': number;
    'SALES2025': number;
    'SALES2025_CASH': number;
    'SALES2025_CREDIT': number;
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
    // FIX: Added index signature to allow dynamic property access in charts.
    [key: string]: any;
    name: string;
    sales2024: number;
    cash2024: number;
    credit2024: number;
    sales2025: number;
    cash2025: number;
    credit2025: number;
    growth: number;
    cashGrowth: number;
    creditGrowth: number;
    code?: string;
}

export interface ProcessedData {
    totalSales2024: number;
    totalCash2024: number;
    totalCredit2024: number;
    
    totalSales2025: number;
    totalCash2025: number;
    totalCredit2025: number;

    salesGrowthPercentage: number;
    cashGrowthPercentage: number;
    creditGrowthPercentage: number;
    
    salesByDivision: EntitySalesData[];
    salesByBrand: EntitySalesData[];
    salesByBranch: EntitySalesData[];
    salesByItem: EntitySalesData[];
    
    top10Brands: EntitySalesData[];
    top50Items: EntitySalesData[];

    branchCount2024: number;
    branchCount2025: number;
    brandCount2024: number;
    brandCount2025: number;
    itemCount2024: number;
    itemCount2025: number;
    totalUniqueItemCount: number;

    topDivision: EntitySalesData | null;

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
        brands: { count: number; sales: number; percentOfTotal: number };
        items: { count: number; sales: number; percentOfTotal: number };
    };

    newBrandsList: EntitySalesData[];
    newItemsList: EntitySalesData[];

    lostEntities: {
        brands: { count: number; sales2024: number; percentOfTotal: number };
        items: { count: number; sales2024: number; percentOfTotal: number };
    };

    lostBrandsList: EntitySalesData[];
    lostItemsList: EntitySalesData[];

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

export type SalesMix = 'Total' | 'Cash' | 'Credit';

// FIX: Added DataSource type definition for consistency across the codebase.
export type DataSource = 'Supabase' | 'Google Drive' | 'None';

export interface LayoutContextType {
    salesMix: SalesMix;
    setSalesMix: (mix: SalesMix) => void;
}
