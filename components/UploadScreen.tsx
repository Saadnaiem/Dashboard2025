import React, { useState, useCallback } from 'react';

interface UploadScreenProps {
    onFileSelect: (file: File) => void;
    error: string | null;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onFileSelect, error }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];
            if (!file.name.toLowerCase().endsWith('.csv')) {
                alert("Please upload a CSV dataset.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    return (
        <div className="max-w-xl w-full flex flex-col items-center animate-fade-in">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-sky-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-sky-500/20 shadow-xl">
                    <svg className="w-10 h-10 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                </div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Data Gateway</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Inject Enterprise Dataset to Initialize</p>
            </div>

            {error && (
                <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs mb-8 flex items-start gap-3">
                    <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                className={`relative w-full rounded-[2.5rem] p-16 text-center cursor-pointer border-2 border-dashed transition-all duration-300 group
                    ${isDragOver 
                        ? 'border-sky-500 bg-sky-500/5 shadow-2xl' 
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
            >
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv" onChange={(e) => handleFileChange(e.target.files)} />
                <div className="flex flex-col items-center gap-6">
                    <div className="p-4 rounded-2xl bg-slate-800 text-slate-500 transition-colors group-hover:text-sky-400">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-lg font-black text-white break-all px-4">
                            {selectedFile ? selectedFile.name : 'Inject CSV Dataset'}
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                            Drop file or click to browse system
                        </p>
                    </div>
                </div>
            </div>

            <button
                onClick={() => selectedFile && onFileSelect(selectedFile)}
                disabled={!selectedFile}
                className="w-full mt-10 bg-sky-600 text-white text-xs font-black uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl hover:bg-sky-500 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
                Authorize & Analyze
            </button>
        </div>
    );
};

export default UploadScreen;