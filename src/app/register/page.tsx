"use client"

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('tenant');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone,
                    role: role,
                }
            }
        });

        if (authError) {
            setMessage(authError.message);
        } else {
            setMessage('Registration successful! Please check your email to verify your account.');
            // Optional: Redirect immediately or wait for verification
            // router.push('/dashboard');
        }
        setLoading(false);
    };

    return (
        <main className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px 0' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '440px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Join DiamondEstate</h2>
                    <p style={{ color: 'gray', fontSize: '0.875rem' }}>Create your resident account to manage your apartments and levies.</p>
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--foreground)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Email Address</label>
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
                                color: 'var(--foreground)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+234 XXX XXXX"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--foreground)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Primary Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--foreground)',
                                appearance: 'none'
                            }}
                        >
                            <option value="tenant" style={{ color: 'black' }}>Tenant</option>
                            <option value="landlord" style={{ color: 'black' }}>Landlord</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a strong password"
                            required
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--foreground)'
                            }}
                        />
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: message.includes('successful') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: message.includes('successful') ? 'var(--success)' : 'var(--error)',
                            fontSize: '0.875rem'
                        }}>
                            {message}
                        </div>
                    )}

                    <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '8px', padding: '14px' }}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'gray' }}>
                    Already registered? <Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Log in here</Link>
                </p>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Link href="/" style={{ color: 'gray', fontSize: '0.75rem', textDecoration: 'none' }}>
                        &larr; Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
