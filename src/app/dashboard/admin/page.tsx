'use client';

import { useState, useEffect } from 'react';

const API = ''; // relative URLs for portability

export default function AdminDashboard() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function authenticate() {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/stats`, {
        headers: { 'X-Admin-Key': key.trim() },
      });
      if (!res.ok) throw new Error('Invalid admin key');
      const d = await res.json();
      setData(d);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || 'Auth failed');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/admin/stats`, {
          headers: { 'X-Admin-Key': key },
        });
        if (res.ok) setData(await res.json());
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [authed, key]);

  const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '12px' };
  const label = { color: '#666', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' };
  const val = { color: '#fff', fontSize: '20px', fontWeight: 600 };

  if (!authed) {
    return (
      <div>
        <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>🔐 Admin</h1>
        <div style={{ ...card, maxWidth: '400px' }}>
          <div style={label}>Admin API Key</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && authenticate()}
              placeholder="Enter ADMIN_API_KEY"
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid #222', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontFamily: 'inherit', fontSize: '13px' }}
            />
            <button onClick={authenticate} disabled={loading}
              style={{ background: '#f7931a', color: '#000', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? '...' : 'Login'}
            </button>
          </div>
          {error && <div style={{ color: '#ef4444', marginTop: '8px', fontSize: '13px' }}>{error}</div>}
        </div>
      </div>
    );
  }

  const rev = data?.revenue || {};
  const rl = data?.rateLimits || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#f7931a', fontSize: '24px' }}>📊 Admin Dashboard</h1>
        <span style={{ color: '#666', fontSize: '11px' }}>Auto-refresh 30s · {data?.revenue?.source === 'kv' ? '🟢 Upstash' : '🟡 Memory'}</span>
      </div>

      {/* Revenue cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={label}>Today Revenue</div>
          <div style={{ ...val, color: '#4ade80' }}>${rev.day || '0.00'}</div>
          <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{rev.requestsDay || 0} requests</div>
        </div>
        <div style={card}>
          <div style={label}>Week Revenue</div>
          <div style={{ ...val, color: '#4ade80' }}>${rev.week || '0.00'}</div>
        </div>
        <div style={card}>
          <div style={label}>Total Revenue</div>
          <div style={{ ...val, color: '#f7931a' }}>${rev.total || '0.00'}</div>
        </div>
        <div style={card}>
          <div style={label}>Paid Requests Today</div>
          <div style={val}>{rev.paidRequestsDay || 0}</div>
        </div>
      </div>

      {/* Revenue by tier */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Revenue by Tier</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Object.entries(rev.byTier || {}).filter(([, v]) => (v as number) > 0).map(([tier, amount]) => (
            <div key={tier} style={{ textAlign: 'center' as const }}>
              <div style={{ color: '#888', fontSize: '12px' }}>{tier}</div>
              <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 600 }}>${(amount as number).toFixed(2)}</div>
            </div>
          ))}
          {Object.keys(rev.byTier || {}).length === 0 && (
            <div style={{ color: '#444', gridColumn: '1/-1', textAlign: 'center' as const }}>No paid requests yet</div>
          )}
        </div>
      </div>

      {/* Rate Limits */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Rate Limit Tiers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Object.entries(rl.tiers || {}).map(([tier, limit]) => (
            <div key={tier} style={{ textAlign: 'center' as const }}>
              <div style={{ color: '#888', fontSize: '12px' }}>{tier}</div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{limit as string}</div>
              <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                {tier === 'free' ? `${rl.freeActive || 0} active` :
                 tier === 'signed' ? `${rl.signedActive || 0} active` :
                 tier === 'paid' ? `${rl.paidActive || 0} active` :
                 `${rl.stakedActive || 0} active`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Endpoints */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Top Endpoints</div>
        {(data?.topEndpoints || []).map((ep: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
            <span style={{ color: '#f7931a', fontSize: '13px', fontFamily: 'monospace' }}>{ep.path}</span>
            <span style={{ color: '#888', fontSize: '13px' }}>{ep.count} hits</span>
          </div>
        ))}
        {(!data?.topEndpoints || data.topEndpoints.length === 0) && (
          <div style={{ color: '#444', textAlign: 'center' as const }}>No endpoint data yet</div>
        )}
      </div>

      {/* Daily Chart */}
      {data?.daily && Object.keys(data.daily).length > 0 && (
        <div style={card}>
          <div style={{ ...label, marginBottom: '12px' }}>Daily Requests (7d)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
            {Object.entries(data.daily).reverse().map(([date, count]: [string, any]) => {
              const maxCount = Math.max(...Object.values(data.daily).map(Number));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                  <div style={{ width: '100%', height: `${height}%`, background: '#f7931a33', borderTop: '2px solid #f7931a', borderRadius: '2px 2px 0 0', minHeight: count > 0 ? '4px' : '0px' }} />
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>{date.slice(5)}</div>
                  <div style={{ fontSize: '9px', color: '#888' }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Treasury */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '8px' }}>Treasury Wallets</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
          <div>Base: {rev.treasury?.base || 'not set'}</div>
          <div style={{ marginTop: '4px' }}>Solana: {rev.treasury?.solana || 'not set'}</div>
        </div>
      </div>

      <div style={{ color: '#444', fontSize: '11px', marginTop: '16px' }}>
        Last updated: {data?.timestamp || '—'}
      </div>
    </div>
  );
}
