/**
 * Revenue Tracking — MP3 Task 17.3 + Revenue Dashboard v2
 * Persistent payment counters via Upstash Redis + in-memory fallback.
 * Shared between middleware (writes) and admin/revenue route (reads).
 *
 * V2 adds USD value tracking: each payment records its price so we can
 * compute actual revenue instead of just payment counts.
 */

import { getPriceForPath } from '@/lib/x402';

export const paymentCounter = {
  total: 0,
  byNetwork: { base: 0, solana: 0 } as Record<string, number>,
  byTier: {} as Record<string, number>,
  since: new Date().toISOString(),
};

let kvAvailable: boolean | null = null;
let kvModule: any = null;

async function getKV(): Promise<any> {
  if (kvAvailable === false) return null;
  if (kvModule) return kvModule;
  try {
    const { Redis } = await import('@upstash/redis' as string);
    kvModule = Redis.fromEnv();
    kvAvailable = true;
    return kvModule;
  } catch {
    kvAvailable = false;
    return null;
  }
}

// ============ V1 — Payment Count Tracking (backward-compatible) ============

export function recordPayment(network: string, path: string): void {
  const tier = path.includes('/intelligence') ? 'intelligence'
    : path.includes('/solv') ? 'solv'
    : path.includes('/security') ? 'security'
    : path.includes('/broadcast') ? 'broadcast'
    : path.includes('/zk/') ? 'zk'
    : path.includes('/stream') ? 'stream'
    : 'standard';

  paymentCounter.total++;
  paymentCounter.byNetwork[network] = (paymentCounter.byNetwork[network] || 0) + 1;
  paymentCounter.byTier[tier] = (paymentCounter.byTier[tier] || 0) + 1;

  // Non-blocking KV persist
  getKV().then(kv => {
    if (!kv) return;
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const hourKey = now.getUTCHours().toString().padStart(2, '0');
    Promise.all([
      kv.incr('payments:total'),
      kv.incr(`payments:network:${network}`),
      kv.incr(`payments:tier:${tier}`),
      kv.incr(`payments:daily:${dateKey}`),
      kv.incr(`payments:hourly:${dateKey}:${hourKey}`),
    ]).catch((err: unknown) => console.error('[revenue] KV write error:', err));
  });
}

// ============ V2 — USD Value Tracking ============

/**
 * Classify a path into an endpoint category for revenue breakdown.
 */
function classifyEndpoint(path: string): string {
  if (path.includes('/intelligence/signal')) return 'signal';
  if (path.includes('/intelligence/entity')) return 'entity';
  if (path.includes('/intelligence/portfolio')) return 'portfolio';
  if (path.includes('/intelligence/history')) return 'history';
  if (path.includes('/intelligence/mempool-intel')) return 'mempool-intel';
  if (path.includes('/intelligence/mining')) return 'mining';
  if (path.includes('/intelligence/hodl-waves')) return 'hodl-waves';
  if (path.includes('/intelligence/sopr')) return 'sopr';
  if (path.includes('/intelligence/mvrv')) return 'mvrv';
  if (path.includes('/intelligence/lightning')) return 'lightning';
  if (path.includes('/intelligence/l2')) return 'l2';
  if (path.includes('/intelligence')) return 'intelligence';
  if (path.includes('/solv')) return 'solv';
  if (path.includes('/security')) return 'security';
  if (path.includes('/tx/broadcast')) return 'broadcast';
  if (path.includes('/zk/verify')) return 'zk-verify';
  if (path.includes('/zk/')) return 'zk-generate';
  if (path.includes('/stream')) return 'stream';
  if (path.includes('/ordinals')) return 'ordinals';
  if (path.includes('/marketplace')) return 'marketplace';
  if (path.includes('/price')) return 'price';
  if (path.includes('/fees')) return 'fees';
  if (path.includes('/alerts')) return 'alerts';
  if (path.includes('/address')) return 'address';
  if (path.includes('/tx/')) return 'tx-status';
  return 'standard';
}

/**
 * Record a payment with USD value. V2 — stores both count and revenue.
 */
