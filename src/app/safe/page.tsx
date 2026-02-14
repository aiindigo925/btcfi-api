'use client';

import { useState } from 'react';

const BTC_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;

interface ThreatResult {
  address: string;
  overallScore: number;
  threatLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  matchedPatterns: { pattern: { id: string; name: string; severity: string; description: string }; matched: boolean; detail: string }[];
  unmatchedCount: number;
  summary: string;
  recommendations: string[];
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  clean:    { color: '#4ade80', bg: '#0a1f0a', label: 'CLEAN' },
  low:      { color: '#4ade80', bg: '#0a1f0a', label: 'LOW RISK' },
  medium:   { color: '#fbbf24', bg: '#1f1a0a', label: 'MEDIUM RISK' },
  high:     { color: '#ef4444', bg: '#1f0a0a', label: 'HIGH RISK' },
  critical: { color: '#ef4444', bg: '#1f0a0a', label: 'CRITICAL' },
};

export default function SafePage() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<ThreatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = BTC_REGEX.test(address.trim());

  async function handleCheck() {
    const addr = address.trim();
    if (!BTC_REGEX.test(addr)) {
      setError('Please enter a valid Bitcoin address (P2PKH, P2SH, Bech32, or Taproot)');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/safe?addr=${encodeURIComponent(addr)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Analysis failed');
        return;
      }
      setResult(json.data);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const level = result ? LEVEL_CONFIG[result.threatLevel] || LEVEL_CONFIG.clean : null;

  const tweetText = result
    ? `My Bitcoin address scored ${result.overallScore}/100 (${result.threatLevel.toUpperCase()}) on the BTCFi safety checker! Check yours free:`
    : '';
  const tweetUrl = 'https://btcfi.aiindigo.com/safe';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '60px 24px 40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <a href="/" style={{ color: '#f7931a', textDecoration: 'none', fontSize: '14px' }}>← BTCFi API</a>
        <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#fff', margin: '24px 0 8px' }}>
          Is My Bitcoin Safe?
        </h1>
        <p style={{ color: '#888', fontSize: '16px', margin: 0 }}>
          Free address safety checker — no signup required
        </p>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          value={address}
          onChange={e => { setAddress(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter' && isValid) handleCheck(); }}
          placeholder="Paste any Bitcoin address"
          style={{
            flex: 1,
            background: '#111',
            border: '1px solid #222',
            color: '#fff',
            borderRadius: '6px',
            padding: '12px 14px',
            fontSize: '15px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={handleCheck}
          disabled={loading || !isValid}
          style={{
            background: loading || !isValid ? '#333' : '#f7931a',
            color: loading || !isValid ? '#666' : '#000',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading || !isValid ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
      )}

      <p style={{ color: '#555', fontSize: '12px', margin: '0 0 32px', textAlign: 'center' }}>
        Powered by 8 YARA threat patterns · Analysis is free and private
      </p>

      {/* Results */}
      {result && level && (
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '24px' }}>
          {/* Threat level badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <span style={{
                display: 'inline-block',
                background: level.bg,
                color: level.color,
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}>
                {result.threatLevel === 'clean' ? '✅' : result.overallScore <= 30 ? '✅' : '⚠️'} {level.label}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Score</div>
              <div style={{ color: level.color, fontSize: '28px', fontWeight: 700 }}>{result.overallScore}<span style={{ fontSize: '14px', color: '#666' }}>/100</span></div>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '8px', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{
              width: `${result.overallScore}%`,
              height: '100%',
              background: level.color,
              borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Summary */}
          <p style={{ color: '#ccc', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.5 }}>{result.summary}</p>

          {/* Patterns checked */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Patterns checked: {result.matchedPatterns.length}/{result.matchedPatterns.length + result.unmatchedCount}
            </div>
            {result.matchedPatterns.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.matchedPatterns.map(m => (
                  <div key={m.pattern.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: m.matched ? '#ef4444' : '#4ade80', flexShrink: 0 }}>{m.matched ? '⚠' : '✓'}</span>
                    <div>
                      <span style={{ color: '#fff' }}>{m.pattern.name}</span>
                      {m.matched && <span style={{ color: '#888' }}> — {m.detail}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>No threat patterns detected</p>
            )}
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div style={{ background: '#0a0f1f', border: '1px solid #1a2a4a', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
              <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Recommendations</div>
              {result.recommendations.map((rec, i) => (
                <p key={i} style={{ color: '#9cb8e0', fontSize: '13px', margin: i === 0 ? 0 : '6px 0 0', lineHeight: 1.4 }}>• {rec}</p>
              ))}
            </div>
          )}

          {/* Share */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #1a1a1a' }}>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(tweetUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#1a1a1a',
                color: '#888',
                border: '1px solid #222',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              Share on X →
            </a>
            <span style={{ color: '#444', fontSize: '12px' }}>Help others check their addresses</span>
          </div>
        </div>
      )}

      {/* Footer links */}
      <div style={{ textAlign: 'center', marginTop: '40px', color: '#444', fontSize: '13px' }}>
        <a href="https://t.me/BTC_Fi_Bot" target="_blank" rel="noopener noreferrer" style={{ color: '#f7931a', textDecoration: 'none' }}>@BTC_Fi_Bot</a>
        {' · '}
        <a href="https://t.me/BTCFi_Whales" target="_blank" rel="noopener noreferrer" style={{ color: '#f7931a', textDecoration: 'none' }}>@BTCFi_Whales</a>
        {' · '}
        <a href="/dashboard" style={{ color: '#f7931a', textDecoration: 'none' }}>Dashboard</a>
        {' · '}
        <a href="/api/docs" style={{ color: '#f7931a', textDecoration: 'none' }}>API Docs</a>
      </div>
    </div>
  );
}
