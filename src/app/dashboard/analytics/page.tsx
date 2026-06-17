'use client';

import { useState, useEffect, useCallback } from 'react';

const API = '/api/v1';

// ============ Styles ============
const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' };
const cardTitle = { color: '#f7931a', fontSize: '14px', fontWeight: 600, marginBottom: '12px', borderBottom: '1px solid #1a1a1a', paddingBottom: '8px' };
const label = { color: '#666', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' };
const value = { color: '#fff', fontSize: '20px', fontWeight: 600 };
const subValue = { color: '#888', fontSize: '12px', marginTop: '4px' };
const inputStyle = { background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', color: '#e0e0e0', fontSize: '13px', fontFamily: "'SF Mono', 'Fira Code', monospace", width: '100%' };
const btnStyle = { background: '#f7931a', color: '#000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' as const };
const btnSecondary = { ...btnStyle, background: '#333', color: '#e0e0e0' };
const btnDanger = { ...btnStyle, background: '#ef4444' };

interface ApiKeyData {
  key: {
    keyHash: string;
    keyPreview: string;
    fullKey: string;
    tierInfo: { tier: string; label: string; dailyLimit: number | string; monthlyPrice: number };
    label: string;
    created: string;
    expires: string | null;
    active: boolean;
  };
  usage: {
    totalToday: number;
    dailyBreakdown: Record<string, number>;
    endpointBreakdown: Record<string, number>;
  };
  rateLimitStatus: {
    tier: string;
    dailyLimit: number | string;
    usedToday: number;
    remaining: number | string;
    allowed: boolean;
  };
  paymentHistory: {
    dailyUsd: Record<string, number>;
    totalUsd: number;
    byEndpoint: Record<string, number>;
  };
  uptime: {
    totalChecks: number;
    healthyChecks: number;
    uptimePercent: number;
    dailyHealth: Record<string, boolean>;
  };
  recentErrors: Array<{ timestamp: string; endpoint: string; statusCode: number; message: string }>;
}

function BarChart({ data, label: yLabel }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <div style={{ color: '#666', fontSize: '12px', padding: '16px', textAlign: 'center' as const }}>No data available</div>;
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px', marginBottom: '4px' }}>
        {entries.map(([date, val]) => {
          const h = (val / max) * 100;
          const shortDate = date.slice(5); // MM-DD
          return (
            <div key={date} title={`${date}: ${val.toLocaleString()} ${yLabel}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ width: '100%', height: `${h}%`, background: '#f7931a33', borderTop: '2px solid #f7931a', borderRadius: '2px 2px 0 0', minHeight: val > 0 ? '2px' : '0px' }} />
              {entries.length <= 15 && <div style={{ fontSize: '8px', color: '#666', marginTop: '2px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{shortDate}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginTop: '4px' }}>
        <span>{entries[0]?.[0]}</span>
        <span>{yLabel}</span>
        <span>{entries[entries.length - 1]?.[0]}</span>
      </div>
    </div>
  );
}

function HorizontalBarList({ items }: { items: Array<{ label: string; value: number; max: number }> }) {
  if (items.length === 0) return <div style={{ color: '#666', fontSize: '12px', padding: '16px', textAlign: 'center' as const }}>No data available</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '120px', color: '#888', fontSize: '11px', textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={item.label}>
            {item.label}
          </div>
          <div style={{ flex: 1, height: '16px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`, height: '100%', background: '#f7931a', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ width: '60px', color: '#fff', fontSize: '11px', textAlign: 'right' as const }}>{item.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: ok ? '#4ade80' : '#ef4444', marginRight: '6px' }} />;
}

export default function AnalyticsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(true);
  const [data, setData] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load stored key on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('btcfi_api_key') : null;
    if (stored) {
      setApiKey(stored);
      setShowKeyInput(false);
      fetchData(stored);
    }
  }, []);

  const fetchData = useCallback(async (key: string) => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api-keys/me`, {
        headers: { 'X-API-Key': key },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to fetch data');
        setData(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.startsWith('btcfi_')) {
      setError('Key must start with btcfi_');
      return;
    }
    localStorage.setItem('btcfi_api_key', apiKey);
    setShowKeyInput(false);
    fetchData(apiKey);
  };

  const handleLogout = () => {
    localStorage.removeItem('btcfi_api_key');
    setApiKey('');
    setData(null);
    setShowKeyInput(true);
    setError('');
  };

  const copyKey = async () => {
    if (!data?.key?.fullKey) return;
    await navigator.clipboard.writeText(data.key.fullKey);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handleRotate = async () => {
    if (!data?.key?.keyHash) return;
    try {
      const res = await fetch(`${API}/api-keys/${data.key.keyHash}/rotate`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
      });
      const json = await res.json();
      if (json.success && json.key) {
        localStorage.setItem('btcfi_api_key', json.key);
        setApiKey(json.key);
        fetchData(json.key);
      } else {
        setError(json.error || 'Rotation failed');
      }
    } catch {
      setError('Failed to rotate key');
    }
    setRotateConfirm(false);
  };

  // ============ Login Screen ============
  if (showKeyInput || !data) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto' }}>
        <div style={card}>
          <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '8px' }}>📊 Analytics Dashboard</h1>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>Enter your API key to view usage analytics, cost breakdown, and health monitoring.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <div style={label}>API Key</div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="btcfi_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style={inputStyle}
                autoFocus
              />
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <button type="submit" style={{ ...btnStyle, width: '100%' }}>View Analytics</button>
          </form>

          <div style={{ marginTop: '16px', fontSize: '11px', color: '#555', textAlign: 'center' as const }}>
            Don&apos;t have a key?{' '}
            <a href="/dashboard/api-keys" style={{ color: '#f7931a' }}>Create one</a>
          </div>
        </div>
      </div>
    );
  }

  // ============ Main Dashboard ============
  const tierConfig = data.key.tierInfo;
  const quotaLimit = typeof tierConfig.dailyLimit === 'string' ? Infinity : tierConfig.dailyLimit;
  const quotaUsed = data.rateLimitStatus.usedToday;
  const quotaRemaining = typeof data.rateLimitStatus.remaining === 'string' ? Infinity : data.rateLimitStatus.remaining;
  const quotaPct = quotaLimit === Infinity ? 0 : Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));

  // Build 30-day usage chart data
  const last30Days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last30Days[date] = data.usage.dailyBreakdown[date] || 0;
  }

  // Top 10 endpoints
  const topEndpoints = Object.entries(data.usage.endpointBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ep, count]) => ({ label: ep, value: count, max: Math.max(...Object.values(data.usage.endpointBreakdown), 1) }));

  // Cost data
  const costEndpoints = Object.entries(data.paymentHistory.byEndpoint)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ep, usd]) => ({ label: ep, value: Math.round(usd * 100) / 100, max: Math.max(...Object.values(data.paymentHistory.byEndpoint), 0.01) }));

  // Projected monthly: if avg daily * 30
  const dailyAvg = data.paymentHistory.dailyUsd
    ? Object.values(data.paymentHistory.dailyUsd).reduce((a, b) => a + b, 0) / Math.max(Object.keys(data.paymentHistory.dailyUsd).length, 1)
    : 0;
  const projectedMonthly = dailyAvg * 30;

  // Uptime daily checks
  const uptimeDays = Object.entries(data.uptime.dailyHealth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#f7931a', fontSize: '24px' }}>📊 Analytics</h1>
          <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
            {data.key.label || 'My API Key'} · {tierConfig.label} tier · {data.key.keyPreview}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={copyKey} style={btnSecondary}>📋 Copy Key</button>
          <button onClick={() => setRotateConfirm(true)} style={btnSecondary}>🔄 Rotate</button>
          <a href="/docs" target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-block' }}>📖 Docs</a>
          <a href="/dashboard/api-keys" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-block' }}>⬆ Upgrade</a>
          <button onClick={handleLogout} style={{ ...btnSecondary, background: '#333' }}>✕ Sign Out</button>
        </div>
      </div>

      {copyToast && <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#4ade80', color: '#000', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, zIndex: 100 }}>✓ Copied to clipboard</div>}

      {rotateConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <div style={{ ...card, maxWidth: '400px' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '12px' }}>Rotate API Key?</h3>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
              This will generate a new key and invalidate the current one. Make sure to update your integrations.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRotate} style={btnDanger}>Yes, Rotate</button>
              <button onClick={() => setRotateConfirm(false)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Loading analytics...</div>}
      {error && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px', padding: '8px', background: '#ef444422', borderRadius: '6px' }}>{error}</div>}

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={label}>Tier</div>
          <div style={{ ...value, color: tierConfig.tier === 'enterprise' ? '#a855f7' : tierConfig.tier === 'pro' ? '#4ade80' : '#888' }}>{tierConfig.label}</div>
          <div style={subValue}>${tierConfig.monthlyPrice}/mo · {tierConfig.dailyLimit === 'unlimited' ? 'Unlimited' : `${tierConfig.dailyLimit} req/day`}</div>
        </div>
        <div style={card}>
          <div style={label}>Today&apos;s Usage</div>
          <div style={value}>{quotaUsed}</div>
          <div style={{ ...subValue, color: quotaPct > 90 ? '#ef4444' : quotaPct > 70 ? '#f7931a' : '#4ade80' }}>
            {typeof quotaRemaining === 'number' ? `${quotaRemaining} remaining` : 'Unlimited'}
          </div>
          <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${quotaPct}%`, background: quotaPct > 90 ? '#ef4444' : quotaPct > 70 ? '#f7931a' : '#4ade80', borderRadius: '2px', transition: 'width 0.3s' }} />
          </div>
        </div>
        <div style={card}>
          <div style={label}>Total Revenue (USD)</div>
          <div style={{ ...value, color: '#4ade80' }}>${data.paymentHistory.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style={subValue}>Projected: ${projectedMonthly.toFixed(2)}/mo</div>
        </div>
        <div style={card}>
          <div style={label}>API Uptime (7d)</div>
          <div style={{ ...value, color: data.uptime.uptimePercent >= 99 ? '#4ade80' : data.uptime.uptimePercent >= 95 ? '#f7931a' : '#ef4444' }}>{data.uptime.uptimePercent}%</div>
          <div style={subValue}>{data.uptime.healthyChecks}/{data.uptime.totalChecks || '—'} checks</div>
        </div>
      </div>

      {/* Usage Analytics: Daily API Calls Bar Chart */}
      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={cardTitle}>📈 Daily API Calls (Last 30 Days)</div>
        <BarChart data={last30Days} label="calls" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Top Endpoints */}
        <div style={card}>
          <div style={cardTitle}>🔥 Top 10 Endpoints</div>
          <HorizontalBarList items={topEndpoints} />
        </div>

        {/* Cost Breakdown */}
        <div style={card}>
          <div style={cardTitle}>💰 Cost by Endpoint (USD)</div>
          <HorizontalBarList items={costEndpoints.map(c => ({ ...c, value: Math.round(c.value * 100) / 100, max: costEndpoints[0]?.max || 1 }))} />
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={label}>Total Spent</div>
              <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 600 }}>${data.paymentHistory.totalUsd.toFixed(2)}</div>
            </div>
            <div>
              <div style={label}>Projected Monthly</div>
              <div style={{ color: '#f7931a', fontSize: '16px', fontWeight: 600 }}>${projectedMonthly.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Health Monitoring: Uptime */}
        <div style={card}>
          <div style={cardTitle}>🛡️ API Uptime (Last 7 Days)</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {uptimeDays.length > 0 ? uptimeDays.map(([date, ok]) => (
              <div key={date} title={`${date}: ${ok ? 'Healthy' : 'Down'}`} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' }}>
                <StatusDot ok={ok} />
                <div style={{ fontSize: '10px', color: '#666' }}>{date.slice(5)}</div>
              </div>
            )) : (
              <div style={{ color: '#666', fontSize: '12px' }}>No uptime data recorded yet. Data accumulates as the API runs.</div>
            )}
          </div>
          <div style={{ ...subValue, color: data.uptime.uptimePercent >= 99 ? '#4ade80' : '#ef4444' }}>
            Overall: {data.uptime.uptimePercent}% uptime
          </div>
        </div>

        {/* Rate Limit Status */}
        <div style={card}>
          <div style={cardTitle}>⚡ Rate Limit Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={label}>Limit</div>
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{data.rateLimitStatus.dailyLimit === 'unlimited' ? '∞' : data.rateLimitStatus.dailyLimit}</div>
            </div>
            <div>
              <div style={label}>Used Today</div>
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{data.rateLimitStatus.usedToday}</div>
            </div>
            <div>
              <div style={label}>Remaining</div>
              <div style={{ color: data.rateLimitStatus.remaining === 'unlimited' ? '#4ade80' : '#f7931a', fontSize: '16px', fontWeight: 600 }}>
                {data.rateLimitStatus.remaining === 'unlimited' ? '∞' : data.rateLimitStatus.remaining}
              </div>
            </div>
            <div>
              <div style={label}>Status</div>
              <div style={{ color: data.rateLimitStatus.allowed ? '#4ade80' : '#ef4444', fontSize: '16px', fontWeight: 600 }}>
                {data.rateLimitStatus.allowed ? '✅ OK' : '🚫 Throttled'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Failed Requests */}
      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={cardTitle}>❌ Recent Failed Requests</div>
        {data.recentErrors.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <th style={{ textAlign: 'left', color: '#666', padding: '6px 8px' }}>Time</th>
                  <th style={{ textAlign: 'left', color: '#666', padding: '6px 8px' }}>Endpoint</th>
                  <th style={{ textAlign: 'left', color: '#666', padding: '6px 8px' }}>Status</th>
                  <th style={{ textAlign: 'left', color: '#666', padding: '6px 8px' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {data.recentErrors.map((err, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ color: '#888', padding: '6px 8px', whiteSpace: 'nowrap' as const }}>{err.timestamp ? new Date(err.timestamp).toLocaleString() : '—'}</td>
                    <td style={{ color: '#e0e0e0', padding: '6px 8px' }}>{err.endpoint || '—'}</td>
                    <td style={{ color: err.statusCode >= 500 ? '#ef4444' : '#f7931a', padding: '6px 8px', fontWeight: 600 }}>{err.statusCode || '—'}</td>
                    <td style={{ color: '#888', padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{err.message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: '12px', padding: '16px', textAlign: 'center' as const }}>
            🎉 No recent errors. Your API usage is clean!
          </div>
        )}
      </div>

      {/* Key Info Footer */}
      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={cardTitle}>🔑 API Key Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <div style={label}>Key Preview</div>
            <div style={{ color: '#e0e0e0', fontSize: '13px', fontFamily: "'SF Mono', monospace" }}>{data.key.keyPreview}</div>
          </div>
          <div>
            <div style={label}>Tier</div>
            <div style={{ color: '#e0e0e0', fontSize: '13px' }}>{data.key.tierInfo.label} (${data.key.tierInfo.monthlyPrice}/mo)</div>
          </div>
          <div>
            <div style={label}>Created</div>
            <div style={{ color: '#e0e0e0', fontSize: '13px' }}>{new Date(data.key.created).toLocaleDateString()}</div>
          </div>
          <div>
            <div style={label}>Expires</div>
            <div style={{ color: '#e0e0e0', fontSize: '13px' }}>{data.key.expires ? new Date(data.key.expires).toLocaleDateString() : 'Never'}</div>
          </div>
          <div>
            <div style={label}>Status</div>
            <div style={{ color: data.key.active ? '#4ade80' : '#ef4444', fontSize: '13px' }}>{data.key.active ? 'Active' : 'Inactive'}</div>
          </div>
          <div>
            <div style={label}>Daily Limit</div>
            <div style={{ color: '#e0e0e0', fontSize: '13px' }}>{tierConfig.dailyLimit === 'unlimited' ? '∞' : tierConfig.dailyLimit}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>
        Last updated: {new Date().toLocaleTimeString()} · Data from btcfi.aiindigo.com · <a href="/docs" style={{ color: '#f7931a' }}>View API Docs</a>
      </div>
    </div>
  );
}
