/**
 * Revenue Analytics — Task 14.5
 * Admin-only. Tracks x402 payment activity.
 *
 * Since Vercel is serverless, persistent counters require external storage.
 * This provides:
 *   - In-process counters (reset on cold start — good for monitoring)
 *   - On-chain treasury balance check (real revenue)
 *   - Pricing summary for projections
 *
 * In production, add Vercel KV or Upstash Redis for persistent counters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PRICING, FACILITATORS } from '@/lib/x402';
import { evmCall } from '@/lib/rpc';
import { getRevenueStats } from '@/lib/revenue';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

export async function GET(request: NextRequest) {
  // Admin auth — accepts both X-Admin-Key and Authorization: Bearer
  const adminKey = request.headers.get('X-Admin-Key')
    || (request.headers.get('Authorization') || '').replace('Bearer ', '')
    || '';

  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Set ADMIN_API_KEY env var and pass as Bearer token.' },
      { status: 401 }
    );
  }

  // On-chain treasury balance (Base USDC)
  let baseTreasuryBalance = 'unknown';
  try {
    const treasuryAddr = FACILITATORS.base.payTo;
    const usdcAddr = FACILITATORS.base.assetAddress;
    const paddedAddr = treasuryAddr.toLowerCase().replace('0x', '').padStart(64, '0');
    const result = await evmCall('base', usdcAddr, `0x70a08231${paddedAddr}`);
    const balanceRaw = BigInt(result);
    baseTreasuryBalance = `$${(Number(balanceRaw) / 1e6).toFixed(2)} USDC`;
  } catch {
    baseTreasuryBalance = 'RPC error';
  }

  // Revenue projections
  const monthlyTarget = {
    standard: { queries: 100000, price: 0.01, revenue: 1000 },
    intelligence: { queries: 50000, price: 0.02, revenue: 1000 },
    broadcast: { queries: 10000, price: 0.05, revenue: 500 },
    solv: { queries: 30000, price: 0.02, revenue: 600 },
    security: { queries: 20000, price: 0.02, revenue: 400 },
    total: { queries: 210000, revenue: 3500 },
  };

  return NextResponse.json({
    success: true,
    revenue: {
      treasury: {
        base: {
          address: FACILITATORS.base.payTo,
          balance: baseTreasuryBalance,
        },
        solana: {
          address: FACILITATORS.solana.payTo,
          balance: 'Check on Solscan',
        },
      },
      stats: await getRevenueStats(),
      pricing: PRICING,
      projections: monthlyTarget,
    },
    timestamp: new Date().toISOString(),
  });
}
