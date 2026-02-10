/**
 * Whale Alert — MP0 Task 2.3
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWhaleTransactions } from '@/lib/intelligence';
import { sanitizeFloat } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minBtc = sanitizeFloat(searchParams.get('min'), 10, 1, 10000);
    const whales = await getWhaleTransactions(minBtc);
    return NextResponse.json({
      success: true,
      data: {
        threshold: `${minBtc} BTC`,
        count: whales.length,
        transactions: whales,
      },
      meta: { endpoint: 'whale-alert', pricing: '$0.02/call' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Whale detection failed', code: 'DETECTION_FAILED' },
      { status: 500 }
    );
  }
}
