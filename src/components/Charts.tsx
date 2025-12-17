import React, { useState, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, Sector, LabelList, LegendType } from 'recharts';
import { ProcessedData, FilterState } from '../types';
import { useWindowSize } from '../hooks/useWindowSize';
import { CustomYAxisTick } from './charts/CustomYAxisTick';

const COLORS = {
    green: '#34d399',  // emerald-400
    blue: '#38bdf8',   // sky-400
    red: '#f87171',    // red-400
    violet: '#a78bfa', // violet-400
    slate: '#9ca3af',
    teal: '#2dd4bf',  // teal-400
    cash: '#10b981', // emerald-500
    credit: '#6366f1' // indigo-500
};
const DIVISION_CHART_PALETTE = ['#38bdf8', '#818cf8', '#34d399', '#fb7185', '#facc15'];

const formatNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const finalLabel = label || payload[0].name;
        const itemPayload = payload[0].payload;

        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-4 rounded-lg shadow-xl text-sm font-numeric">
                <p className="font-bold text-white mb-2 text-lg border-b border-slate-700 pb-1">{finalLabel}</p>
                
                {itemPayload.sales2024 !== undefined && itemPayload.sales2025 !== undefined ? (
                    <div className="grid grid-cols-1 gap-y-2">
                        {/* 2024 DATA FIRST */}
                        <div className="flex justify-between items-center text-sky-400 font-bold border-l-4 border-sky-500 pl-2">
                            <span>2024 Total:</span>
                            <span>{formatNumber(itemPayload.sales2024)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sky-400/80 pl-4 text-xs">
                             <span>Cash: {formatNumber(itemPayload.cash2024 || 0)}</span>
                             <span>Credit: {formatNumber(itemPayload.credit2024 || 0)}</span>
                        </div>

                        <div className="border-t border-slate-700 my-1"></div>

                        {/* 2025 DATA SECOND */}
                        <div className="flex justify-between items-center text-green-300 font-bold border-l-4 border-green-500 pl-2">
                            <span>2025 Total:</span>
                            <span>{formatNumber(itemPayload.sales2025)}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-300/80 pl-4 text-xs">
                             <span>Cash: {formatNumber(itemPayload.cash2025 || 0)}</span>
                             <span>Credit: {formatNumber(itemPayload.credit2025 || 0)}</span>
                        </div>

                         {itemPayload.growth !== undefined && (
                             <div className={`mt-2 flex justify-end font-bold text-base ${itemPayload.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 YoY Growth: {itemPayload.growth === Infinity ? 'New' : `${itemPayload.growth.toFixed(1)}%`}
                             </div>
                         )}
                    </div>
                ) : (
                    [...payload].reverse().map((pld: any, index: number) => (
                        <div key={index} className="flex justify-between gap-4 py-1" style={{ color: pld.color || pld.fill }}>
                            <span className="font-bold">{pld.name}:</span>
                            <span>{formatNumber(pld.value)}</span>
                        </div>
                    ))
                )}
            </div>
        );
    }
    return null;
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    if (!payload) return null;
    const { sales2024, sales2025 } = payload;
    const growth = sales2024 === 0 ? (sales2025 > 0 ? Infinity : 0) : ((sales2025 - sales2024) / sales2024) * 100;
    const growthColor = growth >= 0 ? COLORS.green : COLORS.red;
    const growthIcon = growth >= 0 ? '▲' : '▼';
    const growthText = growth === Infinity ? 'New' : `${growthIcon} ${Math.abs(growth).toFixed(1)}%`;

    return (
        <g>
            <text x={cx} y={cy - 35} dy={8} textAnchor="middle" fill={fill} className="text-xl font-extrabold">{payload.name}</text>
            <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#e5e7eb" className="text-base font-numeric font-semibold">
                {`2025: ${formatNumber(payload.sales2025)} (${(percent * 100).toFixed(1)}%)`}
            </text>
            <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill={COLORS.blue} className="text-sm font-numeric font-medium">
                {`2024: ${formatNumber(payload.sales2024)}`}
            </text>
            <text x={cx} y={cy + 40} dy={8} textAnchor="middle" fill={growthColor} className="text-base font-numeric font-bold">{growthText}</text>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
    ) as any; // Cast to fix Recharts type mismatch
};

const renderGrowthLabel = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || width < 20) return null;
    const { growth } = payload;
    let growthText = '', color = '#e5e7eb', bgColor = 'rgba(0, 0, 0, 0.3)';
    if (growth === Infinity) {
        growthText = 'New'; color = '#f0fdf4'; bgColor = 'rgba(34, 197, 94, 0.7)';
    } else if (typeof growth === 'number' && !isNaN(growth)) {
        growthText = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
        if (growth >= 0) { color = '#f0fdf4'; bgColor = 'rgba(34, 197, 94, 0.7)'; }
        else { color = '#fef2f2'; bgColor = 'rgba(244, 63, 94, 0.7)'; }
    } else return null;
    const textWidth = growthText.length * 6.5, padding = 8, rectWidth = textWidth + padding;
    return (
        <g className="font-numeric">
            <rect x={x + width + 5} y={y + (height / 2) - 10} width={rectWidth} height={20} rx={5} ry={5} fill={bgColor} />
            <text x={x + width + 5 + (rectWidth / 2)} y={y + height / 2} dy={4} fill={color} fontSize="11" fontWeight="bold" textAnchor="middle">{growthText}</text>
        </g>
    );
};

const renderLegendText = (value: string) => <span className="text-slate-200 font-bold">{value}</span>;

interface ChartsProps {
    data: ProcessedData;
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 hover:border-sky-500 transition-all ${className}`}>
        <h2 className="text-lg font-bold text-white mb-4 text-center uppercase tracking-wider">{title}</h2>
        {children}
    </div>
);

const Charts: React.FC<ChartsProps> = ({ data, filters, onFilterChange }) => {
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const { width } = useWindowSize();
    const isMobile = width < 768;

    const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
    const onPieLeave = useCallback(() => setActiveIndex(-1), []);

    const handleBarClick = useCallback((filterKey: keyof FilterState, payload: any) => {
        if (payload && payload.name) {
            const value = payload.name;
            const currentFilterValues = filters[filterKey];
            if (Array.isArray(currentFilterValues) && currentFilterValues.length === 1 && currentFilterValues[0] === value) {
                onFilterChange({ ...filters, [filterKey]: [] });
            } else {
                onFilterChange({ ...filters, [filterKey]: [value] });
            }
        }
    }, [onFilterChange, filters]);

    const handleDonutClick = useCallback(() => {
        if (data.salesByDivision && data.salesByDivision[activeIndex]) {
            const divName = data.salesByDivision[activeIndex].name;
            onFilterChange({ ...filters, divisions: filters.divisions.includes(divName) ? [] : [divName] });
        }
    }, [activeIndex, data.salesByDivision, onFilterChange, filters]);
    
    const yearComparisonData = [
        { name: '2024', value: data.totalSales2024, fill: COLORS.blue },
        { name: '2025', value: data.totalSales2025, fill: COLORS.green },
    ];
    
    const yoyGrowth = data.salesGrowthPercentage;
    const growthColor = yoyGrowth >= 0 ? COLORS.green : COLORS.red;
    const growthIcon = yoyGrowth >= 0 ? '▲' : '▼';
    const growthText = yoyGrowth === Infinity ? 'New' : `${growthIcon} ${Math.abs(yoyGrowth).toFixed(1)}%`;

    const legendPayload: Array<{ value: string; type: LegendType; id: string; color: string; }> = [
        { value: '2024', type: 'square', id: '2024', color: COLORS.blue },
        { value: '2025', type: 'square', id: '2025', color: COLORS.green }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Sales Comparison">
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie data={yearComparisonData} cx="50%" cy="50%" innerRadius={100} outerRadius={140} dataKey="value">
                           {yearComparisonData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend payload={legendPayload} formatter={renderLegendText} />
                        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold uppercase" fill="#94a3b8">YoY Growth</text>
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-numeric font-extrabold" fill={growthColor}>{growthText}</text>
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Sales by Division">
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart onMouseLeave={onPieLeave}>
                        <Pie activeIndex={activeIndex} activeShape={renderActiveShape as any} data={data.salesByDivision} cx="50%" cy="50%" innerRadius={100} outerRadius={140} dataKey="sales2025" onMouseEnter={onPieEnter} onClick={handleDonutClick} className="cursor-pointer">
                            {data.salesByDivision.map((_, index) => <Cell key={index} fill={DIVISION_CHART_PALETTE[index % DIVISION_CHART_PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Brands" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart layout="vertical" data={data.top10Brands} margin={{ left: isMobile ? 80 : 120, right: 80, top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" width={isMobile ? 80 : 120} tick={<CustomYAxisTick maxChars={isMobile ? 12 : 25} />} interval={0} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend payload={legendPayload} formatter={renderLegendText} />
                        <Bar dataKey="sales2024" fill={COLORS.blue} onClick={(p) => handleBarClick('brands', p)} />
                        <Bar dataKey="sales2025" fill={COLORS.green} onClick={(p) => handleBarClick('brands', p)}>
                            <LabelList dataKey="growth" content={renderGrowthLabel} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard title="Branch Performance" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={Math.max(400, data.salesByBranch.length * 35)}>
                    <BarChart layout="vertical" data={data.salesByBranch} margin={{ left: isMobile ? 100 : 150, right: 80, top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" width={isMobile ? 100 : 150} tick={<CustomYAxisTick maxChars={isMobile ? 15 : 30} />} interval={0} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend payload={legendPayload} formatter={renderLegendText} />
                        <Bar dataKey="sales2024" fill={COLORS.blue} onClick={(p) => handleBarClick('branches', p)} />
                        <Bar dataKey="sales2025" fill={COLORS.green} onClick={(p) => handleBarClick('branches', p)}>
                            <LabelList dataKey="growth" content={renderGrowthLabel} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
};

export default Charts;