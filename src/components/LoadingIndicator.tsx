
import React from 'react';

interface LoadingIndicatorProps {
    progress: number;
    message: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ progress, message }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-500 border-l-indigo-500 border-b-indigo-500/50 animate-spin rounded-full"></div>
            </div>
            <div className="w-full max-w-md mx-auto bg-slate-700 rounded-full h-4 mt-8 overflow-hidden">
                <div
                    className="bg-indigo-500 h-4 rounded-full text-center text-xs font-bold text-white transition-all duration-300"
                    style={{ width: `${progress}%` }}
                >
                    {progress > 10 && `${progress}%`}
                </div>
            </div>
            <p className="text-slate-300 text-lg mt-4 font-medium tracking-wider">{message}</p>
        </div>
    );
};

export default LoadingIndicator;
