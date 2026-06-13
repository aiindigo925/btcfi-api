/**
 * On-Chain Cycle Metrics Library
 * Computes MVRV Z-Score, SOPR, NUPL, and HODL Waves from mempool.space data.
 *
 * Uses a sampling approach: fetches recent block transactions and estimates
 * coin ages by tracing sampled inputs back to their creation blocks.
 * Results are cached in Redis for 1 hour (expensive to compute).
 */

import {
  getLatestBlocks,
  getBtcPrice,
  getBlockHeight,
  fetchBitcoinData,
  getMempoolRecent,
} from './bitcoin';
import { safeGet, safeSet } from './redis';

// ============ CONSTANTS ============
const CACHE_PREFIX = 'cycle-metrics:';
const CACHE_TTL = 3600; // 1 hour

/** Approximate total BTC supply (June 2026) */
const TOTAL_SUPPLY_BTC = 19_800_000;

/** Number of recent blocks to sample */
const SAMPLE_BLOCKS = 3;

/** Max inputs to trace for age estimation (each costs 1 API call) */
const SAMPLE_INPUTS_FOR_AGE = 25;

/** Blocks per day (~144 blocks at 10 min/block) */
const BLOCKS_PER_DAY = 144;

// ============ AGE BUCKETS (HODL Waves) ============
const AGE_BUCKETS: { label: string; maxBlocks: number }[] = [
  { label: '<1mo', maxBlocks: 4_320 },
  { label: '1-3mo', maxBlocks: 12_960 },
  { label: '3-6mo', maxBlocks: 25_920 },
  { label: '6-12mo', maxBlocks: 51_840 },
  { label: '1-2yr', maxBlocks: 103_680 },
  { label: '2-3yr', maxBlocks: 155_520 },
  { label: '3-5yr', maxBlocks: 259_200 },
  { label: '5-10yr', maxBlocks: 518_400 },
  { label: '10yr+', maxBlocks: Infinity },
];

// ============ INTERFACES ============

interface CachedResult<T> {
  data: T;
  cached: boolean;
}

interface SampledInput {
  value: number;
  ageBlocks: number;
  ageDays: number;
}

interface SampledTx {
  inputValue: number;
  outputValue: number;
  fee: number;
  blockHeight: number;
}

interface CollectedData {
  txs: SampledTx[];
  inputs: SampledInput[];
  priceUsd: number;
  currentHeight: number;
}

// ============ EXPORTED INTERFACES ============

export interface MvrvResult {
  mvrv: number;
  zscore: number;
  realizedPrice: number;
  realizedCap: number;
  marketCap: number;
  timestamp: string;
}

export interface SoprResult {
  sopr: number;
  timestamp: string;
  window: string;
}

export interface NuplResult {
  nupl: number;
  zone: string;
  timestamp: string;
}

export interface HodlWaveBucket {
  label: string;
  percent: number;
}

export interface HodlWavesResult {
  buckets: HodlWaveBucket[];
  cdd: number;
  timestamp: string;
}

