'use client';

import { useState, useEffect, useCallback } from 'react';

interface KeyInfo {
  key: string;
  keyHash: string;
  tier: string;
  label: string;
  created: string;
  expires: string | null;
  active: boolean;
  usage?: {
    totalToday: number;
    dailyBreakdown: Record<string, number>;
    endpointBreakdown: Record<string, number>;
    dailyEndpointBreakdown: Record<string, Record<string, number>>;
  };
}

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  enterprise: Infinity,
};

const TIER_COLORS: Record<string, string> = {
  free: '#888',
  pro: '#f7931a',
  enterprise: '#4ade80',
};

const TIER_PRICES: Record<string, string> = {
  free: 'Free',
  pro: '$29/mo',
  enterprise: '$299/mo',
};

const card: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '12px' };
const label: React.CSSProperties = { color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' };
const val: React.CSSProperties = { color: '#fff', fontSize: '20px', fontWeight: 600 };
const subVal: React.CSSProperties = { color: '#888', fontSize: '12px', marginTop: '4px' };

function UsageBar({ used, limit, tier }: { used: number; limit: number | typeof Infinity; tier: string }) {
  const pct = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f7931a' : TIER_COLORS[tier] || '#888';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#aaa' }}>{used} / {limit === Infinity ? '∞' : limit} calls today</span>
        {limit !== Infinity && <span style={{ fontSize: '11px', color }}>{pct.toFixed(0)}%</span>}
      </div>
      <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${limit === Infinity ? 0 : pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function MiniBarChart({ data, maxVal }: { data: [string, number][]; maxVal: number }) {
  if (data.length === 0) return <div style={{ color: '#444', textAlign: 'center', padding: '16px', fontSize: '12px' }}>No usage data yet</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px', padding: '4px 0' }}>
      {data.map(([date, count]) => {
        const height = maxVal > 0 ? (count / maxVal) * 100 : 0;
        return (
          <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(height, count > 0 ? 2 : 0)}%`,
                background: '#f7931a33',
                borderTop: '2px solid #f7931a',
                borderRadius: '2px 2px 0 0',
              }}
              title={`${date}: ${count} calls`}
            />
            {date.endsWith('-01') || date === data[0]?.[0] ? (
              <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>{date.slice(5)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState('');
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeyInfo = useCallback(async (key: string) => {
    try {
      const res = await fetch('/api/v1/api-keys/me', {
        headers: { 'X-API-Key': key },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setKeyInfo(data.key);
      } else {
        throw new Error(data.error || 'Failed to fetch key info');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch key info';
      setError(msg);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('btcfi_api_key') : null;
    if (stored) {
      setApiKey(stored);
      fetchKeyInfo(stored);
    }
  }, [fetchKeyInfo]);

  async function handleAuth() {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/api-keys/me', {
        headers: { 'X-API-Key': apiKey.trim() },
      });
      if (!res.ok) throw new Error('Invalid API key');
      const data = await res.json();
      if (data.success) {
        setKeyInfo(data.key);
        localStorage.setItem('btcfi_api_key', apiKey.trim());
      } else {
        throw new Error(data.error || 'Invalid key');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Auth failed';
      setError(msg);
    }
    setLoading(false);
  }

  function handleLogout() {
    setApiKey('');
    setKeyInfo(null);
    localStorage.removeItem('btcfi_api_key');
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Auth gate
  if (!keyInfo) {
    return (
      <div>
        <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>🔑 API Keys</h1>
        <div style={{ ...card, maxWidth: '480px' }}>
          <div style={{ ...label, marginBottom: '12px' }}>Enter your API Key</div>
          <p style={{ color: '#666', fontSize: '12px', marginBottom: '12px' }}>
            Get your API key from the admin dashboard, or contact support to request one.
            API keys provide a simpler alternative to x402 micropayments.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="btcfi_..."
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid #222', borderRadius: '6px', padding: '10px 12px', color: '#fff', fontFamily: 'monospace', fontSize: '13px' }}
            />
            <button onClick={handleAuth} disabled={loading}
              style={{ background: '#f7931a', color: '#000', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? '...' : 'Connect'}
            </button>
          </div>
          {error && <div style={{ color: '#ef4444', marginTop: '8px', fontSize: '13px' }}>{error}</div>}
        </div>

        {/* Tier info */}
        <div style={{ ...card, maxWidth: '640px' }}>
          <div style={{ ...label, marginBottom: '12px' }}>Available Tiers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {(['free', 'pro', 'enterprise'] as const).map((tier) => (
              <div key={tier} style={{ background: '#0a0a0a', border: `1px solid ${TIER_COLORS[tier]}33`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ color: TIER_COLORS[tier], fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{TIER_PRICES[tier]}</div>
                <div style={{ color: '#888', fontSize: '12px' }}>{TIER_LIMITS[tier] === Infinity ? 'Unlimited' : `${TIER_LIMITS[tier]}/day`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view
  const usage = keyInfo.usage;
  const dailySorted = usage?.dailyBreakdown
    ? Object.entries(usage.dailyBreakdown).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const endpointSorted = usage?.endpointBreakdown
    ? Object.entries(usage.endpointBreakdown).sort(([, a], [, b]) => b - a)
    : [];
  const maxDaily = dailySorted.length > 0 ? Math.max(...dailySorted.map(([, v]) => v), 1) : 1;
  const tierLimit = TIER_LIMITS[keyInfo.tier] || Infinity;
  const tierColor = TIER_COLORS[keyInfo.tier] || '#888';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#f7931a', fontSize: '24px' }}>🔑 API Key Dashboard</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: '11px' }}>Connected</span>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', padding: '4px 8px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>Disconnect</button>
        </div>
      </div>

      {/* Key info card */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={label}>Your API Key</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <code style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', padding: '8px 12px', color: '#f7931a', fontFamily: 'monospace', fontSize: '13px' }}>
                {apiKey.slice(0, 11)}...{apiKey.slice(-4)}
              </code>
              <button onClick={copyKey}
                style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', padding: '4px 8px', color: copied ? '#4ade80' : '#888', fontSize: '11px', cursor: 'pointer' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={label}>Tier</div>
            <div style={{ color: tierColor, fontSize: '16px', fontWeight: 600, marginTop: '4px' }}>
              {keyInfo.tier.charAt(0).toUpperCase() + keyInfo.tier.slice(1)}
            </div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>{TIER_PRICES[keyInfo.tier]}</div>
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ color: '#666', fontSize: '11px' }}>Created</div>
            <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>{new Date(keyInfo.created).toLocaleDateString()}</div>
          </div>
          {keyInfo.expires && (
            <div>
              <div style={{ color: '#666', fontSize: '11px' }}>Expires</div>
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>{new Date(keyInfo.expires).toLocaleDateString()}</div>
            </div>
          )}
          <div>
            <div style={{ color: '#666', fontSize: '11px' }}>Label</div>
            <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>{keyInfo.label}</div>
          </div>
        </div>
      </div>

      {/* Usage today */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={card}>
          <div style={label}>Today&apos;s Usage</div>
          <div style={{ ...val, color: tierColor, marginTop: '8px' }}>{usage?.totalToday || 0}</div>
          <div style={{ ...subVal, marginBottom: '12px' }}>of {tierLimit === Infinity ? '∞' : tierLimit} daily limit</div>
          <UsageBar used={usage?.totalToday || 0} limit={tierLimit} tier={keyInfo.tier} />
        </div>
        <div style={card}>
          <div style={label}>Rate Limit Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: (usage?.totalToday || 0) < tierLimit ? '#4ade80' : '#ef4444' }} />
            <span style={{ color: '#fff', fontSize: '14px' }}>
              {(usage?.totalToday || 0) < tierLimit ? 'Within limits' : 'Limit reached'}
            </span>
          </div>
          <div style={{ ...subVal, marginTop: '8px' }}>
            Resets at midnight UTC
          </div>
          {keyInfo.tier !== 'enterprise' && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#0a0a0a', borderRadius: '6px', border: '1px solid #222' }}>
              <span style={{ color: '#888', fontSize: '11px' }}>
                💡 Upgrade to {keyInfo.tier === 'free' ? 'Pro ($29/mo, 1000/day)' : 'Enterprise ($299/mo, unlimited)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Usage chart */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Daily Calls (Last 30 Days)</div>
        <MiniBarChart data={dailySorted} maxVal={maxDaily} />
      </div>

      {/* Endpoint breakdown */}
      {endpointSorted.length > 0 && (
        <div style={card}>
          <div style={{ ...label, marginBottom: '12px' }}>Top Endpoints</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {endpointSorted.slice(0, 10).map(([ep, count]) => {
              const maxCount = endpointSorted[0]?.[1] || 1;
              const barWidth = (count / maxCount) * 100;
              return (
                <div key={ep} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '200px', fontSize: '11px', color: '#aaa', fontFamily: 'monospace', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ep}
                  </div>
                  <div style={{ flex: 1, height: '14px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: '#f7931a', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ width: '50px', fontSize: '11px', color: '#4ade80', fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Usage guide */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Quick Start</div>
        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#ccc', fontFamily: 'monospace', whiteSpace: 'pre', overflowX: 'auto' }}>{`# Include your API key in requests
curl -H "X-API-Key: ${apiKey.slice(0, 11)}..." \\
     https://btcfi.aiindigo.com/api/v1/fees

# Response includes usage headers:
# X-API-Key-Tier: free
# X-API-Key-Remaining: 99
# X-API-Key-Daily-Limit: 100`}</div>
      </div>

      <div style={{ color: '#444', fontSize: '11px', marginTop: '16px' }}>
        API Keys · Tier-based daily quotas · Dashboard auto-refreshes on page load
      </div>
    </div>
  );
}
