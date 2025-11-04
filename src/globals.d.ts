// FIX: Defined the AIStudio interface to resolve the type conflict with existing global declarations for window.aistudio.
interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
}

declare global {
    interface Window {
        aistudio?: AIStudio;
    }
}

// This empty export is necessary to make this file a module.
export {};
