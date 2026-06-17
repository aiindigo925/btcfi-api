/**
 * API Key Self-Serve Endpoint — GET /api/v1/api-keys/me
 *
 * Returns key info, usage stats, payment history, and rate limit status
 * for the authenticated API key.
 * Auth: X-API-Key header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getUsageStats, checkQuota, TIER_CONFIGS } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiKeyHeader = request.headers.get('X-API-Key') || request.headers.get('x-api-key');

  if (!apiKeyHeader) {
    return NextResponse.json(
      { success: false, error: 'X-API-Key header required' },
      { status: 401 }
    );
  }

  try {
    const validation = await validateApiKey(apiKeyHeader);

    if (!validation.valid || !validation.info) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const { info } = validation;
    const usage = await getUsageStats(info.keyHash, info.tier, info.label, info.created);
    const quota = await checkQuota(info.keyHash, info.tier);
    const tierConfig = TIER_CONFIGS[info.tier];

    // Fetch payment/revenue data from Redis for this key's endpoint usage
    let paymentHistory: { dailyUsd: Record<string, number>; totalUsd: number; byEndpoint: Record<string, number> } = {
      dailyUsd: {},
      totalUsd: 0,
      byEndpoint: {},
    };

    try {
      const { getRedis } = await import('@/lib/redis');
      const kv = getRedis();

      // Read daily USD revenue for last 30 days
      const dailyUsd: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const val = await kv.get(`revenue_usd:daily:${date}`);
        dailyUsd[date] = (val as number) || 0;
      }

      const totalUsdVal = await kv.get('revenue_usd:total');
      const totalUsd = (totalUsdVal as number) || 0;

      // Endpoint breakdown for revenue
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

      paymentHistory = { dailyUsd, totalUsd, byEndpoint };
    } catch {
      // Non-fatal: payment data optional
    }

    // Rate limit status
    const rateLimitStatus = {
      tier: info.tier,
      dailyLimit: tierConfig.dailyLimit === Infinity ? 'unlimited' : tierConfig.dailyLimit,
      usedToday: quota.usedToday,
      remaining: quota.remaining === Infinity ? 'unlimited' : quota.remaining,
      allowed: quota.allowed,
    };

    // Recent failed requests (from Redis if available)
    let recentErrors: Array<{ timestamp: string; endpoint: string; statusCode: number; message: string }> = [];
    try {
      const { getRedis } = await import('@/lib/redis');
      const kv = getRedis();
      const errorKey = `apikey:${info.keyHash}:errors`;
      const rawErrors = await kv.lrange(errorKey, 0, 4);
      if (rawErrors && rawErrors.length > 0) {
        recentErrors = rawErrors.map((e: any) => {
          try { return typeof e === 'string' ? JSON.parse(e) : e; }
          catch { return { timestamp: '', endpoint: '', statusCode: 0, message: 'parse error' }; }
        });
      }
    } catch {
      // Non-fatal
    }

    // API uptime (last 7 days)
    let uptimeData: { totalChecks: number; healthyChecks: number; uptimePercent: number; dailyHealth: Record<string, boolean> } = {
      totalChecks: 0,
      healthyChecks: 0,
      uptimePercent: 100,
      dailyHealth: {},
    };
    try {
      const { getRedis } = await import('@/lib/redis');
      const kv = getRedis();
      let totalChecks = 0;
      let healthyChecks = 0;
      const dailyHealth: Record<string, boolean> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const checkResult = await kv.get(`health:daily:${date}`);
        if (checkResult !== null) {
          totalChecks++;
          const isHealthy = checkResult !== false && checkResult !== 0;
          if (isHealthy) healthyChecks++;
          dailyHealth[date] = isHealthy;
        }
      }
      uptimeData = {
        totalChecks,
        healthyChecks,
        uptimePercent: totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 10000) / 100 : 100,
        dailyHealth,
      };
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      key: {
        keyHash: info.keyHash,
        keyPreview: `${info.key.slice(0, 11)}...${info.key.slice(-4)}`,
        fullKey: info.key,
        tierInfo: {
          tier: info.tier,
          label: tierConfig.label,
          dailyLimit: tierConfig.dailyLimit === Infinity ? 'unlimited' : tierConfig.dailyLimit,
          monthlyPrice: tierConfig.monthlyPrice,
        },
        label: info.label,
        created: info.created,
        expires: info.expires,
        active: info.active,
      },
      usage: {
        totalToday: usage.totalToday,
        dailyBreakdown: usage.dailyBreakdown,
        endpointBreakdown: usage.endpointBreakdown,
      },
      rateLimitStatus,
      paymentHistory,
      uptime: uptimeData,
      recentErrors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
