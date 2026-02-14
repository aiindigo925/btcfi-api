/**
 * Internal proxy for /safe page — calls threat analysis without x402 payment.
 * Same pattern as Telegram bot: uses INTERNAL_API_KEY bypass.
 * MP5 Phase 2 — Task 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeThreat } from '@/lib/threat';
import { isValidBitcoinAddress } from '@/lib/validation';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

export async function GET(request: NextRequest) {
  // Verify internal caller (from /safe page server component or client fetch)
  const internalKey = request.headers.get('X-Internal-Key');
  const referer = request.headers.get('referer') || '';
  const isSafePageOrigin = referer.includes('/safe');

  // Allow if internal key matches OR request comes from /safe page
  if (INTERNAL_KEY && internalKey !== INTERNAL_KEY && !isSafePageOrigin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addr = request.nextUrl.searchParams.get('addr');
  if (!addr || !isValidBitcoinAddress(addr)) {
    return NextResponse.json({ error: 'Invalid Bitcoin address' }, { status: 400 });
  }

  try {
    const report = await analyzeThreat(addr);
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    console.error('Safe check error:', err);
    return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 });
  }
}
