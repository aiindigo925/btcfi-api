/**
 * Cron Health Check — Task 6
 *
 * Vercel Cron hits this every 5 minutes.
 * Checks all upstream services and logs failures.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function checkEndpoint(url: string, timeout = 5000): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

export async function GET() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://btcfi.aiindigo.com';

  const checks = await Promise.all([
    checkEndpoint(`${base}/api/health`),
    checkEndpoint(`${base}/api/v1`),
    checkEndpoint('https://mempool.space/api/v1/fees/recommended'),
  ]);

  const [health, index, mempool] = checks;
  const allOk = checks.every(c => c.ok);

  const result = {
    timestamp: new Date().toISOString(),
    status: allOk ? 'healthy' : 'degraded',
    checks: {
      'btcfi-health': health,
      'btcfi-index': index,
      'mempool-upstream': mempool,
    },
  };

  if (!allOk) {
    console.error('[CRON] Health check degraded:', JSON.stringify(result));
  }

  return NextResponse.json(result, {
    status: allOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
