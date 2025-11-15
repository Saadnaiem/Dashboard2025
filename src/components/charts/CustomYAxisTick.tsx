import React from 'react';

export const CustomYAxisTick: React.FC<any> = ({ x, y, payload, maxChars }) => {
    const value = payload.value as string;

    if (!value) return null;

    const truncatedValue = value.length > maxChars ? `${value.substring(0, maxChars)}...` : value;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={4} textAnchor="end" fill="white" fontSize={12} fontWeight="bold">
                <title>{value}</title>
                {truncatedValue}
            </text>
        </g>
    );
};