export function recordPaymentV2(network: string, path: string): void {
  // Call legacy counter for backward compatibility
  recordPayment(network, path);

  const tier = classifyEndpoint(path);
  const price = getPriceForPath(path);

  if (price <= 0) return; // Don't track free endpoints in revenue

  // Non-blocking V2 KV persist
  getKV().then(kv => {
    if (!kv) return;
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);
    // ISO week: YYYY-Www
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000);
    const weekNum = Math.ceil(dayOfYear / 7);
    const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    // Store the actual USD value (float precision stored as string in Redis)
    const priceStr = price.toFixed(6);

    Promise.all([
      kv.incrbyfloat('revenue_usd:total', price),
      kv.incrbyfloat(`revenue_usd:daily:${dateKey}`, price),
      kv.incrbyfloat(`revenue_usd:weekly:${weekKey}`, price),
      kv.incrbyfloat(`revenue_usd:monthly:${monthKey}`, price),
      kv.incrbyfloat(`revenue_usd:network:${network}`, price),
      kv.incrbyfloat(`revenue_usd:endpoint:${tier}`, price),
    ]).catch((err: unknown) => console.error('[revenue-v2] KV write error:', err));
  });
}

// ============ V1 Reader (backward-compatible) ============

export async function getRevenueStats(): Promise<{
  source: 'kv' | 'memory';
  total: number;
  byNetwork: Record<string, number>;
  byTier: Record<string, number>;
  daily: Record<string, number>;
  since: string;
}> {
  const kv = await getKV();
  if (kv) {
    try {
      const [total, base, solana, standard, intelligence, security, solv, broadcast, zk, stream] = await Promise.all([
        kv.get('payments:total'),
        kv.get('payments:network:base'),
        kv.get('payments:network:solana'),
        kv.get('payments:tier:standard'),
        kv.get('payments:tier:intelligence'),
        kv.get('payments:tier:security'),
        kv.get('payments:tier:solv'),
        kv.get('payments:tier:broadcast'),
        kv.get('payments:tier:zk'),
        kv.get('payments:tier:stream'),
      ]);
      const daily: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        const count = await kv.get(`payments:daily:${date}`);
        daily[date] = (count as number) || 0;
      }
      return {
        source: 'kv', total: (total as number) || 0,
        byNetwork: { base: (base as number) || 0, solana: (solana as number) || 0 },
        byTier: { standard: (standard as number) || 0, intelligence: (intelligence as number) || 0, security: (security as number) || 0, solv: (solv as number) || 0, broadcast: (broadcast as number) || 0, zk: (zk as number) || 0, stream: (stream as number) || 0 },
        daily, since: 'persistent',
      };
    } catch (err) { console.error('[revenue] KV read error:', err); }
  }
  return {
    source: 'memory', total: paymentCounter.total,
    byNetwork: paymentCounter.byNetwork, byTier: paymentCounter.byTier,
    daily: {}, since: paymentCounter.since,
  };
}

// ============ V2 Reader — USD Revenue Stats ============

export interface RevenueV2Stats {
  source: 'kv' | 'memory';
  /** Total USD revenue across all time */
  totalUsd: number;
  /** Daily USD revenue (last 30 days) */
  dailyUsd: Record<string, number>;
  /** Weekly USD revenue (last 12 weeks) */
  weeklyUsd: Record<string, number>;
  /** Monthly USD revenue (last 6 months) */
  monthlyUsd: Record<string, number>;
  /** Revenue by network (base, solana) */
  byNetwork: Record<string, number>;
  /** Revenue by endpoint category */
  byEndpoint: Record<string, number>;
  /** Payment counts (backward-compatible) */
  paymentCounts: {
    total: number;
    byNetwork: Record<string, number>;
    byTier: Record<string, number>;
    daily: Record<string, number>;
  };
}

