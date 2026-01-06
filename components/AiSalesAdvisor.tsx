import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ProcessedData, SalesMix } from '../types';
import { formatNumberAbbreviated } from '../utils/formatters';

interface AiSalesAdvisorProps {
    data: ProcessedData;
    mix: SalesMix;
}

const AiSalesAdvisor: React.FC<AiSalesAdvisorProps> = ({ data, mix }) => {
    const [insight, setInsight] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generateInsight = async () => {
        if (!process.env.API_KEY) {
            setInsight('AI Analysis Offline: API Key Missing.');
            return;
        }

        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const contextPrompt = `
                Analyze Pharmaceutical Sales Snapshot (${mix}):
                Current: ${formatNumberAbbreviated(data.totalSales2025)}
                Prev: ${formatNumberAbbreviated(data.totalSales2024)}
                Growth: ${data.salesGrowthPercentage.toFixed(1)}%
                Top Div: ${data.topDivision?.name} (${data.topDivision?.growth.toFixed(1)}% growth)
                Provide 3 brief, actionable strategic insights in bullet points.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: contextPrompt,
            });

            // Rule: Access via .text property getter, not a method.
            setInsight(response.text || 'Intelligence stream unavailable.');
        } catch (error) {
            console.error('[AI Advisor] Error:', error);
            setInsight('Strategic Analysis Node: Protocol Fault.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (data) generateInsight();
    }, [data, mix]);

    return (
        <div className="bg-slate-900 rounded-[2rem] p-6 border border-sky-500/10 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center border border-sky-500/20">
                    <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">AI Intelligence</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Gemini Analysis Engine</p>
                </div>
            </div>

            <div className="min-h-[100px] text-slate-300 text-xs leading-relaxed font-medium">
                {isLoading ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-2 bg-slate-800 rounded w-full"></div>
                        <div className="h-2 bg-slate-800 rounded w-11/12"></div>
                        <div className="h-2 bg-slate-800 rounded w-4/5"></div>
                    </div>
                ) : (
                    <div className="whitespace-pre-line">
                        {insight || 'Awaiting telemetry...'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiSalesAdvisor;