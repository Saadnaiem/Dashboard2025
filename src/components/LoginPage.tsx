import React, { useState } from 'react';
import { logoBase64 } from '../assets/logo';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Simple hardcoded authentication
        if (username === 'admin' && password === 'password') {
            onLogin();
        } else {
            setError('Invalid username or password.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                       <img src={logoBase64} alt="Dr Sulaiman Al Habib Pharmacy Logo" className="w-80" />
                    </div>
                    <p className="text-slate-400">Please sign in to continue</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            className="w-full px-4 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                    <div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-4 py-2 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                    
                    {error && (
                         <div className="text-sm text-red-400 bg-red-900/30 border border-red-700 p-3 rounded-md text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all"
                        >
                            Sign in
                        </button>
                    </div>
                </form>
                <div className="text-center pt-4 border-t border-slate-700">
                    <p className="font-bold text-white text-sm">© 2025 Prepared by Dr. Saad Naiem Ali</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
