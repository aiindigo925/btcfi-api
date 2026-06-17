/**
 * API Key Self-Serve Endpoint — GET /api/v1/api-keys/me
 *
 * Returns key info and usage stats for the authenticated API key.
 * Auth: X-API-Key header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getUsageStats, TIER_CONFIGS } from '@/lib/api-keys';

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
    const tierConfig = TIER_CONFIGS[info.tier];

    return NextResponse.json({
      success: true,
      key: {
        ...info,
        // Mask the full key in response — only show preview
        keyPreview: `${info.key.slice(0, 11)}...${info.key.slice(-4)}`,
        tierInfo: {
          tier: info.tier,
          label: tierConfig.label,
          dailyLimit: tierConfig.dailyLimit === Infinity ? 'unlimited' : tierConfig.dailyLimit,
          monthlyPrice: tierConfig.monthlyPrice,
        },
        usage: {
          totalToday: usage.totalToday,
          dailyBreakdown: usage.dailyBreakdown,
          endpointBreakdown: usage.endpointBreakdown,
        },
      },
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
