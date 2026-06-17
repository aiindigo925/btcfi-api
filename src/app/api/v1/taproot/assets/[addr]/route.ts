/**
 * Taproot Assets by Address
 * GET /api/v1/taproot/assets/:addr
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTaprootAssets } from '@/lib/taproot-assets';
import { isValidBitcoinAddress } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Bitcoin address', code: 'INVALID_ADDRESS' },
      { status: 400 },
    );
  }

  try {
    const result = await getTaprootAssets(addr);
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'taproot-assets',
        pricing: '$0.02/call',
        source: 'TAP indexers',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Taproot asset lookup failed',
        code: 'TAPROOT_ASSETS_FAILED',
      },
      { status: 500 },
    );
  }
}
