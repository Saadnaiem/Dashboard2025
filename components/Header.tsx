
import React from 'react';
import { SalesMix, DataSource } from '../types';

interface HeaderProps {
    onLogout?: () => void;
    salesMix?: SalesMix;
    onSalesMixChange?: (mix: SalesMix) => void;
    // FIX: Added dataSource to props to allow dynamic source indication.
    dataSource?: DataSource;
}

const Header: React.FC<HeaderProps> = ({ onLogout, salesMix, onSalesMixChange, dataSource }) => {
    return (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-900/40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Intelligence Hub</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Cloud Ecosystem</span>
                        <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                            {/* FIX: Use dataSource prop if available to show the actual data source. */}
                            {dataSource && dataSource !== 'None' ? dataSource : 'Live Database'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
                {salesMix && onSalesMixChange && (
                    <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 shadow-inner backdrop-blur-sm">
                        <button
                            onClick={() => onSalesMixChange('Total')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${salesMix === 'Total' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            Total
                        </button>
                        <button
                            onClick={() => onSalesMixChange('Cash')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${salesMix === 'Cash' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            Cash
                        </button>
                        <button
                            onClick={() => onSalesMixChange('Credit')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${salesMix === 'Credit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            Credit
                        </button>
                    </div>
                )}

                {onLogout && (
                    <button 
                        onClick={onLogout}
                        className="p-3 bg-slate-900 text-rose-500 font-bold rounded-xl border border-slate-800 hover:bg-rose-500 hover:text-white transition-all shadow-xl group"
                        title="Secure Session Termination"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Header;