export async function getRevenueStatsV2(): Promise<RevenueV2Stats> {
  const kv = await getKV();

  // Fallback: derive v1 stats from memory, return zero v2
  const fallback = (): RevenueV2Stats => ({
    source: 'memory',
    totalUsd: 0,
    dailyUsd: {},
    weeklyUsd: {},
    monthlyUsd: {},
    byNetwork: {},
    byEndpoint: {},
    paymentCounts: {
      total: paymentCounter.total,
      byNetwork: paymentCounter.byNetwork,
      byTier: paymentCounter.byTier,
      daily: {},
    },
  });

  if (!kv) return fallback();

  try {
    // Read V1 counts
    const [total, base, solana, standard, intelligence, security, solv, broadcast, zk, stream] = await Promise.all([
      kv.get('payments:total'),
      kv.get('payments:network:base'),
      kv.get('payments:network:solana'),
      kv.get('payments:tier:standard'),
      kv.get('payments:tier:intelligence'),
      kv.get('payments:tier:security'),
      kv.get('payments:tier:solv'),
      kv.get('payments:tier:broadcast'),
      kv.get('payments:tier:zk'),
      kv.get('payments:tier:stream'),
    ]);

    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      const count = await kv.get(`payments:daily:${date}`);
      dailyCounts[date] = (count as number) || 0;
    }

    // Read V2 USD data
    const totalUsd = (await kv.get('revenue_usd:total')) || 0;

    // Daily USD (last 30 days)
    const dailyUsd: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      const val = await kv.get(`revenue_usd:daily:${date}`);
      dailyUsd[date] = (val as number) || 0;
    }

    // Weekly USD (last 12 weeks)
    const weeklyUsd: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.now() - i * 7 * 86400_000);
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const dayOfYear = Math.ceil((d.getTime() - startOfYear.getTime()) / 86400000);
      const weekNum = Math.ceil(dayOfYear / 7);
      const weekKey = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      const val = await kv.get(`revenue_usd:weekly:${weekKey}`);
      weeklyUsd[weekKey] = (val as number) || 0;
    }

    // Monthly USD (last 6 months)
    const monthlyUsd: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toISOString().slice(0, 7);
      const val = await kv.get(`revenue_usd:monthly:${monthKey}`);
      monthlyUsd[monthKey] = (val as number) || 0;
    }

    // Network breakdown
    const baseRev = (await kv.get('revenue_usd:network:base')) || 0;
    const solanaRev = (await kv.get('revenue_usd:network:solana')) || 0;

    // Endpoint breakdown
    const endpointKeys = [
      'signal', 'entity', 'portfolio', 'history', 'mempool-intel', 'mining',
      'hodl-waves', 'sopr', 'mvrv', 'lightning', 'l2', 'intelligence',
      'solv', 'security', 'broadcast', 'zk-verify', 'zk-generate', 'stream',
      'ordinals', 'marketplace', 'price', 'fees', 'alerts', 'address',
      'tx-status', 'standard',
    ];
    const endpointResults = await Promise.all(
      endpointKeys.map(k => kv.get(`revenue_usd:endpoint:${k}`))
    );
    const byEndpoint: Record<string, number> = {};
    endpointKeys.forEach((key, i) => {
      const val = (endpointResults[i] as number) || 0;
      if (val > 0) byEndpoint[key] = val;
    });

    return {
      source: 'kv',
      totalUsd: (totalUsd as number) || 0,
      dailyUsd,
      weeklyUsd,
      monthlyUsd,
      byNetwork: { base: (baseRev as number) || 0, solana: (solanaRev as number) || 0 },
      byEndpoint,
      paymentCounts: {
        total: (total as number) || 0,
        byNetwork: { base: (base as number) || 0, solana: (solana as number) || 0 },
        byTier: {
          standard: (standard as number) || 0,
          intelligence: (intelligence as number) || 0,
          security: (security as number) || 0,
          solv: (solv as number) || 0,
          broadcast: (broadcast as number) || 0,
          zk: (zk as number) || 0,
          stream: (stream as number) || 0,
        },
        daily: dailyCounts,
      },
    };
  } catch (err) {
    console.error('[revenue-v2] KV read error:', err);
    return fallback();
  }
}
