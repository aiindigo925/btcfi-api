/**
 * Threat Analysis Endpoint — MP1 Task 8.3
 * PCEF-inspired pattern matching (Traceix + YARA)
 */
import { NextRequest, NextResponse } from 'next/server';
import { analyzeThreat } from '@/lib/threat';
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
    const report = await analyzeThreat(addr);

    return NextResponse.json({
      success: true,
      data: report,
      meta: {
        endpoint: 'threat-analysis',
        pricing: '$0.02/call',
        poweredBy: 'PCEF-inspired YARA pattern engine',
        patterns: 8,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Threat analysis failed', code: 'ANALYSIS_FAILED' },
      { status: 500 }
    );
  }
}
