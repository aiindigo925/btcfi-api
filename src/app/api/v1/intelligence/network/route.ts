/**
 * Network Health Dashboard — MP0 Task 2.5
 */
import { NextRequest, NextResponse } from 'next/server';
import { getNetworkHealth } from '@/lib/intelligence';
export async function GET(request: NextRequest) {
  try {
    const health = await getNetworkHealth();
    return NextResponse.json({
      success: true,
      data: health,
      meta: { endpoint: 'network-health', pricing: '$0.02/call' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Network health check failed', code: 'HEALTH_CHECK_FAILED' },
      { status: 500 }
    );
  }
}
