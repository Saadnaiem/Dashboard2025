
import React, { useState, useCallback } from 'react';

interface UploadScreenProps {
    onFileSelect: (file: File) => void;
    error: string | null;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onFileSelect, error }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            if (files[0].type && !files[0].type.includes('csv')) {
                alert("Please upload a .csv file.");
                return;
            }
            setSelectedFile(files[0]);
        }
    };

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-6">
                <h1 className="text-4xl font-extrabold text-white mb-2">Pharmacy Sales Dashboard</h1>
                <p className="text-lg text-slate-300">Upload your sales CSV file to get started.</p>
            </div>

            {error && (
                <div className="w-full bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative w-full rounded-2xl p-8 text-center cursor-pointer border-2 border-dashed transition-all duration-300 ${isDragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 bg-slate-800/20'}`}
            >
                <input
                    type="file"
                    id="csvFileInput"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e.target.files)}
                />

                <div className="flex flex-col items-center justify-center space-y-4">
                    <svg className="w-16 h-16 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    
                    <p className="text-xl font-semibold text-white break-words">
                        {selectedFile ? selectedFile.name : 'Drag & drop your CSV file here'}
                    </p>
                    <p className="text-slate-400">or click to browse</p>
                    <p className="text-xs text-slate-500 mt-2 text-center">Required columns: DIVISION, SALES2024, SALES2025, BRANCH NAME, BRAND, ITEM DESCRIPTION</p>
                </div>
            </div>

            <button
                onClick={() => selectedFile && onFileSelect(selectedFile)}
                className="w-full mt-6 bg-indigo-600 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedFile}
            >
                Load Dashboard
            </button>
        </div>
    );
};

export default UploadScreen;
