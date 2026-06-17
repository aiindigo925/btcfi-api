/**
 * Taproot Asset Info by Asset ID
 * GET /api/v1/taproot/assets/:addr/:assetId
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTaprootAssetInfo } from '@/lib/taproot-assets';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ addr: string; assetId: string }> },
) {
  const { addr, assetId } = await params;

  if (!assetId || assetId.length < 10) {
    return NextResponse.json(
      { success: false, error: 'Invalid asset ID', code: 'INVALID_ASSET_ID' },
      { status: 400 },
    );
  }

  try {
    const result = await getTaprootAssetInfo(assetId);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Asset not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'taproot-asset-info',
        pricing: '$0.02/call',
        source: 'TAP indexers',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Asset info lookup failed',
        code: 'TAPROOT_ASSET_INFO_FAILED',
      },
      { status: 500 },
    );
  }
}
