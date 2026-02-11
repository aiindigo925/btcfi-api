/**
 * Dashboard Overview — live data from BTCFi API
 */

const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' };
const label = { color: '#666', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' };
const value = { color: '#fff', fontSize: '20px', fontWeight: 600 };
const subValue = { color: '#888', fontSize: '12px', marginTop: '4px' };

async function fetchAPI(path: string) {
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://btcfi.aiindigo.com';
    const res = await fetch(`${base}${path}`, { next: { revalidate: 10 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function DashboardPage() {
  const [feesData, mempoolData, networkData] = await Promise.all([
    fetchAPI('/api/v1/fees'),
    fetchAPI('/api/v1/mempool'),
    fetchAPI('/api/v1/intelligence/network'),
  ]);

  const price = feesData?.price?.btcUsd || 0;
  const fees = feesData?.fees?.recommended || {};
  const mempool = mempoolData?.mempool || {};
  const network = networkData?.data || networkData || {};

  return (
    <div>
      <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={label}>BTC Price</div>
          <div style={{ ...value, color: '#f7931a' }}>${price.toLocaleString()}</div>
          <div style={subValue}>€{(feesData?.price?.btcEur || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={label}>Fastest Fee</div>
          <div style={value}>{fees.fastestFee || '—'} sat/vB</div>
          <div style={subValue}>{feesData?.estimate?.fastest?.usd || ''}</div>
        </div>
        <div style={card}>
          <div style={label}>Mempool</div>
          <div style={value}>{(mempool.count || 0).toLocaleString()}</div>
          <div style={subValue}>{mempool.vsizeMB || '—'} MB</div>
        </div>
        <div style={card}>
          <div style={label}>Congestion</div>
          <div style={value}>{network.congestion?.label || '—'}</div>
          <div style={subValue}>{network.congestion?.level || 0}/10 · hashrate {network.hashrateTrend || ''}</div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Fee Tiers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { name: 'Fastest', rate: fees.fastestFee, usd: feesData?.estimate?.fastest?.usd },
            { name: '30 min', rate: fees.halfHourFee, usd: feesData?.estimate?.medium?.usd },
            { name: '1 hour', rate: fees.hourFee, usd: feesData?.estimate?.slow?.usd },
            { name: 'Economy', rate: fees.economyFee, usd: null },
          ].map(f => (
            <div key={f.name} style={{ textAlign: 'center' as const }}>
              <div style={{ color: '#888', fontSize: '12px' }}>{f.name}</div>
              <div style={{ color: '#4ade80', fontSize: '18px', fontWeight: 600 }}>{f.rate || '—'}</div>
              <div style={{ color: '#666', fontSize: '11px' }}>{f.usd || 'sat/vB'}</div>
            </div>
          ))}
        </div>
      </div>

      {mempoolData?.feeHistogram && (
        <div style={card}>
          <div style={{ ...label, marginBottom: '12px' }}>Fee Histogram</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px' }}>
            {(mempoolData.feeHistogram as [number, number][]).slice(0, 20).map(([rate, vsize]: [number, number], i: number) => {
              const maxVsize = Math.max(...mempoolData.feeHistogram.slice(0, 20).map(([, v]: [number, number]) => v));
              const height = maxVsize > 0 ? (vsize / maxVsize) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                  <div style={{ width: '100%', height: `${height}%`, background: '#f7931a33', borderTop: '2px solid #f7931a', borderRadius: '2px 2px 0 0', minHeight: '2px' }} />
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{Math.round(rate)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center' as const, fontSize: '10px', color: '#666', marginTop: '4px' }}>sat/vB</div>
        </div>
      )}

      <div style={{ marginTop: '16px', color: '#444', fontSize: '11px' }}>
        Auto-refreshes every 10 seconds · Data from btcfi.aiindigo.com
      </div>
    </div>
  );
}
