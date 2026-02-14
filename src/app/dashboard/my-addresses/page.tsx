'use client';

import { useState } from 'react';
import { useWallet } from '@/components/WalletProvider';

const BTC_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;

const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' };
const label = { color: '#666', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '8px' };

interface AddressData {
  address: string;
  balance?: { confirmed?: { btc?: string; usd?: string } };
  risk?: { overallScore?: number; threatLevel?: string };
  loading: boolean;
}

export default function MyAddressesPage() {
  const { connected, address: walletAddr, chain, btcAddresses, addBtcAddress, removeBtcAddress } = useWallet();
  const [newAddr, setNewAddr] = useState('');
  const [addressData, setAddressData] = useState<Record<string, AddressData>>({});

  function handleAdd() {
    const addr = newAddr.trim();
    if (!BTC_REGEX.test(addr)) return;
    addBtcAddress(addr);
    setNewAddr('');
    loadAddressData(addr);
  }

  async function loadAddressData(addr: string) {
    setAddressData(prev => ({ ...prev, [addr]: { address: addr, loading: true } }));
    try {
      const [balRes, riskRes] = await Promise.all([
        fetch(`/api/v1/safe?addr=${encodeURIComponent(addr)}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/v1/safe?addr=${encodeURIComponent(addr)}`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      setAddressData(prev => ({
        ...prev,
        [addr]: {
          address: addr,
          risk: riskRes?.data ? { overallScore: riskRes.data.overallScore, threatLevel: riskRes.data.threatLevel } : undefined,
          loading: false,
        },
      }));
    } catch {
      setAddressData(prev => ({ ...prev, [addr]: { address: addr, loading: false } }));
    }
  }

  return (
    <div>
      <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>My Addresses</h1>

      {/* Wallet status */}
      {connected && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={label}>Connected Wallet</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>{chain === 'evm' ? '🔵' : '🟣'}</span>
            <code style={{ color: '#4ade80', fontSize: '13px' }}>{walletAddr}</code>
            <span style={{ color: '#666', fontSize: '11px' }}>{chain === 'evm' ? 'EVM' : 'Solana'}</span>
          </div>
        </div>
      )}

      {/* Add BTC address */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={label}>Watch Bitcoin Address (max 5)</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newAddr}
            onChange={e => setNewAddr(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="bc1q... or 1... or 3..."
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid #222',
              color: '#fff',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!BTC_REGEX.test(newAddr.trim()) || btcAddresses.length >= 5}
            style={{
              background: BTC_REGEX.test(newAddr.trim()) && btcAddresses.length < 5 ? '#f7931a' : '#333',
              color: BTC_REGEX.test(newAddr.trim()) && btcAddresses.length < 5 ? '#000' : '#666',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: BTC_REGEX.test(newAddr.trim()) && btcAddresses.length < 5 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Address list */}
      {btcAddresses.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#666', padding: '32px' }}>
          No addresses tracked yet. Add a Bitcoin address above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {btcAddresses.map(addr => {
            const data = addressData[addr];
            const riskColor = !data?.risk ? '#666' :
              data.risk.overallScore === 0 ? '#4ade80' :
              (data.risk.overallScore ?? 0) <= 30 ? '#4ade80' :
              (data.risk.overallScore ?? 0) <= 55 ? '#fbbf24' : '#ef4444';
            return (
              <div key={addr} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <code style={{ color: '#fff', fontSize: '13px', wordBreak: 'break-all' }}>{addr}</code>
                  {data?.risk && (
                    <div style={{ marginTop: '4px', fontSize: '12px' }}>
                      <span style={{ color: riskColor }}>Risk: {data.risk.overallScore}/100 ({data.risk.threatLevel})</span>
                    </div>
                  )}
                  {data?.loading && <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>Analyzing...</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                  {!data && (
                    <button
                      onClick={() => loadAddressData(addr)}
                      style={{ background: '#1a1a1a', border: '1px solid #333', color: '#888', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Scan
                    </button>
                  )}
                  <a
                    href={`/safe?addr=${addr}`}
                    style={{ background: '#1a1a1a', border: '1px solid #333', color: '#888', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', textDecoration: 'none', fontFamily: 'inherit' }}
                  >
                    Full Report
                  </a>
                  <button
                    onClick={() => removeBtcAddress(addr)}
                    style={{ background: 'transparent', border: '1px solid #333', color: '#666', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!connected && (
        <div style={{ marginTop: '24px', color: '#555', fontSize: '12px', textAlign: 'center' }}>
          Connect a wallet in the sidebar for elevated rate limits (500 req/min)
        </div>
      )}
    </div>
  );
}
