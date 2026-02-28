"use client"

import { useState, useEffect, useMemo } from 'react';
import { Users, FileText, Settings, DollarSign, Megaphone, X, Search, CheckCircle, AlertCircle, Clock, ChevronRight, Calendar, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { addResidentAction, removeResidentAction, updateResidentAction, recordAdminPaymentAction } from './actions';

const supabase = createClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function currentMonthYear() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(my: string) {
    const [year, month] = my.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

function generateMonthOptions(from: string, count: number): string[] {
    const [year, month] = from.split('-').map(Number);
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(year, month - 1 + i, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)',
    color: 'var(--foreground)', fontSize: '0.9375rem',
};

const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600,
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    // Core data
    const [residents, setResidents] = useState<any[]>([]);
    const [levies, setLevies] = useState<any[]>([]);
    const [streets, setStreets] = useState<any[]>([]);
    const [bills, setBills] = useState<Record<string, string>>({}); // residentId → status
    const [collectedThisMonth, setCollectedThisMonth] = useState(0);
    const [newLevy, setNewLevy] = useState({ name: '', landlordRate: '', tenantRate: '' });

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Resident modal
    const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
    const [editingResident, setEditingResident] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [residentForm, setResidentForm] = useState({
        full_name: '', email: '', phone: '', role: 'tenant',
        street_id: '', apartment_unit: '', levy_type_id: '', monthly_amount: '',
    });

    // Pay Now modal
    const [payNowResident, setPayNowResident] = useState<any>(null);
    const [payForm, setPayForm] = useState({
        levy_type_id: '', amountReceived: '', monthsCount: '1', startMonth: currentMonthYear(), notes: '', paymentMethod: 'Transfer',
    });
    const [isPaySubmitting, setIsPaySubmitting] = useState(false);

    // Resident Detail Drawer
    const [selectedResident, setSelectedResident] = useState<any>(null);
    const [residentBills, setResidentBills] = useState<any[]>([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    // ── Data Fetching ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            const [
                { data: residentsData },
                { data: leviesData },
                { data: streetsData },
                { data: billsData },
                { data: paymentsData },
            ] = await Promise.all([
                supabase.from('residents').select('*, streets(name)').order('created_at', { ascending: false }),
                supabase.from('levy_types').select('id, name, levy_rates(resident_role, amount)'),
                supabase.from('streets').select('*').order('name'),
                supabase.from('monthly_bills').select('resident_id, status').eq('month_year', currentMonthYear()),
                supabase.from('payments').select('amount').eq('status', 'success')
                    .gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
            ]);

            if (residentsData) setResidents(residentsData.map(r => ({
                id: r.id,
                name: r.full_name || 'Unknown',
                email: r.email,
                phone: r.phone,
                role: r.role ? r.role.charAt(0).toUpperCase() + r.role.slice(1) : 'Tenant',
                streetId: r.street_id,
                streetName: r.streets?.name || '—',
                apartmentUnit: r.apartment_unit || 'N/A',
                levyTypeId: r.levy_type_id,
                monthlyAmount: Number(r.monthly_amount || 0),
                creditBalance: Number(r.credit_balance || 0),
                status: 'Active',
            })));

            if (leviesData) {
                setLevies(leviesData.map(l => {
                    const landlordRate = l.levy_rates?.find((r: any) => r.resident_role === 'landlord')?.amount || 0;
                    const tenantRate = l.levy_rates?.find((r: any) => r.resident_role === 'tenant')?.amount || 0;
                    return { id: l.id, name: l.name, landlordRate: Number(landlordRate), tenantRate: Number(tenantRate), cycle: 'Monthly' };
                }));
            }

            if (streetsData) setStreets(streetsData);

            if (billsData) {
                const billMap: Record<string, string> = {};
                billsData.forEach((b: any) => { billMap[b.resident_id] = b.status; });
                setBills(billMap);
            }

            if (paymentsData) {
                setCollectedThisMonth(paymentsData.reduce((sum: number, p: any) => sum + Number(p.amount), 0));
            }
        };
        fetch();
    }, []);

    // ── Derived ────────────────────────────────────────────────────────────────
    const filteredResidents = useMemo(() => {
        if (!searchQuery.trim()) return residents;
        return residents.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [residents, searchQuery]);

    const adminName = "Admin";
    const metrics = [
        { label: "Total Residents", value: residents.length },
        { label: "Collected This Month", value: `₦${collectedThisMonth.toLocaleString()}` },
        { label: "Unpaid This Month", value: residents.filter(r => !bills[r.id] || bills[r.id] === 'unpaid').length },
    ];

    // ── Resident Modal Handlers ────────────────────────────────────────────────
    const openAddResident = () => {
        setEditingResident(null);
        setResidentForm({ full_name: '', email: '', phone: '', role: 'tenant', street_id: '', apartment_unit: '', levy_type_id: '', monthly_amount: '' });
        setIsResidentModalOpen(true);
    };

    const openEditResident = (r: any) => {
        setEditingResident(r);
        setResidentForm({
            full_name: r.name || '', email: r.email || '', phone: r.phone || '',
            role: r.role?.toLowerCase() || 'tenant', street_id: r.streetId || '',
            apartment_unit: r.apartmentUnit === 'N/A' ? '' : (r.apartmentUnit || ''),
            levy_type_id: r.levyTypeId || '', monthly_amount: String(r.monthlyAmount || ''),
        });
        setIsResidentModalOpen(true);
    };

    // Auto-fill monthly amount when levy type changes
    const handleLevyTypeChange = (levyTypeId: string) => {
        const levy = levies.find(l => l.id === levyTypeId);
        const role = residentForm.role;
        const amount = levy ? (role === 'landlord' ? levy.landlordRate : levy.tenantRate) : '';
        setResidentForm(f => ({ ...f, levy_type_id: levyTypeId, monthly_amount: String(amount) }));
    };

    const handleSaveResident = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const fd = new FormData();
        Object.entries(residentForm).forEach(([k, v]) => fd.append(k, v));

        if (editingResident) {
            const res = await updateResidentAction(editingResident.id, fd);
            if (res.success && res.user) {
                setResidents(prev => prev.map(r => r.id === editingResident.id
                    ? { ...r, name: res.user.name, role: res.user.role, apartmentUnit: res.user.apartmentUnit, monthlyAmount: res.user.monthlyAmount }
                    : r
                ));
                setIsResidentModalOpen(false);
            } else alert(res.error || 'Update failed');
        } else {
            const res = await addResidentAction(fd);
            if (res.success && res.user) {
                setResidents(prev => [res.user, ...prev]);
                setIsResidentModalOpen(false);
            } else alert(res.error || 'Add failed');
        }
        setIsSubmitting(false);
    };

    const handleDeleteResident = async (id: string) => {
        if (!confirm('Remove this resident permanently?')) return;
        const res = await removeResidentAction(id);
        if (res.success) setResidents(prev => prev.filter(r => r.id !== id));
        else alert(res.error || 'Failed to remove');
    };

    // ── Resident Detail Drawer ─────────────────────────────────────────────────
    const openResidentDetail = async (r: any) => {
        setSelectedResident(r);
        setLoadingBills(true);
        const { data } = await supabase
            .from('monthly_bills')
            .select('*')
            .eq('resident_id', r.id)
            .order('month_year', { ascending: false });
        setResidentBills(data || []);
        setLoadingBills(false);
    };

    const closeDrawer = () => { setSelectedResident(null); setResidentBills([]); };

    // ── Levy Management ────────────────────────────────────────────────────────
    const handleAddLevy = async () => {
        if (!newLevy.name || !newLevy.landlordRate || !newLevy.tenantRate) return;
        const { data: levyTypeData, error } = await supabase.from('levy_types')
            .insert({ name: newLevy.name, description: 'Created from Admin Dashboard' }).select().single();
        if (error || !levyTypeData) { console.error(error); return; }
        await supabase.from('levy_rates').insert([
            { levy_type_id: levyTypeData.id, resident_role: 'landlord', amount: Number(newLevy.landlordRate) },
            { levy_type_id: levyTypeData.id, resident_role: 'tenant', amount: Number(newLevy.tenantRate) },
        ]);
        setLevies(prev => [...prev, { id: levyTypeData.id, name: newLevy.name, landlordRate: Number(newLevy.landlordRate), tenantRate: Number(newLevy.tenantRate), cycle: 'Monthly' }]);
        setNewLevy({ name: '', landlordRate: '', tenantRate: '' });
    };

    // ── Pay Now handler ────────────────────────────────────────────────────────
    const openPayNow = (resident: any) => {
        setPayNowResident(resident);
        setPayForm({
            levy_type_id: resident.levyTypeId || '',
            amountReceived: String(resident.monthlyAmount || ''),
            monthsCount: '1',
            startMonth: currentMonthYear(),
            notes: '',
            paymentMethod: 'Transfer',
        });
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payNowResident) return;
        setIsPaySubmitting(true);

        const monthsToMark = generateMonthOptions(payForm.startMonth, Number(payForm.monthsCount));

        const res = await recordAdminPaymentAction({
            residentId: payNowResident.id,
            residentName: payNowResident.name,
            amountReceived: Number(payForm.amountReceived),
            monthsToMark,
            amountDuePerMonth: payNowResident.monthlyAmount,
            currentCredit: payNowResident.creditBalance,
            notes: payForm.notes,
            recordedBy: adminName,
            paymentMethod: payForm.paymentMethod,
        });

        if (res.success) {
            // Refresh bill status for this resident
            const currentMonth = currentMonthYear();
            if (monthsToMark.includes(currentMonth)) {
                const totalAvailable = Number(payForm.amountReceived) + payNowResident.creditBalance;
                const newStatus = totalAvailable >= payNowResident.monthlyAmount ? 'paid' : totalAvailable > 0 ? 'partial' : 'unpaid';
                setBills(prev => ({ ...prev, [payNowResident.id]: newStatus }));
            }
            // Update credit balance in UI
            setResidents(prev => prev.map(r => r.id === payNowResident.id
                ? { ...r, creditBalance: res.newCreditBalance }
                : r
            ));
            // Show receipt
            setReceiptData({
                residentName: payNowResident.name,
                apartmentUnit: payNowResident.apartmentUnit,
                amountPaid: Number(payForm.amountReceived),
                creditApplied: payNowResident.creditBalance,
                newCreditBalance: res.newCreditBalance,
                monthsCovered: monthsToMark,
                paymentMethod: payForm.paymentMethod,
                levyName: levies.find(l => l.id === payForm.levy_type_id)?.name || 'Levy',
                date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }),
                receiptId: `RE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            });
            // If drawer is open for this resident, refresh its bills
            if (selectedResident?.id === payNowResident.id) {
                openResidentDetail({ ...payNowResident, creditBalance: res.newCreditBalance });
            }
            alert(`✅ Payment recorded!\n${res.billsCreated} month(s) updated.\nNew credit balance: ₦${res.newCreditBalance?.toLocaleString() || 0}`);
            setPayNowResident(null);
        } else {
            alert(res.error || 'Payment failed to record');
        }
        setIsPaySubmitting(false);
    };

    // ─── Status Badge ──────────────────────────────────────────────────────────
    const StatusBadge = ({ residentId }: { residentId: string }) => {
        const s = bills[residentId];
        if (s === 'paid') return (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.8125rem', fontWeight: 600 }}>
                <CheckCircle size={14} /> Paid
            </span>
        );
        if (s === 'partial') return (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.8125rem', fontWeight: 600 }}>
                <Clock size={14} /> Partial
            </span>
        );
        return (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', fontSize: '0.8125rem', fontWeight: 600 }}>
                <AlertCircle size={14} /> Unpaid
            </span>
        );
    };

    // ─── JSX ──────────────────────────────────────────────────────────────────
    return (
        <>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
                {/* Sidebar */}
                <aside style={{ width: '280px', borderRight: '1px solid var(--glass-border)', padding: '40px 24px', background: 'var(--secondary)', flexShrink: 0 }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '40px' }}>
                        DIAMOND<span style={{ color: 'var(--primary)' }}>ADMIN</span>
                    </h1>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { id: 'overview', icon: <DollarSign size={20} />, label: 'Financial Overview' },
                            { id: 'residents', icon: <Users size={20} />, label: 'Resident Directory' },
                            { id: 'levies', icon: <FileText size={20} />, label: 'Levy Management' },
                            { id: 'broadcasts', icon: <Megaphone size={20} />, label: 'Broadcasts' },
                        ].map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                borderRadius: '8px', background: activeTab === item.id ? 'var(--primary)' : 'transparent',
                                border: 'none', color: activeTab === item.id ? 'white' : 'var(--foreground)',
                                cursor: 'pointer', textAlign: 'left', width: '100%', fontWeight: 500, transition: 'all 0.2s',
                            }}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
                    <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Exco Portal</h2>
                            <p style={{ color: 'gray' }}>Logged in as: {adminName}</p>
                        </div>
                        <button className="btn-primary" style={{ background: 'var(--success)' }}>Generate Reports</button>
                    </header>

                    {/* ── OVERVIEW TAB ── */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                {metrics.map((m, i) => (
                                    <div key={i} className="glass-card" style={{ borderTop: '4px solid var(--primary)' }}>
                                        <h3 style={{ fontSize: '0.875rem', color: 'gray', marginBottom: '12px' }}>{m.label}</h3>
                                        <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{m.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="glass-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Resident Registrations</h3>
                                    <button onClick={() => setActiveTab('residents')} style={{ background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            {['Name', 'Role', 'Street', 'Unit', 'Monthly Levy'].map(h => (
                                                <th key={h} style={{ padding: '12px', color: 'gray', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {residents.slice(0, 5).map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '16px 12px', fontWeight: 500 }}>{r.name}</td>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: r.role === 'Landlord' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: r.role === 'Landlord' ? 'var(--primary)' : 'var(--success)' }}>
                                                        {r.role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 12px', color: 'gray' }}>{r.streetName}</td>
                                                <td style={{ padding: '16px 12px', color: 'gray' }}>{r.apartmentUnit}</td>
                                                <td style={{ padding: '16px 12px', fontWeight: 600 }}>₦{r.monthlyAmount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── RESIDENTS TAB ── */}
                    {activeTab === 'residents' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Resident Directory</h3>
                                <button className="btn-primary" onClick={openAddResident} style={{ padding: '10px 20px' }}>+ Add Resident</button>
                            </div>

                            {/* Search Bar */}
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'gray', pointerEvents: 'none' }} />
                                <input
                                    type="text" value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search residents by name..."
                                    style={{ ...inputStyle, paddingLeft: '44px', borderRadius: '10px' }}
                                />
                            </div>

                            <p style={{ color: 'gray', fontSize: '0.875rem', marginTop: '-8px' }}>
                                Showing {filteredResidents.length} of {residents.length} residents for {formatMonthLabel(currentMonthYear())}
                            </p>

                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                            {['Name', 'Role', 'Street & Unit', 'Monthly Levy', 'Credit', 'This Month', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '14px 16px', color: 'gray', fontWeight: 500, fontSize: '0.8125rem' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredResidents.length === 0 && (
                                            <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'gray' }}>
                                                {searchQuery ? `No residents found matching "${searchQuery}"` : 'No residents yet. Add your first resident!'}
                                            </td></tr>
                                        )}
                                        {filteredResidents.map(r => (
                                            <tr key={r.id}
                                                onClick={() => openResidentDetail(r)}
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'pointer' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                                                    {r.email && <div style={{ fontSize: '0.75rem', color: 'gray' }}>{r.email}</div>}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: r.role === 'Landlord' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)', color: r.role === 'Landlord' ? 'var(--primary)' : 'var(--success)' }}>
                                                        {r.role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: 'gray' }}>
                                                    {r.streetName}<br /><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>Unit {r.apartmentUnit}</span>
                                                </td>
                                                <td style={{ padding: '16px', fontWeight: 700 }}>₦{r.monthlyAmount.toLocaleString()}</td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: r.creditBalance > 0 ? 'var(--success)' : 'gray' }}>
                                                    {r.creditBalance > 0 ? `+₦${r.creditBalance.toLocaleString()}` : '—'}
                                                </td>
                                                <td style={{ padding: '16px' }}><StatusBadge residentId={r.id} /></td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                                        {(!bills[r.id] || bills[r.id] !== 'paid') && (
                                                            <button onClick={() => openPayNow(r)}
                                                                style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' }}>
                                                                Pay Now
                                                            </button>
                                                        )}
                                                        <button onClick={() => openEditResident(r)}
                                                            style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleDeleteResident(r.id)}
                                                            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                                            Remove
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── LEVIES TAB ── */}
                    {activeTab === 'levies' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div className="glass-card">
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Active Levy Types</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            {['Levy Name', 'Landlord Rate', 'Tenant Rate', 'Billing Cycle', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '12px', color: 'gray', fontWeight: 500 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {levies.map(levy => (
                                            <tr key={levy.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '16px 12px', fontWeight: 500 }}>{levy.name}</td>
                                                <td style={{ padding: '16px 12px' }}>₦{levy.landlordRate.toLocaleString()}</td>
                                                <td style={{ padding: '16px 12px' }}>₦{levy.tenantRate.toLocaleString()}</td>
                                                <td style={{ padding: '16px 12px', color: 'gray' }}>{levy.cycle}</td>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <button style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: '4px', color: 'var(--foreground)', cursor: 'pointer' }}>Edit Rates</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="glass-card" style={{ maxWidth: '600px' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Create New Levy</h3>
                                <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => { e.preventDefault(); handleAddLevy(); }}>
                                    <div>
                                        <label style={labelStyle}>Levy Name</label>
                                        <input type="text" value={newLevy.name} onChange={e => setNewLevy({ ...newLevy, name: e.target.value })} placeholder="e.g., Waste Management" style={inputStyle} required />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={labelStyle}>Landlord Rate (₦)</label>
                                            <input type="number" value={newLevy.landlordRate} onChange={e => setNewLevy({ ...newLevy, landlordRate: e.target.value })} placeholder="5000" style={inputStyle} required />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Tenant Rate (₦)</label>
                                            <input type="number" value={newLevy.tenantRate} onChange={e => setNewLevy({ ...newLevy, tenantRate: e.target.value })} placeholder="3000" style={inputStyle} required />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>Save Levy Configuration</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── BROADCASTS TAB ── */}
                    {activeTab === 'broadcasts' && (
                        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Send Estate Broadcast</h3>
                            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Target Audience</label>
                                    <select style={inputStyle}>
                                        <option value="all" style={{ color: 'black' }}>All Residents</option>
                                        <option value="landlords" style={{ color: 'black' }}>Landlords Only</option>
                                        <option value="tenants" style={{ color: 'black' }}>Tenants Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Message Title</label>
                                    <input type="text" placeholder="e.g., Upcoming Environmental Sanitation" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Message Content</label>
                                    <textarea rows={6} placeholder="Type your announcement here..." style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <button type="button" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                                    <Megaphone size={18} /> Send Broadcast
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── OTHER TABS ── */}
                    {activeTab !== 'overview' && activeTab !== 'residents' && activeTab !== 'levies' && activeTab !== 'broadcasts' && (
                        <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
                                <p style={{ color: 'gray' }}>Coming soon.</p>
                            </div>
                        </div>
                    )}
                </main>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* ADD/EDIT RESIDENT MODAL */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {isResidentModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(6px)' }}>
                        <div className="glass-card" style={{ width: '100%', maxWidth: '560px', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingResident ? 'Edit Resident' : 'Add New Resident'}</h3>
                                <button onClick={() => setIsResidentModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'gray', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveResident} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div>
                                    <label style={labelStyle}>Full Name *</label>
                                    <input style={inputStyle} value={residentForm.full_name} onChange={e => setResidentForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g., Chioma Okafor" required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Role *</label>
                                        <select style={inputStyle} value={residentForm.role} onChange={e => {
                                            const role = e.target.value;
                                            const levy = levies.find(l => l.id === residentForm.levy_type_id);
                                            const amount = levy ? (role === 'landlord' ? levy.landlordRate : levy.tenantRate) : '';
                                            setResidentForm(f => ({ ...f, role, monthly_amount: String(amount) }));
                                        }}>
                                            <option value="tenant" style={{ color: 'black' }}>Tenant</option>
                                            <option value="landlord" style={{ color: 'black' }}>Landlord / Owner</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Street *</label>
                                        <select style={inputStyle} value={residentForm.street_id} onChange={e => setResidentForm(f => ({ ...f, street_id: e.target.value }))}>
                                            <option value="">Select Street</option>
                                            {streets.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>House / Unit Number *</label>
                                    <input style={inputStyle} value={residentForm.apartment_unit} onChange={e => setResidentForm(f => ({ ...f, apartment_unit: e.target.value }))} placeholder="e.g., 5B, Flat 3, House 12" required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Levy Type</label>
                                        <select style={inputStyle} value={residentForm.levy_type_id} onChange={e => handleLevyTypeChange(e.target.value)}>
                                            <option value="">Select Levy</option>
                                            {levies.map(l => <option key={l.id} value={l.id} style={{ color: 'black' }}>{l.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Monthly Amount (₦)</label>
                                        <input type="number" style={inputStyle} value={residentForm.monthly_amount} onChange={e => setResidentForm(f => ({ ...f, monthly_amount: e.target.value }))} placeholder="Auto-filled from levy" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Email <span style={{ fontWeight: 400, color: 'gray' }}>(optional)</span></label>
                                        <input type="email" style={inputStyle} value={residentForm.email} onChange={e => setResidentForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Phone <span style={{ fontWeight: 400, color: 'gray' }}>(optional)</span></label>
                                        <input type="tel" style={inputStyle} value={residentForm.phone} onChange={e => setResidentForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234 800…" />
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '8px', opacity: isSubmitting ? 0.7 : 1 }}>
                                    {isSubmitting ? 'Saving...' : editingResident ? 'Update Resident' : 'Add to Directory'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* PAY NOW MODAL */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {payNowResident && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(6px)' }}>
                        <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '36px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Record Payment</h3>
                                    <p style={{ color: 'gray', fontSize: '0.875rem', marginTop: '4px' }}>{payNowResident.name} · Unit {payNowResident.apartmentUnit}</p>
                                </div>
                                <button onClick={() => setPayNowResident(null)} style={{ background: 'transparent', border: 'none', color: 'gray', cursor: 'pointer' }}><X size={22} /></button>
                            </div>

                            {/* Info Banner */}
                            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'gray' }}>Monthly Levy Due</span>
                                    <strong>₦{payNowResident.monthlyAmount.toLocaleString()}</strong>
                                </div>
                                {payNowResident.creditBalance > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'gray' }}>Existing Credit</span>
                                        <strong style={{ color: 'var(--success)' }}>+₦{payNowResident.creditBalance.toLocaleString()}</strong>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {/* Levy Type */}
                                <div>
                                    <label style={labelStyle}>Levy Type *</label>
                                    <select style={inputStyle} value={payForm.levy_type_id}
                                        onChange={e => {
                                            const levyId = e.target.value;
                                            const levy = levies.find(l => l.id === levyId);
                                            const role = payNowResident?.role?.toLowerCase();
                                            const rate = levy ? (role === 'landlord' ? levy.landlordRate : levy.tenantRate) : '';
                                            setPayForm(f => ({ ...f, levy_type_id: levyId, amountReceived: String(rate) }));
                                        }} required>
                                        <option value="" style={{ color: 'black' }}>Select Levy Type</option>
                                        {levies.map(l => (
                                            <option key={l.id} value={l.id} style={{ color: 'black' }}>
                                                {l.name} — Landlord: ₦{Number(l.landlordRate).toLocaleString()} / Tenant: ₦{Number(l.tenantRate).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Amount Received (₦) *</label>
                                    <input type="number" style={inputStyle} value={payForm.amountReceived}
                                        onChange={e => setPayForm(f => ({ ...f, amountReceived: e.target.value }))}
                                        placeholder={`e.g. ${payNowResident.monthlyAmount || '5000'}`} required min="0" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Starting Month</label>
                                        <input type="month" style={inputStyle} value={payForm.startMonth}
                                            onChange={e => setPayForm(f => ({ ...f, startMonth: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Months to Cover</label>
                                        <select style={inputStyle} value={payForm.monthsCount}
                                            onChange={e => setPayForm(f => ({ ...f, monthsCount: e.target.value }))}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                <option key={n} value={n} style={{ color: 'black' }}>{n} month{n > 1 ? 's' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Preview */}
                                {payForm.amountReceived && (
                                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.8125rem' }}>
                                        <p style={{ fontWeight: 600, marginBottom: '6px' }}>Payment Preview</p>
                                        {generateMonthOptions(payForm.startMonth, Number(payForm.monthsCount)).map((m, i) => {
                                            const pool = Number(payForm.amountReceived) + payNowResident.creditBalance;
                                            const spent = i * payNowResident.monthlyAmount;
                                            const avail = pool - spent;
                                            const paid = Math.min(avail, payNowResident.monthlyAmount);
                                            const status = paid >= payNowResident.monthlyAmount ? '✅' : paid > 0 ? '🟡' : '🔴';
                                            return (
                                                <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <span style={{ color: 'gray' }}>{status} {formatMonthLabel(m)}</span>
                                                    <span>₦{Math.max(0, paid).toLocaleString()} / ₦{payNowResident.monthlyAmount.toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                        {(() => {
                                            const surplus = Number(payForm.amountReceived) + payNowResident.creditBalance - (Number(payForm.monthsCount) * payNowResident.monthlyAmount);
                                            return surplus > 0 ? (
                                                <p style={{ marginTop: '8px', color: 'var(--success)', fontWeight: 600 }}>
                                                    +₦{surplus.toLocaleString()} credit → carries to next month
                                                </p>
                                            ) : null;
                                        })()}
                                    </div>
                                )}

                                <div>
                                    <label style={labelStyle}>Payment Method</label>
                                    <select style={inputStyle} value={payForm.paymentMethod}
                                        onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                                        <option value="Transfer" style={{ color: 'black' }}>Bank Transfer</option>
                                        <option value="Cash" style={{ color: 'black' }}>Cash</option>
                                        <option value="POS" style={{ color: 'black' }}>POS</option>
                                        <option value="Cheque" style={{ color: 'black' }}>Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: 'gray' }}>(optional)</span></label>
                                    <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={payForm.notes}
                                        onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="e.g., cash payment handed to CSO" />
                                </div>

                                <button type="submit" disabled={isPaySubmitting} className="btn-primary" style={{ opacity: isPaySubmitting ? 0.7 : 1 }}>
                                    {isPaySubmitting ? 'Recording...' : '✓ Mark as Paid'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* RESIDENT DETAIL DRAWER */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {selectedResident && (
                <>
                    {/* Backdrop */}
                    <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
                    {/* Drawer */}
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
                        background: 'var(--secondary)', borderLeft: '1px solid var(--glass-border)',
                        zIndex: 45, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                        animation: 'slideIn 0.25s ease-out',
                    }}>
                        {/* Drawer Header */}
                        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem', color: 'white', flexShrink: 0 }}>
                                        {selectedResident.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>{selectedResident.name}</h3>
                                        <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: selectedResident.role === 'Landlord' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)', color: selectedResident.role === 'Landlord' ? 'var(--primary)' : 'var(--success)' }}>
                                            {selectedResident.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={closeDrawer} style={{ background: 'transparent', border: 'none', color: 'gray', cursor: 'pointer', flexShrink: 0, marginTop: '4px' }}><X size={22} /></button>
                        </div>

                        {/* Info Section */}
                        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { icon: <MapPin size={15} />, label: `${selectedResident.streetName} · Unit ${selectedResident.apartmentUnit}` },
                                ...(selectedResident.email ? [{ icon: <Mail size={15} />, label: selectedResident.email }] : []),
                                ...(selectedResident.phone ? [{ icon: <Phone size={15} />, label: selectedResident.phone }] : []),
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'gray', fontSize: '0.875rem' }}>
                                    {item.icon} {item.label}
                                </div>
                            ))}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px' }}>
                                    <p style={{ color: 'gray', fontSize: '0.75rem', marginBottom: '4px' }}>Monthly Levy</p>
                                    <p style={{ fontWeight: 800, fontSize: '1.25rem' }}>₦{selectedResident.monthlyAmount.toLocaleString()}</p>
                                </div>
                                <div style={{ background: selectedResident.creditBalance > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', border: selectedResident.creditBalance > 0 ? '1px solid rgba(16,185,129,0.2)' : 'none' }}>
                                    <p style={{ color: 'gray', fontSize: '0.75rem', marginBottom: '4px' }}>Credit Balance</p>
                                    <p style={{ fontWeight: 800, fontSize: '1.25rem', color: selectedResident.creditBalance > 0 ? 'var(--success)' : 'inherit' }}>
                                        {selectedResident.creditBalance > 0 ? `+₦${selectedResident.creditBalance.toLocaleString()}` : '₦0'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {(() => {
                            const currentMY = currentMonthYear();
                            // Find earliest month not 'paid' starting from current month
                            let targetMY = currentMY;

                            // Sort history to find the latest paid month
                            const paidMonths = residentBills
                                .filter(b => b.status === 'paid')
                                .map(b => b.month_year)
                                .sort();

                            if (paidMonths.length > 0) {
                                const latestPaid = paidMonths[paidMonths.length - 1];
                                // If the latest paid is current or future, the next due is the month after it
                                if (latestPaid >= currentMY) {
                                    targetMY = generateMonthOptions(latestPaid, 2)[1];
                                }
                            }

                            const amountDue = selectedResident.monthlyAmount;
                            const credit = selectedResident.creditBalance;
                            const toPay = Math.max(0, amountDue - credit);

                            return (
                                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Calendar size={18} style={{ color: toPay === 0 ? 'var(--success)' : 'var(--error)', flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'gray' }}>Next Payment Due</p>
                                            <p style={{ fontWeight: 700 }}>
                                                {formatMonthLabel(targetMY)}
                                                {toPay > 0 ? (
                                                    <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--error)', fontWeight: 600 }}>
                                                        ₦{toPay.toLocaleString()} <span style={{ fontWeight: 400, opacity: 0.7 }}>(after ₦{credit.toLocaleString()} credit)</span>
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
                                                        Fully covered by credit
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {toPay > 0 && selectedResident.monthlyAmount > 0 && (
                                        <button onClick={() => { closeDrawer(); openPayNow(selectedResident); }}
                                            className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <CreditCard size={15} /> Pay Now
                                        </button>
                                    )}
                                    {toPay === 0 && (
                                        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle size={16} /> Covered
                                        </span>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Payment History */}
                        <div style={{ padding: '20px 28px', flex: 1 }}>
                            <h4 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} /> Payment History
                            </h4>
                            {loadingBills ? (
                                <p style={{ color: 'gray', textAlign: 'center', padding: '24px' }}>Loading history...</p>
                            ) : residentBills.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                    <p style={{ color: 'gray' }}>No payment records yet.</p>
                                    {(
                                        <button onClick={() => { closeDrawer(); openPayNow(selectedResident); }} className="btn-primary" style={{ marginTop: '16px', padding: '10px 20px', fontSize: '0.875rem' }}>
                                            Record First Payment
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {residentBills.map(bill => (
                                        <div key={bill.id} style={{
                                            padding: '16px', borderRadius: '12px',
                                            background: bill.status === 'paid' ? 'rgba(16,185,129,0.07)' : bill.status === 'partial' ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)',
                                            border: `1px solid ${bill.status === 'paid' ? 'rgba(16,185,129,0.2)' : bill.status === 'partial' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.15)'}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: bill.notes ? '8px' : 0 }}>
                                                <div>
                                                    <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{formatMonthLabel(bill.month_year)}</p>
                                                    <p style={{ fontSize: '0.8125rem', color: 'gray', marginTop: '2px' }}>
                                                        ₦{Number(bill.amount_paid).toLocaleString()} / ₦{Number(bill.amount_due).toLocaleString()}
                                                        {Number(bill.credit_applied) > 0 && (
                                                            <span style={{ color: 'var(--success)', marginLeft: '6px' }}>(+₦{Number(bill.credit_applied).toLocaleString()} credit)</span>
                                                        )}
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', color: 'gray', marginTop: '4px' }}>
                                                        {bill.payment_method || 'Payment'} · {new Date(bill.paid_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                                    background: bill.status === 'paid' ? 'rgba(16,185,129,0.15)' : bill.status === 'partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: bill.status === 'paid' ? 'var(--success)' : bill.status === 'partial' ? '#f59e0b' : 'var(--error)',
                                                }}>
                                                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                                                </span>
                                            </div>
                                            {bill.notes && (
                                                <p style={{ fontSize: '0.75rem', color: 'gray', fontStyle: 'italic', marginTop: '6px' }}>📝 {bill.notes}</p>
                                            )}
                                            {bill.paid_at && (
                                                <p style={{ fontSize: '0.75rem', color: 'gray', marginTop: '4px' }}>
                                                    Recorded: {new Date(bill.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Drawer footer actions */}
                        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '10px', flexShrink: 0 }}>
                            <button onClick={() => { closeDrawer(); openEditResident(selectedResident); }}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 500 }}>
                                Edit Details
                            </button>
                            <button onClick={() => { if (confirm('Remove this resident permanently?')) { handleDeleteResident(selectedResident.id); closeDrawer(); } }}
                                style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)', cursor: 'pointer', fontWeight: 500 }}>
                                Remove
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* RECEIPT MODAL */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {receiptData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', color: 'black', width: '100%', maxWidth: '420px', padding: '40px', borderRadius: '4px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'relative' }}>
                        <div id="printable-receipt">
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Diamond Estate</h2>
                                <p style={{ fontSize: '0.8125rem', color: '#666', margin: '4px 0 0' }}>satellite town, Lagos state, Nigeria</p>
                                <div style={{ marginTop: '15px', padding: '4px 12px', background: '#000', color: '#fff', display: 'inline-block', fontSize: '0.75rem', fontWeight: 700 }}>OFFICIAL RECEIPT</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '20px' }}>
                                <span>Date: <strong>{receiptData.date}</strong></span>
                                <span>No: <strong>{receiptData.receiptId}</strong></span>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>Received From</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{receiptData.residentName}</div>
                                <div style={{ fontSize: '0.875rem', color: '#444' }}>Unit {receiptData.apartmentUnit}</div>
                            </div>

                            <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '15px 0', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#666' }}>{receiptData.levyName}</span>
                                    <span style={{ fontWeight: 600 }}>₦{receiptData.amountPaid.toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#666' }}>
                                    Coverage: {receiptData.monthsCovered.map((m: string) => formatMonthLabel(m)).join(', ')}
                                </div>
                                {receiptData.creditApplied > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8125rem', color: '#10b981' }}>
                                        <span>(-) Credit Applied</span>
                                        <span>-₦{receiptData.creditApplied.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#999' }}>Payment Method</div>
                                    <div style={{ fontWeight: 600 }}>{receiptData.paymentMethod}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#999' }}>Total Amount Paid</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>₦{receiptData.amountPaid.toLocaleString()}</div>
                                </div>
                            </div>

                            {receiptData.newCreditBalance > 0 && (
                                <div style={{ padding: '10px', background: '#f9f9f9', border: '1px solid #eee', fontSize: '0.8125rem', textAlign: 'center', marginBottom: '20px' }}>
                                    New Credit Balance: <strong>₦{receiptData.newCreditBalance.toLocaleString()}</strong>
                                </div>
                            )}

                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#999', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                Thank you for your payment
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                            <button onClick={() => window.print()} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}>Print Receipt</button>
                            <button onClick={() => setReceiptData(null)} style={{ padding: '12px 20px', background: '#eee', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @media print {
                body * { visibility: hidden; }
                #printable-receipt, #printable-receipt * { visibility: visible; }
                #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
            }
        `}</style>
        </>
    );
}
