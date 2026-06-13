/**
 * Cycle Composite Signal — Combines MVRV, SOPR, NUPL, HODL Waves
 * into a single weighted buy/sell signal with confidence score.
 *
 * Premium endpoint ($0.05) — aggregated cycle intelligence.
 */
import {
  getMvrvMetrics,
  getSoprMetrics,
  getNuplMetrics,
  getHodlWavesMetrics,
} from './cycle-metrics';
import { safeGet, safeSet } from './redis';

const CACHE_KEY = 'signal:composite';
const CACHE_TTL = 3600; // 1 hour (matches cycle-metrics cache)

export type SignalType = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

export interface SignalComponent {
  name: string;
  value: number;
  score: number; // -1 to 1 (bearish to bullish)
  weight: number;
  detail: string;
}

export interface CompositeSignalResult {
  signal: SignalType;
  confidence: number; // 0-100
  score: number; // -1 to 1 aggregate
  components: SignalComponent[];
  reasoning: string;
  timestamp: string;
}

/**
 * Normalize a value to a -1..1 score.
 * For MVRV z-score: lower z = more bullish, higher z = more bearish.
 * z < -0.5 → strong buy (1.0), z > 3 → strong sell (-1.0)
 */
function mvrvToScore(zscore: number): number {
  // Map z-score from [-1, 4] → [1, -1]
  return Math.max(-1, Math.min(1, 1 - (zscore + 1) * 0.4));
}

/**
 * SOPR: < 1 = loss selling (bearish capitulation = buy), > 1 = profit taking (bullish to sell)
 * But SOPR > 1.2 often signals euphoria top
 */
function soprToScore(sopr: number): number {
  if (sopr < 0.95) return 0.8; // heavy loss selling → accumulation
  if (sopr < 1.0) return 0.4;  // mild loss selling → neutral-bullish
  if (sopr < 1.05) return 0.1; // near break-even
  if (sopr < 1.15) return -0.3; // profit taking
  return -0.8; // heavy profit taking → potential top
}

/**
 * NUPL: low = capitulation (buy), high = euphoria (sell)
 */
function nuplToScore(nupl: number): number {
  if (nupl < 0.25) return 0.9;  // Capitulation → strong buy
  if (nupl < 0.5) return 0.3;   // Anxiety → neutral-buy
  if (nupl < 0.75) return -0.3; // Greed → neutral-sell
  return -0.9;                   // Euphoria → strong sell
}

/**
 * HODL Waves: high CDD = old coins moving (potential top), low CDD = holding (bottom)
 */
function hodlWavesToScore(cdd: number): number {
  // CDD typically ranges 0-2000+
  if (cdd < 100) return 0.7;    // very low movement → accumulation
  if (cdd < 300) return 0.3;    // low movement
  if (cdd < 800) return 0;      // neutral
  if (cdd < 1500) return -0.4;  // elevated old coin movement
  return -0.8;                   // very high → distribution
}

function signalFromScore(score: number): SignalType {
  if (score > 0.6) return 'strong_buy';
  if (score > 0.2) return 'buy';
  if (score > -0.2) return 'neutral';
  if (score > -0.6) return 'sell';
  return 'strong_sell';
}

function confidenceFromComponents(components: SignalComponent[]): number {
  // Higher confidence when components agree (same sign)
  const scores = components.map((c) => c.score * c.weight);
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const avgScore = totalWeight > 0
    ? scores.reduce((a, b) => a + b, 0) / totalWeight
    : 0;

  // Agreement: % of components in same direction as overall
  const direction = avgScore >= 0 ? 1 : -1;
  const agreements = components.filter(
    (c) => (c.score >= 0 ? 1 : -1) === direction || c.score === 0,
  ).length;
  const agreementRatio = agreements / components.length;

  // Magnitude: how far from neutral
  const magnitude = Math.min(1, Math.abs(avgScore));

  return Math.round((agreementRatio * 0.6 + magnitude * 0.4) * 100);
}

export async function getCompositeSignal(): Promise<CompositeSignalResult> {
  // Check cache
  try {
    const cached = await safeGet(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* cache miss */ }

  // Fetch all metrics in parallel
  const [mvrv, sopr, nupl, hodlWaves] = await Promise.all([
    getMvrvMetrics(),
    getSoprMetrics(),
    getNuplMetrics(),
    getHodlWavesMetrics(),
  ]);

  // Compute component scores
  const components: SignalComponent[] = [
    {
      name: 'MVRV Z-Score',
      value: mvrv.data.zscore,
      score: mvrvToScore(mvrv.data.zscore),
      weight: 0.30,
      detail: `Z-Score: ${mvrv.data.zscore}, MVRV: ${mvrv.data.mvrv}`,
    },
    {
      name: 'SOPR',
      value: sopr.data.sopr,
      score: soprToScore(sopr.data.sopr),
      weight: 0.25,
      detail: `SOPR: ${sopr.data.sopr} (${sopr.data.window})`,
    },
    {
      name: 'NUPL',
      value: nupl.data.nupl,
      score: nuplToScore(nupl.data.nupl),
      weight: 0.25,
      detail: `NUPL: ${nupl.data.nupl} (Zone: ${nupl.data.zone})`,
    },
    {
      name: 'HODL Waves / CDD',
      value: hodlWaves.data.cdd,
      score: hodlWavesToScore(hodlWaves.data.cdd),
      weight: 0.20,
      detail: `CDD: ${hodlWaves.data.cdd}`,
    },
  ];

  // Weighted aggregate score
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const aggregateScore = components.reduce(
    (s, c) => s + c.score * c.weight,
    0,
  ) / totalWeight;

  const signal = signalFromScore(aggregateScore);
  const confidence = confidenceFromComponents(components);

  const reasoning = generateReasoning(signal, components);

  const result: CompositeSignalResult = {
    signal,
    confidence,
    score: Math.round(aggregateScore * 1000) / 1000,
    components,
    reasoning,
    timestamp: new Date().toISOString(),
  };

  try {
    await safeSet(CACHE_KEY, JSON.stringify(result), CACHE_TTL);
  } catch { /* cache write failed */ }

  return result;
}

function generateReasoning(
  signal: SignalType,
  components: SignalComponent[],
): string {
  const bullishCount = components.filter((c) => c.score > 0.2).length;
  const bearishCount = components.filter((c) => c.score < -0.2).length;

  if (signal === 'strong_buy') {
    return `Strong buy signal: ${bullishCount}/${components.length} indicators bullish. Market likely in capitulation or early recovery phase.`;
  }
  if (signal === 'buy') {
    return `Buy signal: ${bullishCount}/${components.length} indicators bullish. Market showing accumulation patterns.`;
  }
  if (signal === 'neutral') {
    return `Neutral signal: mixed indicators. ${bullishCount} bullish, ${bearishCount} bearish. Wait for clearer direction.`;
  }
  if (signal === 'sell') {
    return `Sell signal: ${bearishCount}/${components.length} indicators bearish. Market showing distribution patterns.`;
  }
  return `Strong sell signal: ${bearishCount}/${components.length} indicators bearish. Market likely in euphoria or late-cycle distribution.`;
}
