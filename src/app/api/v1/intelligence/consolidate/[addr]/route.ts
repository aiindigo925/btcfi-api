/**
 * UTXO Consolidation Advisor — MP0 Task 2.1
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConsolidationAdvice } from '@/lib/intelligence';
import { isValidBitcoinAddress, ERRORS } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> }
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return NextResponse.json(ERRORS.INVALID_ADDRESS, { status: 400 });
  }

  try {
    const advice = await getConsolidationAdvice(addr);
    return NextResponse.json({
      success: true,
      data: advice,
      meta: { endpoint: 'consolidation-advisor', pricing: '$0.02/call' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Consolidation analysis failed', code: 'ANALYSIS_FAILED' },
      { status: 500 }
    );
  }
}
