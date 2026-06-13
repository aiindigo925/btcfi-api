/**
 * Mining Analytics — Pool distribution, hashrate, difficulty.
 * Fetches from mempool.space mining API, caches in Redis for 10 minutes.
 */
import { safeGet, safeSet } from './redis';

const CACHE_KEY = 'mining:analytics';
const CACHE_TTL = 600; // 10 minutes

const MEMPOOL_API = 'https://mempool.space/api';

export interface PoolData {
  name: string;
  blockCount: number;
  sharePercent: number;
}

export interface HashrateData {
  timestamp: string;
  hashrate: string; // e.g. "700 EH/s"
  avgHashrate1d: string;
  avgHashrate3d: string;
}

export interface DifficultyData {
  current: number;
  adjusted: string; // "up X%" or "down X%"
  nextAdjustment: string; // estimated blocks until
}

export interface MiningAnalyticsResult {
  hashrate: HashrateData;
  poolDistribution: PoolData[];
  difficulty: DifficultyData;
  blockStats: {
    blocksLast24h: number;
    avgBlockTime: string;
    totalTxCount24h: number;
  };
  timestamp: string;
}

export async function getMiningAnalytics(): Promise<MiningAnalyticsResult> {
  // Check cache first
  try {
    const cached = await safeGet(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* cache miss */ }

  // Fetch data from mempool.space
  const [hashrateData, blocksData] = await Promise.all([
    fetchFromMempool('/v1/mining/hashrate/1m'),
    fetchFromMempool('/v1/blocks'),
  ]);

  // Parse hashrate (last 7 days avg)
  const hashrateItems: Array<{ timestamp: number; avg_hashrate: number }> =
    hashrateData?.hashrates || [];

  const latestHashrate = hashrateItems.length > 0
    ? hashrateItems[hashrateItems.length - 1].avg_hashrate
    : 0;

  // 1-day avg (last ~144 items)
  const last24h = hashrateItems.slice(-144);
  const avg1d = last24h.length > 0
    ? last24h.reduce((s, h) => s + h.avg_hashrate, 0) / last24h.length
    : latestHashrate;

  // 3-day avg (last ~432 items)
  const last3d = hashrateItems.slice(-432);
  const avg3d = last3d.length > 0
    ? last3d.reduce((s, h) => s + h.avg_hashrate, 0) / last3d.length
    : latestHashrate;

  // Pool distribution from blocks
  const blocks: Array<{
    pool_name?: string;
    timestamp?: number;
    tx_count?: number;
    difficulty?: number;
  }> = Array.isArray(blocksData) ? blocksData : [];

  const poolCounts: Record<string, number> = {};
  let totalTxCount = 0;
  let latestDifficulty = 0;

  for (const block of blocks.slice(0, 150)) {
    const pool = block.pool_name || 'Unknown';
    poolCounts[pool] = (poolCounts[pool] || 0) + 1;
    totalTxCount += block.tx_count || 0;
    if (block.difficulty) latestDifficulty = block.difficulty;
  }

  const totalBlocks = blocks.length;
  const poolDistribution: PoolData[] = Object.entries(poolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      blockCount: count,
      sharePercent: totalBlocks > 0
        ? Math.round((count / totalBlocks) * 10000) / 100
        : 0,
    }));

  // Block stats
  const recentBlocks = blocks.slice(0, 150);
  const blockTimes: number[] = [];
  for (let i = 0; i < Math.min(recentBlocks.length - 1, 50); i++) {
    const diff = (recentBlocks[i].timestamp || 0) - (recentBlocks[i + 1].timestamp || 0);
    if (diff > 0 && diff < 3600) blockTimes.push(diff);
  }
  const avgBlockTimeSec = blockTimes.length > 0
    ? blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length
    : 600;

  const hashrateStr = (hr: number) => {
    if (hr > 1e21) return `${(hr / 1e21).toFixed(1)} ZH/s`;
    if (hr > 1e18) return `${(hr / 1e18).toFixed(1)} EH/s`;
    if (hr > 1e15) return `${(hr / 1e15).toFixed(1)} PH/s`;
    return `${(hr / 1e12).toFixed(1)} TH/s`;
  };

  const result: MiningAnalyticsResult = {
    hashrate: {
      timestamp: new Date().toISOString(),
      hashrate: hashrateStr(latestHashrate),
      avgHashrate1d: hashrateStr(avg1d),
      avgHashrate3d: hashrateStr(avg3d),
    },
    poolDistribution,
    difficulty: {
      current: latestDifficulty,
      adjusted: 'see blocks for current epoch',
      nextAdjustment: 'approximately 2016 blocks per epoch',
    },
    blockStats: {
      blocksLast24h: totalBlocks,
      avgBlockTime: `${Math.round(avgBlockTimeSec)}s`,
      totalTxCount24h: totalTxCount,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await safeSet(CACHE_KEY, JSON.stringify(result), CACHE_TTL);
  } catch { /* cache write failed — non-critical */ }

  return result;
}

async function fetchFromMempool(path: string): Promise<any> {
  try {
    const res = await fetch(`${MEMPOOL_API}${path}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`mempool.space ${path} returned ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}
