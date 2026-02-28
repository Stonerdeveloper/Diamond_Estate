"use client"

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(error.message);
        } else {
            router.push('/dashboard');
        }
        setLoading(false);
    };

    return (
        <main className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Welcome Back</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'white'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'white'
                            }}
                        />
                    </div>
                    {message && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{message}</p>}
                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'gray' }}>
                    Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Register</Link>
                </p>
            </div>
        </main>
    );
}

// Helper to include Link in the component since it's used in the text below
import Link from 'next/link';
