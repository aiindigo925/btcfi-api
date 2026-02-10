/**
 * Revenue Tracking — MP3 Task 17.3
 * Persistent payment counters via Vercel KV + in-memory fallback.
 * Shared between middleware (writes) and admin/revenue route (reads).
 */

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
