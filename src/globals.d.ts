
// FIX: Augment the NodeJS namespace for process.env instead of redeclaring 'process' to avoid "Cannot redeclare block-scoped variable" conflicts with existing global types.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }

    /**
     * Define process.env for accessing environment variables like API_KEY.
     * As per guidelines, process.env.API_KEY is assumed to be valid and accessible.
     * We augment the NodeJS namespace which is the standard way to type process.env.
     */
    namespace NodeJS {
        interface ProcessEnv {
            API_KEY: string;
            [key: string]: string | undefined;
        }
    }
}

// This empty export is necessary to make this file a module.
export {};
