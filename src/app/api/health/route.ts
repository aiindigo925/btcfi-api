/**
 * Health Check — Task 14.4
 * API status, upstream status, RPC health, facilitator status, version/uptime
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRpcHealth } from '@/lib/rpc';
import { getBlockHeight } from '@/lib/bitcoin';
import { FACILITATORS } from '@/lib/x402';

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const checks: Record<string, { status: string; latencyMs?: number; detail?: string }> = {};

  // 1. mempool.space
  try {
    const start = Date.now();
    const res = await fetch('https://mempool.space/api/blocks/tip/height');
    checks.mempool = {
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch {
    checks.mempool = { status: 'down' };
  }

  // 2. RPC health (Whistle + EVM chains)
  try {
    const rpcHealth = await checkRpcHealth();
    checks.solana_rpc = {
      status: rpcHealth.solana.status,
      latencyMs: rpcHealth.solana.latencyMs,
      detail: rpcHealth.solana.url,
    };
    for (const [chain, health] of Object.entries(rpcHealth.evm)) {
      checks[`evm_${chain}`] = {
        status: health.status,
        latencyMs: health.latencyMs,
      };
    }
  } catch {
    checks.rpc = { status: 'error', detail: 'RPC health check failed' };
  }

  // 3. Facilitator reachability
  for (const [network, config] of Object.entries(FACILITATORS)) {
    try {
      const start = Date.now();
      const res = await fetch(config.url, { method: 'HEAD' }).catch(() => null);
      checks[`facilitator_${network}`] = {
        status: res ? 'reachable' : 'unreachable',
        latencyMs: Date.now() - start,
        detail: config.provider,
      };
    } catch {
      checks[`facilitator_${network}`] = { status: 'unreachable' };
    }
  }

  // Overall status
  const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'reachable');
  const anyDown = Object.values(checks).some(c => c.status === 'down' || c.status === 'error');
  const overallStatus = anyDown ? 'degraded' : allOk ? 'healthy' : 'partial';

  return NextResponse.json({
    status: overallStatus,
    version: '3.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    uptimeHuman: formatUptime(Date.now() - startTime),
    checks,
    endpoints: {
      total: 31,
      live: 31,
      coming: 0,
    },
    x402: {
      enabled: process.env.X402_ENABLED === 'true',
      networks: ['base', 'solana'],
    },
    timestamp: new Date().toISOString(),
  });
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}
