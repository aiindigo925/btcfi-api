'use client';

import { useState } from 'react';

const API = 'https://btcfi.aiindigo.com';
const BTC_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;

export default function AddressPage() {
  const [addr, setAddr] = useState('');
  const [data, setData] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup() {
    const trimmed = addr.trim();
    if (!trimmed) return;

    // Validate Bitcoin address format client-side
    if (!BTC_REGEX.test(trimmed)) {
      setError('Invalid Bitcoin address format. Must start with 1, 3, or bc1.');
      return;
    }

    setLoading(true); setError(''); setData(null); setRisk(null);
    try {
      const [addrRes, riskRes] = await Promise.all([
        fetch(`${API}/api/v1/address/${trimmed}`).then(r => {
          if (!r.ok) throw new Error(`Address lookup failed (${r.status})`);
          return r.json();
        }),
        fetch(`${API}/api/v1/intelligence/risk/${trimmed}`).then(r => {
          if (!r.ok) return null;
          return r.json();
        }).catch(() => null),
      ]);
      setData(addrRes);
      setRisk(riskRes);
    } catch (e: any) {
      setError(e.message || 'Failed to look up address');
    }
    setLoading(false);
  }

  const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '12px' };

  return (
    <div>
      <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>Address Lookup</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          value={addr} onChange={e => setAddr(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="bc1..., 1..., or 3..."
          style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontFamily: 'inherit', fontSize: '13px' }}
        />
        <button onClick={lookup} disabled={loading}
          style={{ background: '#f7931a', color: '#000', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
          {loading ? '...' : 'Analyze'}
        </button>
      </div>

      {loading && (
        <div style={{ ...card, textAlign: 'center', padding: '24px' }}>
          <div style={{ color: '#f7931a', fontSize: '13px' }}>Analyzing address...</div>
        </div>
      )}

      {error && (
        <div style={{ ...card, border: '1px solid #ef444433' }}>
          <div style={{ color: '#ef4444', fontSize: '13px' }}>⚠ {error}</div>
        </div>
      )}

      {data && (
        <>
          <div style={card}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>BALANCE</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#f7931a' }}>{data.balance?.confirmed?.btc || '0'} BTC</div>
            <div style={{ color: '#888', marginTop: '4px' }}>{data.balance?.confirmed?.usd || '$0'}</div>
            {data.balance?.pending?.sats > 0 && (
              <div style={{ color: '#fbbf24', marginTop: '4px', fontSize: '12px' }}>
                Pending: {data.balance.pending.btc} BTC ({data.balance.pending.usd})
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={card}>
              <div style={{ color: '#666', fontSize: '11px' }}>Transactions</div>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>{data.stats?.txCount || 0}</div>
            </div>
            <div style={card}>
              <div style={{ color: '#666', fontSize: '11px' }}>Funded</div>
              <div style={{ color: '#4ade80', fontSize: '18px', fontWeight: 600 }}>{data.stats?.fundedTxos || 0}</div>
            </div>
            <div style={card}>
              <div style={{ color: '#666', fontSize: '11px' }}>Spent</div>
              <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 600 }}>{data.stats?.spentTxos || 0}</div>
            </div>
          </div>

          {risk?.data && (
            <div style={card}>
              <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>RISK SCORE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: (risk.data.riskScore || 0) < 30 ? '#4ade80' : (risk.data.riskScore || 0) < 70 ? '#fbbf24' : '#ef4444' }}>
                  {risk.data.riskScore || 0}
                </div>
                <div>
                  <div style={{ color: '#fff' }}>Grade {risk.data.riskGrade || '?'} — {risk.data.summary?.split('.')[0] || 'Unknown'}</div>
                  <div style={{ height: '6px', width: '200px', background: '#1a1a1a', borderRadius: '3px', marginTop: '4px' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px', width: `${risk.data.riskScore || 0}%`,
                      background: (risk.data.riskScore || 0) < 30 ? '#4ade80' : (risk.data.riskScore || 0) < 70 ? '#fbbf24' : '#ef4444',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
