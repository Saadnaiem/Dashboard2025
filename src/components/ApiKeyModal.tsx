import React, { useState } from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
    const [apiKey, setApiKey] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSave = () => {
        if (apiKey.trim()) {
            onSave(apiKey.trim());
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md m-4 transform transition-all">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-white text-center" id="modal-title">
                        Enter Gemini API Key
                    </h3>
                    <div className="mt-4">
                        <p className="text-sm text-slate-400 text-center">
                            An API key is required to use the AI Summary feature. You can get your key from Google AI Studio.
                        </p>
                        <a 
                            href="https://ai.google.dev/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block text-center text-sky-400 hover:text-sky-300 text-sm mt-1"
                        >
                            Get an API Key
                        </a>
                    </div>
                    <div className="mt-6">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste your API key here"
                            className="w-full px-4 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="bg-slate-700/50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-4 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-800 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save & Continue
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-800 text-base font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