// ============ CACHE HELPERS ============

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await safeGet(`${CACHE_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: unknown): Promise<void> {
  try {
    await safeSet(`${CACHE_PREFIX}${key}`, JSON.stringify(data), CACHE_TTL);
  } catch {
    /* cache write failed — non-critical */
  }
}

// ============ PRICE MODEL ============

/**
 * Approximate ratio of creation price to current price based on coin age.
 * Assumes BTC has appreciated roughly 50% annually on average (power-law approximation).
 * Returns a multiplier: creationPrice ≈ currentPrice × ratio
 */
function estimateCreationPriceRatio(ageDays: number): number {
  if (ageDays <= 1) return 0.995;
  if (ageDays <= 7) return 0.97;
  if (ageDays <= 30) return 0.90;
  if (ageDays <= 90) return 0.82;
  if (ageDays <= 180) return 0.73;
  if (ageDays <= 365) return 0.62;
  if (ageDays <= 730) return 0.45;
  if (ageDays <= 1095) return 0.33;
  if (ageDays <= 1825) return 0.18;
  return 0.10;
}

// ============ DATA SAMPLING ============

/**
 * Collect sampled data from recent blocks.
 * Fetches block transactions, extracts input/output values, and traces
 * a sample of inputs back to their creation blocks for age estimation.
 */
async function collectSampledData(): Promise<CollectedData> {
  const [blocks, price, currentHeight] = await Promise.all([
    getLatestBlocks(SAMPLE_BLOCKS),
    getBtcPrice(),
    getBlockHeight(),
  ]);

  const txs: SampledTx[] = [];
  const rawInputs: { value: number; txid: string; vout: number; spendHeight: number }[] = [];

  // Step 1: Fetch transactions from recent blocks
  for (const block of blocks) {
    try {
      const blockTxs: any[] = await fetchBitcoinData(
        `/block/${block.id}/txs/0`,
      );
      if (!Array.isArray(blockTxs)) continue;

      for (const tx of blockTxs) {
        if (!Array.isArray(tx.vin) || !Array.isArray(tx.vout)) continue;

        const totalInput = tx.vin.reduce(
          (s: number, v: any) => s + (v.prevout?.value || 0),
          0,
        );
        const totalOutput = tx.vout.reduce(
          (s: number, v: any) => s + (v.value || 0),
          0,
        );

        txs.push({
          inputValue: totalInput,
          outputValue: totalOutput,
          fee: tx.fee || 0,
          blockHeight: tx.status?.block_height || block.height,
        });

        // Collect inputs for age tracing (up to limit)
        for (const vin of tx.vin) {
          if (rawInputs.length >= SAMPLE_INPUTS_FOR_AGE) break;
          if (vin.prevout?.value && vin.txid) {
            rawInputs.push({
              value: vin.prevout.value,
              txid: vin.txid,
              vout: vin.vout ?? 0,
              spendHeight: tx.status?.block_height || block.height,
            });
          }
        }
      }
    } catch {
      /* block fetch failed — skip */
    }
  }

  // Step 2: Trace sampled inputs back to their creation blocks
  const inputs: SampledInput[] = [];
  for (const raw of rawInputs) {
    try {
      const prevTx: any = await fetchBitcoinData(`/tx/${raw.txid}`);
      const creationHeight: number | undefined = prevTx.status?.block_height;
      if (creationHeight && creationHeight < raw.spendHeight) {
        const ageBlocks = raw.spendHeight - creationHeight;
        const ageDays = ageBlocks / BLOCKS_PER_DAY;
        inputs.push({ value: raw.value, ageBlocks, ageDays });
      }
    } catch {
      /* prev-tx fetch failed — skip this sample */
    }
  }

  return { txs, inputs, priceUsd: price.USD, currentHeight };
}

// ============ 1. MVRV Z-SCORE ============

/**
 * Compute MVRV Z-Score and related metrics.
 *
 * - Market Cap = total supply × current price
 * - Realized Cap ≈ total supply × (weighted avg creation price from sampled inputs)
 * - MVRV = Market Cap / Realized Cap
 * - Z-Score = (Market Cap - Realized Cap) / stddev of value distribution
 */
export async function getMvrvMetrics(): Promise<CachedResult<MvrvResult>> {
  const cached = await getCached<MvrvResult>('mvrv');
  if (cached) return { data: cached, cached: true };

  const { inputs, priceUsd } = await collectSampledData();

  const marketCap = TOTAL_SUPPLY_BTC * priceUsd;

  // Weighted average creation price ratio from sampled inputs
  let weightedSum = 0;
  let totalValue = 0;
  for (const inp of inputs) {
    const ratio = estimateCreationPriceRatio(inp.ageDays);
    weightedSum += inp.value * ratio;
    totalValue += inp.value;
  }

  // Fallback ratio if no age data available
  const avgCreationRatio = totalValue > 0 ? weightedSum / totalValue : 0.60;
  const realizedPrice = priceUsd * avgCreationRatio;
  const realizedCap = TOTAL_SUPPLY_BTC * realizedPrice;

  // MVRV
  const mvrv = realizedCap > 0 ? marketCap / realizedCap : 1.0;

  // Z-Score: how many standard deviations market cap is from realized cap
  const meanRatio = avgCreationRatio;
  const variance =
    inputs.length > 1
      ? inputs.reduce(
          (s, i) =>
            s + Math.pow(estimateCreationPriceRatio(i.ageDays) - meanRatio, 2),
          0,
        ) / (inputs.length - 1)
      : 0.05;
  const stddev = Math.sqrt(variance) * TOTAL_SUPPLY_BTC * priceUsd;
  const zscore = stddev > 0 ? (marketCap - realizedCap) / stddev : 0;

  const result: MvrvResult = {
    mvrv: Math.round(mvrv * 1000) / 1000,
    zscore: Math.round(zscore * 100) / 100,
    realizedPrice: Math.round(realizedPrice),
    realizedCap: Math.round(realizedCap),
    marketCap: Math.round(marketCap),
    timestamp: new Date().toISOString(),
  };

  await setCache('mvrv', result);
  return { data: result, cached: false };
}

// ============ 2. SOPR ============

/**
 * Compute Spend Output Profit Ratio (SOPR).
 *
 * SOPR = Σ (value × currentPrice) / Σ (value × creationPrice)
 *      = 1 / avgCreationRatio  (value-weighted)
 *
 * Enriched with fee-to-value ratio from mempool.recent as a
 * supplementary urgency signal.
 */
export async function getSoprMetrics(): Promise<CachedResult<SoprResult>> {
  const cached = await getCached<SoprResult>('sopr');
  if (cached) return { data: cached, cached: true };

  const { inputs } = await collectSampledData();

  // Value-weighted average creation price ratio
  let weightedSum = 0;
  let totalValue = 0;
  for (const inp of inputs) {
    const ratio = estimateCreationPriceRatio(inp.ageDays);
    weightedSum += inp.value * ratio;
    totalValue += inp.value;
  }

  const avgCreationRatio = totalValue > 0 ? weightedSum / totalValue : 0.60;
  let sopr = avgCreationRatio > 0 ? 1 / avgCreationRatio : 1.0;

  // Supplementary signal from mempool fee activity
  try {
    const mempoolRecent = await getMempoolRecent();
    const recentTotalValue = mempoolRecent.reduce(
      (s: number, tx: any) => s + (tx.value || 0),
      0,
    );
    const recentTotalFees = mempoolRecent.reduce(
      (s: number, tx: any) => s + (tx.fee || 0),
      0,
    );
    const feeRatio =
      recentTotalValue > 0 ? recentTotalFees / recentTotalValue : 0;

    // High fee-to-value ratio suggests urgent spending (potential top signal)
    if (feeRatio > 0.01) {
      sopr *= 1 + (feeRatio - 0.005) * 10;
    }
  } catch {
    /* mempool fetch failed — use age-based SOPR only */
  }

  // Clamp to reasonable range
  sopr = Math.max(0.5, Math.min(2.0, Math.round(sopr * 1000) / 1000));

  const result: SoprResult = {
    sopr,
    timestamp: new Date().toISOString(),
    window: `last ${SAMPLE_BLOCKS} blocks (~${SAMPLE_BLOCKS * 10} min)`,
  };

  await setCache('sopr', result);
  return { data: result, cached: false };
}

// ============ 3. NUPL ============

/**
 * Compute Net Unrealized Profit/Loss.
 *
 * NUPL = (Market Cap - Realized Cap) / Market Cap
 *      = 1 - (1 / MVRV)
 *
 * Zones:
 *   Euphoria     > 0.75
 *   Greed        0.50 – 0.75
 *   Anxiety      0.25 – 0.50
 *   Capitulation  < 0.25
 */
export async function getNuplMetrics(): Promise<CachedResult<NuplResult>> {
  const cached = await getCached<NuplResult>('nupl');
  if (cached) return { data: cached, cached: true };

  const mvrvResult = await getMvrvMetrics();
  const mvrv = mvrvResult.data.mvrv;

  const nupl =
    mvrv > 0 ? Math.round((1 - 1 / mvrv) * 1000) / 1000 : 0;

  let zone: string;
  if (nupl > 0.75) zone = 'Euphoria';
  else if (nupl > 0.5) zone = 'Greed';
  else if (nupl > 0.25) zone = 'Anxiety';
  else zone = 'Capitulation';

  const result: NuplResult = {
    nupl,
    zone,
    timestamp: new Date().toISOString(),
  };

  await setCache('nupl', result);
  return { data: result, cached: false };
}

// ============ 4. HODL WAVES + CDD ============

/**
 * Compute HODL Waves distribution and Coin Days Destroyed (CDD).
 *
 * HODL Waves: percentage of sampled spent value in each age bucket.
 * CDD = Σ (value × days since last move) — higher means older coins are moving.
 */
export async function getHodlWavesMetrics(): Promise<
  CachedResult<HodlWavesResult>
> {
  const cached = await getCached<HodlWavesResult>('hodl-waves');
  if (cached) return { data: cached, cached: true };

  const { inputs } = await collectSampledData();

  const bucketValues = AGE_BUCKETS.map(() => 0);
  let totalValue = 0;
  let totalCoinDays = 0;

  for (const inp of inputs) {
    totalValue += inp.value;
    totalCoinDays += inp.value * inp.ageDays;

    for (let i = 0; i < AGE_BUCKETS.length; i++) {
      if (inp.ageBlocks < AGE_BUCKETS[i].maxBlocks) {
        bucketValues[i] += inp.value;
        break;
      }
    }
  }

  const buckets: HodlWaveBucket[] = AGE_BUCKETS.map((b, i) => ({
    label: b.label,
    percent:
      totalValue > 0
        ? Math.round((bucketValues[i] / totalValue) * 10000) / 100
        : 0,
  }));

  // CDD: average coin-days destroyed per satoshi sampled
  const cdd =
    totalValue > 0
      ? Math.round((totalCoinDays / totalValue) * 100) / 100
      : 0;

  const result: HodlWavesResult = {
    buckets,
    cdd,
    timestamp: new Date().toISOString(),
  };

  await setCache('hodl-waves', result);
  return { data: result, cached: false };
}
