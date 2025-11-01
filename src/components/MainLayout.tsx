import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-8">
            <Outlet />
        </div>
    );
};

export default MainLayout;