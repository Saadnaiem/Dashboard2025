import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

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

const MainLayout: React.FC = () => {
    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-8">
            <nav className="mb-6 p-2 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <NavItem to="/">Dashboard</NavItem>
                <NavItem to="/compare">Comparison Hub</NavItem>
            </nav>
            <Outlet />
        </div>
    );
};

export default MainLayout;