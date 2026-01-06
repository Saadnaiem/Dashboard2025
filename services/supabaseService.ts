import { RawSalesDataRow, SupabaseConfig } from '../types';
import { normalizeRow } from './dataProcessor';

const SUPABASE_CONFIG: SupabaseConfig = {
    url: 'https://xggnxnlcfhvpfsgxclxj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZ254bmxjZmh2cGZzZ3hjbHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTIzOTAsImV4cCI6MjA4MjE2ODM5MH0.hrITkxFBhOrNG6KFMkmj_tkxjTZpYaEvftb5sKDi6Is',
    tableName: 'Sales2025Total'
};

/**
 * Manually test the Supabase connection. 
 * Can be called from the browser console as: window.testSupabase()
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
    console.group("%c[Supabase Connection Test]", "color: #10b981; font-weight: bold;");
    const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.tableName}?select=*&limit=1`;
    
    try {
        console.log("Testing endpoint:", endpoint);
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("HTTP Status:", response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log("%c✅ CONNECTION SUCCESSFUL", "color: #34d399; font-weight: bold;");
            console.log("Total rows found in sample:", data.length);
            console.groupEnd();
            return true;
        } else {
            const errorText = await response.text();
            console.error("%c❌ CONNECTION FAILED", "color: #f43f5e; font-weight: bold;");
            console.error("Server Error:", errorText);
            console.groupEnd();
            return false;
        }
    } catch (e) {
        console.error("%c❌ NETWORK ERROR", "color: #f43f5e; font-weight: bold;");
        console.error(e);
        console.groupEnd();
        return false;
    }
};

// Expose to window for console testing
(window as any).testSupabase = testSupabaseConnection;

export const fetchSalesFromSupabase = async (config: Partial<SupabaseConfig> = {}): Promise<RawSalesDataRow[]> => {
    const finalConfig = { ...SUPABASE_CONFIG, ...config };

    try {
        const endpoint = `${finalConfig.url}/rest/v1/${finalConfig.tableName}?select=*`;
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'apikey': finalConfig.anonKey,
                'Authorization': `Bearer ${finalConfig.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Supabase Reject: ${response.status} ${err}`);
        }

        const rawRows: any[] = await response.json();
        
        if (!rawRows || rawRows.length === 0) {
            console.warn("[Supabase] Empty dataset returned.");
            return [];
        }

        const headers = Object.keys(rawRows[0]).map(h => h.trim().toUpperCase());
        return rawRows.map(row => normalizeRow(row, headers));
    } catch (error: any) {
        console.error("[Supabase] Fetch Exception:", error);
        throw error;
    }
};