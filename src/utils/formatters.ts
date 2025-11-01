
import React from 'react';

// For full numbers (counts)
export const formatNumber = (num: number, decimals = 0): string => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    if (num === Infinity) return '∞';
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

// For abbreviated numbers (sales)
export const formatNumberAbbreviated = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export const GrowthIndicator: React.FC<{ value: number, unit?: string, invert?: boolean, className?: string }> = ({ value, unit = '%', invert = false, className = '' }) => {
    const isPositive = !invert ? value >= 0 : value <= 0;
    const color = isPositive ? 'text-green-400' : 'text-rose-400';
    const icon = isPositive ? '▲' : '▼';
    
    if (value === Infinity) {
        // FIX: Replaced JSX with React.createElement to be compatible with a .ts file, resolving "Cannot find name 'div'" and "Cannot find name 'New'".
        return React.createElement('div', { className: `font-bold text-green-400 ${className}` }, '▲ New');
    }
    // FIX: Replaced JSX with React.createElement to be compatible with a .ts file, resolving "Cannot find name 'div'".
    if (isNaN(value)) return React.createElement('div', { className: className || 'text-slate-400' }, '-');
    // FIX: Replaced JSX with React.createElement to be compatible with a .ts file, resolving "Cannot find name 'div'".
    return React.createElement('div', { className: `font-bold ${color} ${className}` }, `${icon} ${Math.abs(value).toFixed(2)}${unit}`);
};
