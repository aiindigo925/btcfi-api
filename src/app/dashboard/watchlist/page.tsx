'use client';

import { useWallet } from '@/components/WalletProvider';

const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' };

export default function WatchlistPage() {
  const { btcAddresses, removeBtcAddress } = useWallet();

  return (
    <div>
      <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>Watchlist</h1>

      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Telegram Watchlist
        </div>
        <p style={{ color: '#888', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.5 }}>
          Use the Telegram bot to watch addresses and get DM alerts when balances change:
        </p>
        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '6px', padding: '12px', fontSize: '13px', color: '#ccc', fontFamily: 'monospace' }}>
          /watch bc1q...{'\n'}
          /unwatch bc1q...{'\n'}
          /watchlist{'\n'}
          /alerts on
        </div>
        <a
          href="https://t.me/BTC_Fi_Bot"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#f7931a', textDecoration: 'none', fontSize: '13px', display: 'inline-block', marginTop: '12px' }}
        >
          Open @BTC_Fi_Bot →
        </a>
      </div>

      {/* Dashboard-tracked addresses */}
      <div style={{ ...card }}>
        <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Dashboard Watchlist ({btcAddresses.length}/5)
        </div>
        {btcAddresses.length === 0 ? (
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>
            No addresses. Add them from the <a href="/dashboard/my-addresses" style={{ color: '#f7931a', textDecoration: 'none' }}>My Addresses</a> page.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {btcAddresses.map(addr => (
              <div key={addr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                <code style={{ color: '#fff', fontSize: '12px' }}>{addr.slice(0, 20)}...{addr.slice(-6)}</code>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`/safe?addr=${addr}`} style={{ color: '#f7931a', textDecoration: 'none', fontSize: '11px' }}>Check Safety</a>
                  <button
                    onClick={() => removeBtcAddress(addr)}
                    style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: '#444', fontSize: '11px', marginTop: '16px', textAlign: 'center' }}>
        Balance checks run every 10 minutes · Alerts sent via Telegram DM
      </p>
    </div>
  );
}
