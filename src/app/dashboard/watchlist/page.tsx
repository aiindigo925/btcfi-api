'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/components/WalletProvider';

const API = 'https://btcfi.aiindigo.com';
const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' };

interface AddressBalance {
  btc: string;
  usd: string;
  lastSeen: string;
}

export default function WatchlistPage() {
  const { btcAddresses, removeBtcAddress } = useWallet();
  const [balances, setBalances] = useState<Record<string, AddressBalance>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchBalance = useCallback(async (addr: string) => {
    setLoading(prev => ({ ...prev, [addr]: true }));
    try {
      const res = await fetch(`${API}/api/v1/address/${encodeURIComponent(addr)}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const btc = data?.balance?.confirmed?.btc || '0';
      const usd = data?.balance?.confirmed?.usd || '$0';
      setBalances(prev => ({
        ...prev,
        [addr]: { btc, usd, lastSeen: new Date().toLocaleString() },
      }));
    } catch {
      setBalances(prev => ({
        ...prev,
        [addr]: { btc: '—', usd: '—', lastSeen: 'error' },
      }));
    } finally {
      setLoading(prev => ({ ...prev, [addr]: false }));
    }
  }, []);

  useEffect(() => {
    if (btcAddresses.length === 0) return;
    btcAddresses.forEach(addr => fetchBalance(addr));
  }, [btcAddresses, fetchBalance]);

  const totalBtc = btcAddresses.reduce((sum, addr) => {
    const b = balances[addr]?.btc;
    return sum + (b && b !== '—' ? parseFloat(b) : 0);
  }, 0);

  return (
    <div>
      <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>Watchlist</h1>

      {/* Portfolio summary */}
      {btcAddresses.length > 0 && (
        <div style={{ ...card, marginBottom: '16px', border: '1px solid #f7931a33' }}>
          <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Portfolio Value
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f7931a' }}>
            {totalBtc.toFixed(8)} BTC
          </div>
        </div>
      )}

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
            {btcAddresses.map(addr => {
              const bal = balances[addr];
              return (
                <div key={addr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <code style={{ color: '#fff', fontSize: '12px' }}>{addr.slice(0, 20)}...{addr.slice(-6)}</code>
                    {bal && (
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '12px' }}>
                        <span style={{ color: '#f7931a', fontWeight: 600 }}>{bal.btc} BTC</span>
                        <span style={{ color: '#888' }}>{bal.usd}</span>
                        {bal.lastSeen !== 'error' && (
                          <span style={{ color: '#555', fontSize: '11px' }}>Updated: {bal.lastSeen}</span>
                        )}
                      </div>
                    )}
                    {loading[addr] && <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>Loading balance...</div>}
                  </div>
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
              );
            })}
          </div>
        )}
      </div>

      <p style={{ color: '#444', fontSize: '11px', marginTop: '16px', textAlign: 'center' }}>
        Balances refresh on page load · Alerts sent via Telegram DM
      </p>
    </div>
  );
}
