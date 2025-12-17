import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Header from './Header';
import { SalesMix } from '../types';

interface MainLayoutProps {
    onLogout?: () => void;
}

const NavItem: React.FC<{ to: string, children: React.ReactNode }> = ({ to, children }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `px-4 py-2 rounded-lg font-bold transition-colors text-sm sm:text-base ${
                isActive ? 'bg-sky-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50'
            }`
        }
    >
        {children}
    </NavLink>
);

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
    const [salesMix, setSalesMix] = useState<SalesMix>('Total');

    return (
        <div className="container mx-auto max-w-[98%] px-2 sm:px-4 py-4 sm:py-8">
            <Header onLogout={onLogout} salesMix={salesMix} onSalesMixChange={setSalesMix} />
            <nav className="my-6 p-2 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <NavItem to="/">Dashboard</NavItem>
                <NavItem to="/compare">Comparison Hub</NavItem>
            </nav>
            {salesMix !== 'Total' && (
                <div className="mb-4 bg-sky-900/30 border border-sky-700/50 p-3 rounded-lg text-center text-sky-200 text-sm font-semibold animate-pulse">
                    Global View: {salesMix} Sales Only
                </div>
            )}
            <Outlet context={{ salesMix, setSalesMix }} />
        </div>
    );
};

export default MainLayout;