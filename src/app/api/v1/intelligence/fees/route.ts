/**
 * Fee Prediction Engine — MP0 Task 2.2
 */
import { NextRequest, NextResponse } from 'next/server';
import { getFeePredictions } from '@/lib/intelligence';
import { sanitizeInt } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = sanitizeInt(searchParams.get('hours'), 6, 1, 24);
    const predictions = await getFeePredictions(hours);
    return NextResponse.json({
      success: true,
      data: predictions,
      meta: { endpoint: 'fee-predictions', pricing: '$0.02/call' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Fee prediction failed', code: 'PREDICTION_FAILED' },
      { status: 500 }
    );
  }
}
