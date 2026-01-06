import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock authentication
        if ((username === 'admin' && password === 'admin') || (username === 'saad' && password === 'ali')) {
            onLogin();
        } else {
            setError('Unauthorized access. Please check your credentials.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 font-sans">
            <div className="w-full max-w-sm p-10 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-sky-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-sky-500/20">
                        <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Intelligence</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Access Control Node</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Operator ID"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm font-bold"
                    />
                    <input
                        type="password"
                        placeholder="Security Key"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm font-bold"
                    />
                    
                    {error && (
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center mt-2">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-sky-600 text-white text-xs font-black uppercase tracking-[0.3em] py-4 rounded-xl shadow-lg hover:bg-sky-500 transition-all mt-4"
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;