// FIX: Moved the AIStudio interface inside the `declare global` block to ensure it's treated as a single global type, resolving the "Subsequent property declarations must have the same type" error.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}

// This empty export is necessary to make this file a module.
export {};
