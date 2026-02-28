import Link from 'next/link';
import { Shield, Building, CreditCard, Users } from 'lucide-react';

export default function Home() {
  return (
    <main className="container">
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 0' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.05em' }}>
          DIAMOND<span style={{ color: 'var(--primary)' }}>ESTATE</span>
        </h1>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/login" style={{ textDecoration: 'none', color: 'var(--foreground)', fontWeight: 500 }}>Login</Link>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>Join Estate</Link>
        </div>
      </nav>

      <section style={{ padding: '80px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.1 }}>
          Modern Management for <br />
          <span style={{ color: 'var(--primary)' }}>Your Premium Estate.</span>
        </h2>
        <p style={{ fontSize: '1.25rem', color: 'gray', maxWidth: '600px', margin: '0 auto 40px' }}>
          Streamline security levy collections, resident tracking, and estate communications with our all-in-one management portal.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn-primary">Get Started</button>
          <button style={{
            background: 'transparent',
            border: '1px solid var(--glass-border)',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'var(--foreground)',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            Learn More
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '40px 0' }}>
        <div className="glass-card">
          <Shield style={{ color: 'var(--primary)', marginBottom: '16px' }} size={32} />
          <h3 style={{ marginBottom: '12px' }}>Security Levies</h3>
          <p style={{ color: 'gray', lineHeight: 1.6 }}>Track and pay security levies with ease via Paystack integration. Full history at your fingertips.</p>
        </div>
        <div className="glass-card">
          <Users style={{ color: 'var(--primary)', marginBottom: '16px' }} size={32} />
          <h3 style={{ marginBottom: '12px' }}>Resident Portal</h3>
          <p style={{ color: 'gray', lineHeight: 1.6 }}>Manage your profile, link your apartments, and stay updated with estate announcements.</p>
        </div>
        <div className="glass-card">
          <CreditCard style={{ color: 'var(--primary)', marginBottom: '16px' }} size={32} />
          <h3 style={{ marginBottom: '12px' }}>Exco Dashboard</h3>
          <p style={{ color: 'gray', lineHeight: 1.6 }}>Advanced reporting for estate executives. View defaulters, manage residents, and track expenses.</p>
        </div>
      </section>

      <footer style={{ marginTop: '80px', padding: '40px 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center', color: 'gray', fontSize: '0.875rem' }}>
        © 2026 DiamondEstate Management System. All rights reserved.
      </footer>
    </main>
  );
}
