/**
 * Price Oracle — Real-time BTC price across currencies.
 * Fetches from mempool.space, caches in Redis for 60s.
 */
import { getBtcPrice } from './bitcoin';
import { safeGet, safeSet } from './redis';

const CACHE_KEY = 'price-oracle:current';
const CACHE_TTL = 60; // 60 seconds

export interface PriceOracleResult {
  btc: {
    usd: number;
    eur: number;
    [key: string]: number;
  };
  timestamp: string;
}

export async function getBtcPriceOracle(): Promise<PriceOracleResult> {
  // Check cache first
  try {
    const cached = await safeGet(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Cache miss — continue to fetch
  }

  const price = await getBtcPrice();
  const result: PriceOracleResult = {
    btc: {
      usd: price.USD,
      eur: price.EUR,
    },
    timestamp: new Date().toISOString(),
  };

  // Cache in Redis for 60s
  try {
    await safeSet(CACHE_KEY, JSON.stringify(result), CACHE_TTL);
  } catch {
    // Cache write failed — non-critical
  }

  return result;
}
