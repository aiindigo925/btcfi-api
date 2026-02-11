/**
 * Admin Stats API — Task 19
 * Dashboard-oriented stats: revenue, rate limits, top endpoints, recent payments.
 * Auth via X-Admin-Key header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PRICING, FACILITATORS } from '@/lib/x402';
import { getRevenueStats } from '@/lib/revenue';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get('X-Admin-Key') || '';

  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getRevenueStats();

  // Calculate revenue from payment counts and pricing
  const revenueByTier: Record<string, number> = {};
  let totalRevenue = 0;
  for (const [tier, count] of Object.entries(stats.byTier)) {
    const price = PRICING[tier] || PRICING.default;
    const rev = count * price;
    revenueByTier[tier] = rev;
    totalRevenue += rev;
  }

  // Day/week revenue from daily stats
  const today = new Date().toISOString().slice(0, 10);
  const dayRequests = stats.daily[today] || 0;
  const weekRequests = Object.values(stats.daily).reduce((sum, n) => sum + n, 0);
  const avgPrice = stats.total > 0 ? totalRevenue / stats.total : PRICING.default;
  const dayRevenue = (dayRequests * avgPrice).toFixed(2);
  const weekRevenue = (weekRequests * avgPrice).toFixed(2);

  // Estimate active clients by tier (rough heuristic from recent counts)
  const freeActive = Math.max(0, Math.floor(stats.total * 0.6) - (stats.byNetwork.base || 0) - (stats.byNetwork.solana || 0));
  const paidActive = (stats.byNetwork.base || 0) + (stats.byNetwork.solana || 0);

  // Top endpoints (from tier breakdown, approximated)
  const topEndpoints = Object.entries(stats.byTier)
    .sort(([, a], [, b]) => b - a)
    .map(([tier, count]) => ({
      path: tier === 'standard' ? '/api/v1/fees (+ core)' :
            tier === 'intelligence' ? '/api/v1/intelligence/*' :
            tier === 'security' ? '/api/v1/security/threat/*' :
            tier === 'solv' ? '/api/v1/solv/*' :
            tier === 'broadcast' ? '/api/v1/tx/broadcast' :
            tier === 'zk' ? '/api/v1/zk/*' :
            tier === 'stream' ? '/api/v1/stream/*' : `/api/v1/${tier}`,
      count,
    }));

  return NextResponse.json({
    revenue: {
      day: dayRevenue,
      week: weekRevenue,
      total: totalRevenue.toFixed(2),
      requestsDay: dayRequests,
      paidRequestsDay: Math.floor(dayRequests * (paidActive / Math.max(1, paidActive + freeActive))),
      byTier: revenueByTier,
      source: stats.source,
      treasury: {
        base: FACILITATORS.base.payTo,
        solana: FACILITATORS.solana.payTo,
      },
    },
    rateLimits: {
      freeActive: freeActive,
      signedActive: 0,
      paidActive: paidActive,
      stakedActive: 0,
      tiers: {
        free: '100/min',
        signed: '500/min',
        paid: 'unlimited',
        staked: 'unlimited',
      },
    },
    topEndpoints,
    recentPayments: [],  // Populated when Upstash Redis list is configured
    daily: stats.daily,
    timestamp: new Date().toISOString(),
  });
}
