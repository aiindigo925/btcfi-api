'use client';

import { useState, useEffect, useCallback } from 'react';

interface RevenueV2Data {
  source: 'kv' | 'memory';
  totalUsd: number;
  dailyUsd: Record<string, number>;
  weeklyUsd: Record<string, number>;
  monthlyUsd: Record<string, number>;
  byNetwork: Record<string, number>;
  byEndpoint: Record<string, number>;
  paymentCounts: {
    total: number;
    byNetwork: Record<string, number>;
    byTier: Record<string, number>;
    daily: Record<string, number>;
  };
}

const card: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '12px' };
const label: React.CSSProperties = { color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' };
const val: React.CSSProperties = { color: '#fff', fontSize: '20px', fontWeight: 600 };
const subVal: React.CSSProperties = { color: '#888', fontSize: '12px', marginTop: '4px' };

const ENDPOINT_LABELS: Record<string, string> = {
  signal: 'Signal',
  entity: 'Entity Intel',
  portfolio: 'Portfolio',
  history: 'History',
  'mempool-intel': 'Mempool',
  mining: 'Mining',
  'hodl-waves': 'HODL Waves',
  sopr: 'SOPR',
  mvrv: 'MVRV',
  lightning: 'Lightning',
  l2: 'L2',
  intelligence: 'Intelligence',
  solv: 'Solv',
  security: 'Security',
  broadcast: 'Broadcast',
  'zk-verify': 'ZK Verify',
  'zk-generate': 'ZK Generate',
  stream: 'Stream',
  ordinals: 'Ordinals',
  marketplace: 'Marketplace',
  price: 'Price',
  fees: 'Fees',
  alerts: 'Alerts',
  address: 'Address',
  'tx-status': 'TX Status',
  standard: 'Standard',
};

const NETWORK_COLORS: Record<string, string> = {
  base: '#0052ff',
  solana: '#9945ff',
};

function BarChart({ data, maxVal, colorFn }: { data: [string, number][]; maxVal: number; colorFn?: (key: string) => string }) {
  if (data.length === 0) return <div style={{ color: '#444', textAlign: 'center', padding: '16px' }}>No data yet</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px', padding: '4px 0' }}>
      {data.map(([key, val]) => {
        const height = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const bg = colorFn ? colorFn(key) : '#f7931a';
        return (
          <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(height, val > 0 ? 2 : 0)}%`,
                background: `${bg}33`,
                borderTop: `2px solid ${bg}`,
                borderRadius: '2px 2px 0 0',
              }}
              title={`$${val.toFixed(4)}`}
            />
            <div style={{ fontSize: '8px', color: '#666', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
              {key.length > 5 ? key.slice(5) : key}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarList({ data, total }: { data: [string, number][]; total: number }) {
  if (data.length === 0) return <div style={{ color: '#444', textAlign: 'center', padding: '16px' }}>No data yet</div>;
  const maxRev = Math.max(...data.map(([, v]) => v));
  const colors = ['#f7931a', '#4ade80', '#60a5fa', '#c084fc', '#fb923c', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#38bdf8'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {data.map(([key, rev], i) => {
        const pct = total > 0 ? (rev / total) * 100 : 0;
        const barWidth = maxRev > 0 ? (rev / maxRev) * 100 : 0;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '100px', fontSize: '12px', color: '#aaa', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ENDPOINT_LABELS[key] || key}
            </div>
            <div style={{ flex: 1, height: '18px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  background: colors[i % colors.length],
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ width: '80px', fontSize: '12px', color: '#4ade80', fontFamily: 'monospace', flexShrink: 0 }}>
              ${rev.toFixed(2)}
            </div>
            <div style={{ width: '40px', fontSize: '11px', color: '#666', textAlign: 'right', flexShrink: 0 }}>
              {pct.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, size = 120 }: { data: [string, number][]; size?: number }) {
  const total = data.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return <div style={{ color: '#444', textAlign: 'center', padding: '16px' }}>No data</div>;

  const colors = ['#0052ff', '#9945ff', '#4ade80', '#f7931a', '#60a5fa', '#c084fc'];
  let accumulated = 0;

  const segments = data.map(([key, val], i) => {
    const pct = val / total;
    const startAngle = accumulated * 360;
    accumulated += pct;
    const endAngle = accumulated * 360;
    return { key, val, pct, color: colors[i % colors.length], startAngle, endAngle };
  });

  // Build conic-gradient string
  const gradientParts: string[] = [];
  segments.forEach((s) => {
    gradientParts.push(`${s.color} ${s.startAngle}deg ${s.endAngle}deg`);
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `conic-gradient(${gradientParts.join(', ')})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '25%',
            width: '50%',
            height: '50%',
            borderRadius: '50%',
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: '14px', color: '#4ade80', fontWeight: 700 }}>${total.toFixed(2)}</div>
          <div style={{ fontSize: '8px', color: '#666' }}>TOTAL</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {segments.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#aaa' }}>{ENDPOINT_LABELS[s.key] || s.key}</span>
            <span style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'monospace' }}>${s.val.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RevenuePage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<RevenueV2Data | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (adminKey: string) => {
    try {
      const res = await fetch('/api/admin/revenue-v2', {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setData(d.revenue);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    }
  }, []);

  async function authenticate() {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/revenue-v2', {
        headers: { 'X-Admin-Key': key.trim() },
      });
      if (!res.ok) throw new Error('Invalid admin key');
      const d = await res.json();
      setData(d.revenue);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || 'Auth failed');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => fetchData(key), 30000);
    return () => clearInterval(interval);
  }, [authed, key, fetchData]);

  if (!authed) {
    return (
      <div>
        <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>💰 Revenue Dashboard</h1>
        <div style={{ ...card, maxWidth: '400px' }}>
          <div style={label}>Admin API Key</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && authenticate()}
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

  const dailySorted = data?.dailyUsd
    ? Object.entries(data.dailyUsd).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const monthlySorted = data?.monthlyUsd
    ? Object.entries(data.monthlyUsd).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const endpointSorted = data?.byEndpoint
    ? Object.entries(data.byEndpoint).sort(([, a], [, b]) => b - a)
    : [];
  const networkSorted = data?.byNetwork
    ? Object.entries(data.byNetwork).sort(([, a], [, b]) => b - a)
    : [];

  // Compute derived metrics
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const todayUsd = data?.dailyUsd?.[todayKey] || 0;

  // Last 7 days total
  const last7DaysUsd = dailySorted.slice(-7).reduce((sum, [, v]) => sum + v, 0);

  // Last 30 days total
  const last30DaysUsd = dailySorted.reduce((sum, [, v]) => sum + v, 0);

  const avgDaily = dailySorted.length > 0 ? last30DaysUsd / Math.max(dailySorted.filter(([, v]) => v > 0).length, 1) : 0;
  const projectedMonthly = avgDaily * 30;

  const maxDaily = Math.max(...dailySorted.map(([, v]) => v), 0);
  const maxMonthly = Math.max(...monthlySorted.map(([, v]) => v), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#f7931a', fontSize: '24px' }}>💰 Revenue Dashboard</h1>
        <span style={{ color: '#666', fontSize: '11px' }}>
          V2 · Auto-refresh 30s · {data?.source === 'kv' ? '🟢 Upstash' : '🟡 Memory'}
        </span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={label}>Today</div>
          <div style={{ ...val, color: '#4ade80' }}>${todayUsd.toFixed(2)}</div>
          <div style={subVal}>{data?.paymentCounts?.daily?.[todayKey] || 0} payments</div>
        </div>
        <div style={card}>
          <div style={label}>7 Days</div>
          <div style={{ ...val, color: '#4ade80' }}>${last7DaysUsd.toFixed(2)}</div>
        </div>
        <div style={card}>
          <div style={label}>30 Days</div>
          <div style={{ ...val, color: '#4ade80' }}>${last30DaysUsd.toFixed(2)}</div>
        </div>
        <div style={card}>
          <div style={label}>All Time</div>
          <div style={{ ...val, color: '#f7931a' }}>${(data?.totalUsd || 0).toFixed(2)}</div>
          <div style={subVal}>{data?.paymentCounts?.total || 0} total payments</div>
        </div>
        <div style={card}>
          <div style={label}>Projected Monthly</div>
          <div style={{ ...val, color: '#60a5fa' }}>${projectedMonthly.toFixed(2)}</div>
          <div style={subVal}>avg ${avgDaily.toFixed(2)}/day</div>
        </div>
      </div>

      {/* Network breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={card}>
          <div style={{ ...label, marginBottom: '12px' }}>Revenue by Network</div>
          <DonutChart data={networkSorted} size={110} />
        </div>
        <div style={card}>
          <div style={{ ...label, marginBottom: '12px' }}>Network Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {networkSorted.map(([net, rev]) => (
              <div key={net} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0a0a0a', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: NETWORK_COLORS[net] || '#888' }} />
                  <span style={{ color: '#fff', fontSize: '13px', textTransform: 'capitalize' }}>{net}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>${rev.toFixed(2)}</div>
                  <div style={{ color: '#666', fontSize: '11px' }}>{data?.paymentCounts?.byNetwork?.[net] || 0} payments</div>
                </div>
              </div>
            ))}
            {networkSorted.length === 0 && <div style={{ color: '#444', textAlign: 'center' }}>No network data yet</div>}
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Daily Revenue (30d)</div>
        {dailySorted.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: '100px' }}>
            {dailySorted.map(([date, rev]) => {
              const height = maxDaily > 0 ? (rev / maxDaily) * 100 : 0;
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(height, rev > 0 ? 2 : 0)}%`,
                      background: '#f7931a33',
                      borderTop: '2px solid #f7931a',
                      borderRadius: '2px 2px 0 0',
                    }}
                    title={`${date}: $${rev.toFixed(4)}`}
                  />
                  {date.endsWith('-01') || date === dailySorted[0]?.[0] ? (
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>{date.slice(5)}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#444', textAlign: 'center', padding: '24px' }}>No daily revenue data yet</div>
        )}
      </div>

      {/* Monthly chart */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Monthly Revenue</div>
        {monthlySorted.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
            {monthlySorted.map(([month, rev]) => {
              const height = maxMonthly > 0 ? (rev / maxMonthly) * 100 : 0;
              return (
                <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '4px', fontFamily: 'monospace' }}>${rev.toFixed(2)}</div>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(height, rev > 0 ? 4 : 0)}%`,
                      background: '#4ade8033',
                      borderTop: '2px solid #4ade80',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{month}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#444', textAlign: 'center', padding: '24px' }}>No monthly revenue data yet</div>
        )}
      </div>

      {/* Endpoint breakdown */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Revenue by Endpoint</div>
        <HorizontalBarList data={endpointSorted} total={data?.totalUsd || 0} />
      </div>

      {/* Payment counts (backward-compatible) */}
      <div style={card}>
        <div style={{ ...label, marginBottom: '12px' }}>Payment Counts (Legacy)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
          {Object.entries(data?.paymentCounts?.byTier || {})
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([tier, count]) => (
              <div key={tier} style={{ textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '11px' }}>{tier}</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{count}</div>
              </div>
            ))}
          {Object.keys(data?.paymentCounts?.byTier || {}).length === 0 && (
            <div style={{ color: '#444', gridColumn: '1/-1', textAlign: 'center' }}>No payment data yet</div>
          )}
        </div>
      </div>

      <div style={{ color: '#444', fontSize: '11px', marginTop: '16px' }}>
        Revenue V2 · USD value = payment count × endpoint price · Data source: {data?.source || 'unknown'}
      </div>
    </div>
  );
}
