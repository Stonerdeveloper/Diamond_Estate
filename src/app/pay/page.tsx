"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { recordPaymentAction } from './actions';
import { CheckCircle, CreditCard, Home, User, ChevronRight, Printer, Download } from 'lucide-react';

const supabase = createClient();

type Step = 'identify' | 'levy' | 'confirm' | 'receipt';

interface Receipt {
    receiptNumber: number;
    paymentDate: string;
    amount: number;
    id: string;
}

export default function PayPage() {
    const [step, setStep] = useState<Step>('identify');

    // Dropdown data
    const [streets, setStreets] = useState<any[]>([]);
    const [apartments, setApartments] = useState<any[]>([]);
    const [levyTypes, setLevyTypes] = useState<any[]>([]);

    // Form state
    const [form, setForm] = useState({
        streetId: '',
        streetName: '',
        apartmentId: '',
        apartmentUnit: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'tenant' as 'landlord' | 'tenant',
        levyTypeId: '',
        levyName: '',
        amount: 0,
    });

    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            const [{ data: streetsData }, { data: leviesData }] = await Promise.all([
                supabase.from('streets').select('*').order('name'),
                supabase.from('levy_types').select(`id, name, levy_rates(resident_role, amount)`),
            ]);
            if (streetsData) setStreets(streetsData);
            if (leviesData) setLevyTypes(leviesData);
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!form.streetId) { setApartments([]); return; }
        supabase
            .from('apartments')
            .select('*')
            .eq('street_id', form.streetId)
            .order('unit_number')
            .then(({ data }) => setApartments(data || []));
    }, [form.streetId]);

    const getAmount = (levyId: string) => {
        const levy = levyTypes.find(l => l.id === levyId);
        if (!levy) return 0;
        const rate = levy.levy_rates?.find((r: any) => r.resident_role === form.role);
        return rate ? Number(rate.amount) : 0;
    };

    const handleStreetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = streets.find(s => s.id === e.target.value);
        setForm(f => ({ ...f, streetId: e.target.value, streetName: selected?.name || '', apartmentId: '', apartmentUnit: '' }));
    };

    const handleApartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = apartments.find(a => a.id === e.target.value);
        setForm(f => ({ ...f, apartmentId: e.target.value, apartmentUnit: selected?.unit_number || '' }));
    };

    const handleLevyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const levy = levyTypes.find(l => l.id === e.target.value);
        const amt = getAmount(e.target.value);
        setForm(f => ({ ...f, levyTypeId: e.target.value, levyName: levy?.name || '', amount: amt }));
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRole = e.target.value as 'landlord' | 'tenant';
        setForm(f => {
            const amt = f.levyTypeId ? getAmountForRole(f.levyTypeId, newRole) : 0;
            return { ...f, role: newRole, amount: amt };
        });
    };

    const getAmountForRole = (levyId: string, role: string) => {
        const levy = levyTypes.find(l => l.id === levyId);
        if (!levy) return 0;
        const rate = levy.levy_rates?.find((r: any) => r.resident_role === role);
        return rate ? Number(rate.amount) : 0;
    };

    const initiatePayment = () => {
        if (!form.fullName || !form.streetId || !form.apartmentId || !form.levyTypeId) {
            setError('Please fill all required fields.');
            return;
        }
        setError('');
        setStep('confirm');
    };

    const handlePayWithPaystack = () => {
        setIsLoading(true);
        // Check if Paystack is loaded (public test key)
        const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY || 'pk_test_demo';

        if (typeof window !== 'undefined' && (window as any).PaystackPop && paystackKey !== 'pk_test_demo') {
            const handler = (window as any).PaystackPop.setup({
                key: paystackKey,
                email: form.email || 'noemail@diamondestate.com',
                amount: form.amount * 100, // Paystack uses kobo
                currency: 'NGN',
                ref: `DE-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                metadata: {
                    custom_fields: [
                        { display_name: 'Resident', variable_name: 'resident', value: form.fullName },
                        { display_name: 'Levy', variable_name: 'levy', value: form.levyName },
                    ],
                },
                callback: async (response: { reference: string }) => {
                    await completePayment(response.reference);
                },
                onClose: () => setIsLoading(false),
            });
            handler.openIframe();
        } else {
            // Simulated payment for demo / no Paystack key
            setTimeout(async () => {
                const ref = `DE-DEMO-${Date.now()}`;
                await completePayment(ref);
            }, 1500);
        }
    };

    const completePayment = async (reference: string) => {
        const res = await recordPaymentAction({
            residentName: form.fullName,
            residentEmail: form.email,
            residentPhone: form.phone,
            streetName: form.streetName,
            apartmentUnit: form.apartmentUnit,
            levyTypeId: form.levyTypeId,
            levyName: form.levyName,
            amount: form.amount,
            paystackReference: reference,
        });

        setIsLoading(false);
        if (res.success && res.receipt) {
            setReceipt(res.receipt);
            setStep('receipt');
        } else {
            setError(res.error || 'Payment recording failed. Please contact admin.');
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '14px 16px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
        color: 'var(--foreground)', fontSize: '1rem', outline: 'none',
        transition: 'border-color 0.2s',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', marginBottom: '8px', fontSize: '0.875rem',
        fontWeight: 600, color: 'var(--foreground)',
    };

    const stepIndicator = (num: number, label: string, active: boolean, done: boolean) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: active || done ? 1 : 0.4 }}>
            <div style={{
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                background: done ? 'var(--success)' : active ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: 'white', fontSize: '0.875rem', flexShrink: 0,
            }}>
                {done ? '✓' : num}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
            {num < 3 && <ChevronRight size={16} style={{ opacity: 0.3, flexShrink: 0 }} />}
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--background)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 16px',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
                    DIAMOND<span style={{ color: 'var(--primary)' }}>ESTATE</span>
                </h1>
                <p style={{ color: 'gray', fontSize: '1rem' }}>Secure Levy Payment Portal</p>
            </div>

            {/* Step indicator */}
            {step !== 'receipt' && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    marginBottom: '40px', padding: '16px 24px', borderRadius: '12px',
                    background: 'var(--secondary)', border: '1px solid var(--glass-border)',
                    flexWrap: 'wrap', justifyContent: 'center',
                }}>
                    {stepIndicator(1, 'Your Details', step === 'identify', step === 'levy' || step === 'confirm')}
                    {stepIndicator(2, 'Choose Levy', step === 'levy', step === 'confirm')}
                    {stepIndicator(3, 'Confirm & Pay', step === 'confirm', false)}
                </div>
            )}

            <div style={{ width: '100%', maxWidth: '560px' }}>

                {/* ====== STEP 1: IDENTIFY ====== */}
                {step === 'identify' && (
                    <div className="glass-card" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)' }}>
                                <User size={24} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Your Details</h2>
                                <p style={{ color: 'gray', fontSize: '0.875rem' }}>Tell us who you are</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Full Name *</label>
                                <input style={inputStyle} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g., Adaobi Okonkwo" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Street *</label>
                                    <select style={inputStyle} value={form.streetId} onChange={handleStreetChange}>
                                        <option value="">Select Street</option>
                                        {streets.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Apartment *</label>
                                    <select style={inputStyle} value={form.apartmentId} onChange={handleApartmentChange} disabled={!form.streetId}>
                                        <option value="">Select Unit</option>
                                        {apartments.map(a => <option key={a.id} value={a.id} style={{ color: 'black' }}>Unit {a.unit_number}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>I am a *</label>
                                <select style={inputStyle} value={form.role} onChange={handleRoleChange}>
                                    <option value="tenant" style={{ color: 'black' }}>Tenant</option>
                                    <option value="landlord" style={{ color: 'black' }}>Landlord / Property Owner</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Email Address <span style={{ color: 'gray', fontWeight: 400 }}>(optional — for your receipt)</span></label>
                                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
                            </div>

                            <div>
                                <label style={labelStyle}>Phone Number <span style={{ color: 'gray', fontWeight: 400 }}>(optional)</span></label>
                                <input style={inputStyle} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234 800 000 0000" />
                            </div>

                            {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>}

                            <button onClick={() => {
                                if (!form.fullName || !form.streetId || !form.apartmentId) { setError('Name, Street, and Apartment are required.'); return; }
                                setError(''); setStep('levy');
                            }} className="btn-primary" style={{ padding: '14px', fontSize: '1rem', marginTop: '8px' }}>
                                Continue <ChevronRight size={18} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ====== STEP 2: CHOOSE LEVY ====== */}
                {step === 'levy' && (
                    <div className="glass-card" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)' }}>
                                <Home size={24} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Choose Levy</h2>
                                <p style={{ color: 'gray', fontSize: '0.875rem' }}>Select what you'd like to pay</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {levyTypes.map(levy => {
                                const rate = levy.levy_rates?.find((r: any) => r.resident_role === form.role);
                                const amount = rate ? Number(rate.amount) : 0;
                                const isSelected = form.levyTypeId === levy.id;
                                return (
                                    <div key={levy.id} onClick={() => setForm(f => ({ ...f, levyTypeId: levy.id, levyName: levy.name, amount }))}
                                        style={{
                                            padding: '20px', borderRadius: '12px', cursor: 'pointer',
                                            border: isSelected ? '2px solid var(--primary)' : '2px solid var(--glass-border)',
                                            background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                                            transition: 'all 0.2s',
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '1rem' }}>{levy.name} Levy</p>
                                                <p style={{ color: 'gray', fontSize: '0.8rem', marginTop: '4px' }}>Monthly</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontWeight: 800, fontSize: '1.5rem', color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                                                    ₦{amount.toLocaleString()}
                                                </p>
                                                <p style={{ color: 'gray', fontSize: '0.75rem' }}>for {form.role}s</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => setStep('identify')} style={{ flex: 1, padding: '14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 500 }}>
                                    Back
                                </button>
                                <button onClick={initiatePayment} className="btn-primary" style={{ flex: 2, padding: '14px', fontSize: '1rem' }} disabled={!form.levyTypeId}>
                                    Review Payment <ChevronRight size={18} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ====== STEP 3: CONFIRM ====== */}
                {step === 'confirm' && (
                    <div className="glass-card" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)' }}>
                                <CreditCard size={24} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Confirm Payment</h2>
                                <p style={{ color: 'gray', fontSize: '0.875rem' }}>Review and pay securely</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {[
                                { label: 'Name', value: form.fullName },
                                { label: 'Location', value: `${form.streetName} · Unit ${form.apartmentUnit}` },
                                { label: 'Role', value: form.role.charAt(0).toUpperCase() + form.role.slice(1) },
                                { label: 'Levy', value: `${form.levyName} Levy` },
                            ].map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'gray', fontSize: '0.875rem' }}>{row.label}</span>
                                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{row.value}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Due</span>
                                <span style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--primary)' }}>₦{form.amount.toLocaleString()}</span>
                            </div>
                        </div>

                        {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '12px' }}>{error}</p>}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setStep('levy')} style={{ flex: 1, padding: '14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 500 }}>
                                Back
                            </button>
                            <button onClick={handlePayWithPaystack} className="btn-primary" disabled={isLoading}
                                style={{ flex: 2, padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1 }}>
                                {isLoading ? (
                                    <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Processing...</>
                                ) : (
                                    <><CreditCard size={18} /> Pay ₦{form.amount.toLocaleString()}</>
                                )}
                            </button>
                        </div>

                        <p style={{ color: 'gray', fontSize: '0.75rem', textAlign: 'center', marginTop: '16px' }}>
                            🔒 Secured by Paystack · Your card details are never stored
                        </p>
                    </div>
                )}

                {/* ====== RECEIPT ====== */}
                {step === 'receipt' && receipt && (
                    <div>
                        <div ref={receiptRef} className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto' }} />
                            </div>

                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>Payment Successful!</h2>
                            <p style={{ color: 'gray', marginBottom: '40px' }}>Your levy payment has been recorded.</p>

                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '32px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
                                    <span style={{ color: 'gray' }}>Receipt No.</span>
                                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--primary)' }}>
                                        #{String(receipt.receiptNumber).padStart(6, '0')}
                                    </span>
                                </div>
                                {[
                                    { label: 'Paid By', value: form.fullName },
                                    { label: 'Location', value: `${form.streetName} · Unit ${form.apartmentUnit}` },
                                    { label: 'Levy Type', value: `${form.levyName} Levy` },
                                    { label: 'Date', value: new Date(receipt.paymentDate).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                                ].map(row => (
                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                                        <span style={{ color: 'gray', fontSize: '0.875rem' }}>{row.label}</span>
                                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{row.value}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Amount Paid</span>
                                    <span style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--success)' }}>₦{Number(receipt.amount).toLocaleString()}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => window.print()} style={{
                                    flex: 1, padding: '14px', borderRadius: '8px', background: 'transparent',
                                    border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 500,
                                }}>
                                    <Printer size={18} /> Print Receipt
                                </button>
                                <button onClick={() => { setStep('identify'); setForm(f => ({ ...f, fullName: '', email: '', phone: '', levyTypeId: '', levyName: '', amount: 0 })); }} className="btn-primary" style={{ flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Download size={18} /> Pay Another Levy
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Paystack script */}
            <script src="https://js.paystack.co/v1/inline.js" async />

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden; }
          .glass-card, .glass-card * { visibility: visible; }
          .glass-card { position: fixed; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
        </div>
    );
}
