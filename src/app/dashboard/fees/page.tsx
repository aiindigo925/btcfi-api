'use client';

import { useState, useEffect } from 'react';

const API = 'https://btcfi.aiindigo.com';

export default function FeesPage() {
  const [txSize, setTxSize] = useState(250);
  const [fees, setFees] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/fees`).then(r => r.json()).then(setFees).catch(() => {});
    fetch(`${API}/api/v1/intelligence/fees`).then(r => r.json()).then(d => setPrediction(d.data || d)).catch(() => {});
  }, []);

  const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '12px' };
  const recommended = fees?.fees?.recommended || {};
  const btcPrice = fees?.price?.btcUsd || 0;

  function calcFee(satPerVb: number): { sats: number; usd: string } {
    const sats = satPerVb * txSize;
    const usd = btcPrice > 0 ? `$${((sats / 1e8) * btcPrice).toFixed(2)}` : '—';
    return { sats, usd };
  }

  const tiers = [
    { name: 'Fastest', rate: recommended.fastestFee, color: '#ef4444', desc: 'Next block' },
    { name: '30 min', rate: recommended.halfHourFee, color: '#fbbf24', desc: '~3 blocks' },
    { name: '1 hour', rate: recommended.hourFee, color: '#4ade80', desc: '~6 blocks' },
    { name: 'Economy', rate: recommended.economyFee, color: '#60a5fa', desc: '~12 blocks' },
    { name: 'Minimum', rate: recommended.minimumFee, color: '#888', desc: 'Eventually' },
  ];

  return (
    <div>
      <h1 style={{ color: '#f7931a', fontSize: '24px', marginBottom: '24px' }}>Fee Calculator</h1>

      <div style={card}>
        <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>TRANSACTION SIZE (vBytes)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input type="range" min="100" max="2000" value={txSize} onChange={e => setTxSize(+e.target.value)}
            style={{ flex: 1, accentColor: '#f7931a' }} />
          <input type="number" value={txSize} onChange={e => setTxSize(+e.target.value)}
            style={{ width: '80px', background: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', padding: '4px 8px', color: '#fff', fontFamily: 'inherit', textAlign: 'right' as const }} />
        </div>
        <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
          Typical: simple tx ~250 vB · 2-of-3 multisig ~370 vB · batch ~500+ vB
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '24px' }}>
        {tiers.map(t => {
          const fee = t.rate ? calcFee(t.rate) : null;
          return (
            <div key={t.name} style={{ ...card, textAlign: 'center' as const, borderColor: t.color + '33' }}>
              <div style={{ color: '#666', fontSize: '10px', marginBottom: '4px' }}>{t.name}</div>
              <div style={{ color: t.color, fontSize: '18px', fontWeight: 700 }}>{t.rate || '—'}</div>
              <div style={{ color: '#666', fontSize: '10px' }}>sat/vB</div>
              {fee && (
                <>
                  <div style={{ color: '#fff', fontSize: '13px', marginTop: '8px' }}>{fee.sats.toLocaleString()} sats</div>
                  <div style={{ color: '#888', fontSize: '12px' }}>{fee.usd}</div>
                </>
              )}
              <div style={{ color: '#555', fontSize: '10px', marginTop: '4px' }}>{t.desc}</div>
            </div>
          );
        })}
      </div>

      {prediction && (
        <div style={card}>
          <div style={{ color: '#666', fontSize: '11px', marginBottom: '12px' }}>AI FEE PREDICTION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {(prediction.predictions || []).slice(0, 3).map((pred: any) => (
              <div key={pred.window} style={{ textAlign: 'center' as const }}>
                <div style={{ color: '#888', fontSize: '12px' }}>{pred.window}</div>
                <div style={{ color: '#f7931a', fontSize: '16px', fontWeight: 600 }}>
                  {pred.predictedFeeRate || '—'} sat/vB
                </div>
                <div style={{ color: '#666', fontSize: '11px' }}>{pred.confidence || ''} — {pred.reasoning?.slice(0, 40) || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
