"use client"

import { useState } from 'react';
import { CreditCard, History, Home, Bell } from 'lucide-react';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('summary');

    // Data will be fetched from Supabase once resident login is implemented
    const [resident, setResident] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{ width: '280px', borderRight: '1px solid var(--glass-border)', padding: '40px 24px' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '40px' }}>
                    DIAMOND<span style={{ color: 'var(--primary)' }}>ESTATE</span>
                </h1>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={() => setActiveTab('summary')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px',
                            background: activeTab === 'summary' ? 'var(--glass)' : 'transparent',
                            border: 'none', color: activeTab === 'summary' ? 'var(--primary)' : 'var(--foreground)',
                            cursor: 'pointer', textAlign: 'left', width: '100%', fontWeight: 500
                        }}>
                        <Home size={20} /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px',
                            background: activeTab === 'payments' ? 'var(--glass)' : 'transparent',
                            border: 'none', color: activeTab === 'payments' ? 'var(--primary)' : 'var(--foreground)',
                            cursor: 'pointer', textAlign: 'left', width: '100%', fontWeight: 500
                        }}>
                        <CreditCard size={20} /> Payments
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcasts')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px',
                            background: activeTab === 'broadcasts' ? 'var(--glass)' : 'transparent',
                            border: 'none', color: activeTab === 'broadcasts' ? 'var(--primary)' : 'var(--foreground)',
                            cursor: 'pointer', textAlign: 'left', width: '100%', fontWeight: 500
                        }}>
                        <Bell size={20} /> Announcements
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px 60px' }}>
                <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {resident ? `Welcome, ${resident.full_name}` : 'Resident Dashboard'}
                        </h2>
                        <p style={{ color: 'gray' }}>
                            {resident ? `Assigned to ${resident.apartment_unit}, ${resident.streets?.name}` : 'Profile not synced'}
                        </p>
                    </div>
                    <button className="btn-primary" disabled>Pay Levy</button>
                </header>

                <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                    <h3 style={{ marginBottom: '12px' }}>Resident Portal</h3>
                    <p style={{ color: 'gray' }}>Your payment history and profile will appear here once your account is verified by the estate office.</p>
                </div>
            </main>
        </div>
    );
}
