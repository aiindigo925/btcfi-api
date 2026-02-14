import Link from 'next/link';
import { WalletProvider } from '@/components/WalletProvider';
import { WalletButton } from '@/components/WalletButton';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/address', label: 'Address' },
  { href: '/dashboard/my-addresses', label: 'My Addresses' },
  { href: '/dashboard/watchlist', label: 'Watchlist' },
  { href: '/dashboard/whales', label: 'Whales' },
  { href: '/dashboard/fees', label: 'Fee Calc' },
  { href: '/dashboard/admin', label: '🔒 Admin' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: '#e0e0e0', fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
        <nav style={{ width: '200px', borderRight: '1px solid #1a1a1a', padding: '20px 0', flexShrink: 0 }}>
          <div style={{ color: '#f7931a', fontWeight: 700, fontSize: '18px', padding: '0 16px 20px', borderBottom: '1px solid #1a1a1a', marginBottom: '8px' }}>₿ Dashboard</div>
          {nav.map(n => (
            <Link key={n.href} href={n.href} style={{ display: 'block', padding: '8px 16px', color: '#888', textDecoration: 'none', fontSize: '13px' }}>{n.label}</Link>
          ))}
          <div style={{ padding: '12px 16px', marginTop: '12px', borderTop: '1px solid #1a1a1a' }}>
            <WalletButton />
          </div>
          <Link href="/" style={{ display: 'block', padding: '8px 16px', color: '#888', textDecoration: 'none', fontSize: '13px', marginTop: '8px' }}>← API Home</Link>
        </nav>
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1200px' }}>{children}</main>
      </div>
    </WalletProvider>
  );
}
