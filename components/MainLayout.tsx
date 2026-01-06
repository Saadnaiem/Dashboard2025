
import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Header from './Header';
import { SalesMix, DataSource } from '../types';

// FIX: Import DataSource from types instead of App as it's a type definition.
// import { DataSource } from '../App';

interface MainLayoutProps {
    onLogout?: () => void;
    dataSource?: DataSource;
}

const NavItem: React.FC<{ to: string, children: React.ReactNode }> = ({ to, children }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${
                isActive 
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20 border border-sky-400/20' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent'
            }`
        }
    >
        {children}
    </NavLink>
);

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout, dataSource = 'None' }) => {
    const [salesMix, setSalesMix] = useState<SalesMix>('Total');

    return (
        <div className="container mx-auto max-w-[98%] px-2 sm:px-4 py-4 sm:py-8">
            <Header onLogout={onLogout} salesMix={salesMix} onSalesMixChange={setSalesMix} dataSource={dataSource} />
            
            <nav className="my-8 p-1.5 bg-slate-900/50 rounded-xl border border-slate-800/80 flex items-center justify-center gap-2 sm:gap-4 flex-wrap shadow-inner backdrop-blur-sm">
                <NavItem to="/">Dashboard Hub</NavItem>
                <NavItem to="/compare">Comparison Lab</NavItem>
            </nav>

            <div className="animate-in fade-in duration-700">
                <Outlet context={{ salesMix, setSalesMix }} />
            </div>

            <footer className="mt-20 pt-8 border-t border-slate-800 text-center pb-10">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Enterprise Sales Intelligence © 2025</p>
            </footer>
        </div>
    );
};

export default MainLayout;
