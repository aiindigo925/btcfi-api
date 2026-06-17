/**
 * Lightning Node Info
 * GET /api/v1/lightning/node/:pubkey
 */
import { NextRequest, NextResponse } from 'next/server';
import { getNodeInfo } from '@/lib/lightning-insights';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> },
) {
  const { pubkey } = await params;

  if (!pubkey || pubkey.length < 66 || pubkey.length > 67) {
    return NextResponse.json(
      { success: false, error: 'Invalid Lightning node public key', code: 'INVALID_PUBKEY' },
      { status: 400 },
    );
  }

  try {
    const result = await getNodeInfo(pubkey);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Node not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'lightning-node',
        pricing: '$0.02/call',
        source: '1ML',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Lightning node lookup failed',
        code: 'LIGHTNING_NODE_FAILED',
      },
      { status: 500 },
    );
  }
}
