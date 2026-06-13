/**
 * Mempool Intelligence — Fee bands, congestion scoring,
 * confirmation time prediction, RBF analysis, large tx alerts.
 */
import { getMempoolSummary, getMempoolRecent, getRecommendedFees } from './bitcoin';
import { safeGet, safeSet } from './redis';

const CACHE_KEY = 'mempool-intel:current';
const CACHE_TTL = 30; // 30 seconds (mempool changes fast)

export interface FeeBand {
  range: string;       // e.g. "1-2 sat/vB"
  count: number;
  vsizeMb: number;
  sharePercent: number;
}

export interface ConfirmationPrediction {
  targetMinutes: number;
  requiredFeeRate: number; // sat/vB
  confidence: 'high' | 'medium' | 'low';
}

export interface LargeTxAlert {
  txid: string;
  valueBtc: number;
  valueUsd: number;
  feeRate: number;
  vsize: number;
}

export interface MempoolIntelResult {
  congestionScore: number; // 0-100
  congestionLevel: string;
  mempool: {
    txCount: number;
    vsizeMb: number;
    totalFeesBtc: number;
  };
  feeBands: FeeBand[];
  confirmationPredictions: ConfirmationPrediction[];
  rbf: {
    count: number;
    percentOfRecent: number;
  };
  largeTxAlerts: LargeTxAlert[];
  feeMarket: {
    fastest: number;
    halfHour: number;
    hour: number;
    economy: number;
    minimum: number;
  };
  timestamp: string;
}

function classifyFeeBand(satPerVb: number): string {
  if (satPerVb <= 1) return '0-1';
  if (satPerVb <= 2) return '1-2';
  if (satPerVb <= 5) return '2-5';
  if (satPerVb <= 10) return '5-10';
  if (satPerVb <= 20) return '10-20';
  if (satPerVb <= 50) return '20-50';
  return '50+';
}

export async function getMempoolIntel(): Promise<MempoolIntelResult> {
  // Check cache
  try {
    const cached = await safeGet(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* cache miss */ }

  const [summary, recent, fees] = await Promise.all([
    getMempoolSummary(),
    getMempoolRecent(),
    getRecommendedFees(),
  ]);

  const vsizeMb = summary.vsize / 1_000_000;
  const congestionScore = Math.min(100, Math.round(vsizeMb / 30 * 100));

  let congestionLevel: string;
  if (congestionScore < 10) congestionLevel = 'empty';
  else if (congestionScore < 25) congestionLevel = 'very_low';
  else if (congestionScore < 40) congestionLevel = 'low';
  else if (congestionScore < 60) congestionLevel = 'moderate';
  else if (congestionScore < 80) congestionLevel = 'high';
  else congestionLevel = 'extreme';

  // Fee bands from histogram
  const feeBandsMap: Record<string, { count: number; vsizeMb: number }> = {};
  const bandLabels = ['0-1', '1-2', '2-5', '5-10', '10-20', '20-50', '50+'];
  for (const label of bandLabels) {
    feeBandsMap[label] = { count: 0, vsizeMb: 0 };
  }

  // fee_histogram is array of [sat/vB, vsize] pairs
  for (const [feeRate, vsize] of summary.fee_histogram) {
    const band = classifyFeeBand(feeRate);
    feeBandsMap[band].count += 1;
    feeBandsMap[band].vsizeMb += vsize / 1_000_000;
  }

  const totalVsize = Object.values(feeBandsMap).reduce((s, b) => s + b.vsizeMb, 0);
  const feeBands: FeeBand[] = bandLabels.map((label) => ({
    range: `${label} sat/vB`,
    count: feeBandsMap[label].count,
    vsizeMb: Math.round(feeBandsMap[label].vsizeMb * 100) / 100,
    sharePercent: totalVsize > 0
      ? Math.round(feeBandsMap[label].vsizeMb / totalVsize * 10000) / 100
      : 0,
  }));

  // Confirmation time predictions
  const confirmationPredictions: ConfirmationPrediction[] = [
    { targetMinutes: 10, requiredFeeRate: fees.fastestFee, confidence: 'high' },
    { targetMinutes: 30, requiredFeeRate: fees.halfHourFee, confidence: 'high' },
    { targetMinutes: 60, requiredFeeRate: fees.hourFee, confidence: 'medium' },
    { targetMinutes: 120, requiredFeeRate: fees.economyFee, confidence: 'medium' },
    { targetMinutes: 360, requiredFeeRate: fees.minimumFee, confidence: 'low' },
  ];

  // RBF analysis
  let rbfCount = 0;
  for (const tx of recent) {
    if (tx.replace_by_fee || tx.rbf) rbfCount += 1;
  }
  const rbfPercent = recent.length > 0
    ? Math.round(rbfCount / recent.length * 10000) / 100
    : 0;

  // Large tx alerts (>10 BTC)
  const LARGE_TX_THRESHOLD_BTC = 10;
  const largeTxAlerts: LargeTxAlert[] = recent
    .filter((tx: any) => (tx.value || 0) / 1e8 >= LARGE_TX_THRESHOLD_BTC)
    .map((tx: any) => ({
      txid: tx.txid,
      valueBtc: Math.round((tx.value || 0) / 1e8 * 10000) / 10000,
      valueUsd: 0, // Would need price; simplified
      feeRate: tx.vsize ? Math.round(tx.fee / tx.vsize * 10) / 10 : 0,
      vsize: tx.vsize || 0,
    }));

  const result: MempoolIntelResult = {
    congestionScore,
    congestionLevel,
    mempool: {
      txCount: summary.count,
      vsizeMb: Math.round(vsizeMb * 100) / 100,
      totalFeesBtc: Math.round(summary.total_fee / 1e8 * 10000) / 10000,
    },
    feeBands,
    confirmationPredictions,
    rbf: {
      count: rbfCount,
      percentOfRecent: rbfPercent,
    },
    largeTxAlerts,
    feeMarket: {
      fastest: fees.fastestFee,
      halfHour: fees.halfHourFee,
      hour: fees.hourFee,
      economy: fees.economyFee,
      minimum: fees.minimumFee,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await safeSet(CACHE_KEY, JSON.stringify(result), CACHE_TTL);
  } catch { /* cache write failed */ }

  return result;
}
