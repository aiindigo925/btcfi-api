/**
 * Lightning Channel Info
 * GET /api/v1/lightning/channels/:chanId
 */
import { NextRequest, NextResponse } from 'next/server';
import { getChannelInfo } from '@/lib/lightning-insights';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chanId: string }> },
) {
  const { chanId } = await params;

  if (!chanId || chanId.length < 5) {
    return NextResponse.json(
      { success: false, error: 'Invalid channel ID', code: 'INVALID_CHANNEL_ID' },
      { status: 400 },
    );
  }

  try {
    const result = await getChannelInfo(chanId);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Channel not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'lightning-channel',
        pricing: '$0.02/call',
        source: '1ML',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Channel info lookup failed',
        code: 'LIGHTNING_CHANNEL_FAILED',
      },
      { status: 500 },
    );
  }
}
