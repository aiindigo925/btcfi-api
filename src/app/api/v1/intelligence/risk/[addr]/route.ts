/**
 * Address Risk Scoring — MP0 Task 2.4
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAddressRisk } from '@/lib/intelligence';
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
    const risk = await getAddressRisk(addr);
    return NextResponse.json({
      success: true,
      data: risk,
      meta: { endpoint: 'address-risk', pricing: '$0.02/call' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Risk analysis failed', code: 'ANALYSIS_FAILED' },
      { status: 500 }
    );
  }
}
