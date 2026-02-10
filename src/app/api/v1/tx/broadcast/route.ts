import { NextRequest, NextResponse } from 'next/server';
import { broadcastTx } from '@/lib/bitcoin';
import { isValidRawTxHex, ERRORS } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let txHex: string;

    if (contentType.includes('application/json')) {
      // JSON body: {"txHex": "0200000001..."}
      // Used by MCP server, SDK, and OpenAPI-conformant clients
      const body = await request.json();
      txHex = (body.txHex || body.tx_hex || body.hex || '').trim();
    } else {
      // Raw hex body: 0200000001...
      // Used by curl and simple clients
      txHex = (await request.text()).trim();
    }

    if (!isValidRawTxHex(txHex)) {
      return NextResponse.json(ERRORS.INVALID_RAW_TX, { status: 400 });
    }

    const txid = await broadcastTx(txHex);

    return NextResponse.json({
      success: true,
      txid,
      message: 'Transaction broadcast successfully',
      explorer: `https://mempool.space/tx/${txid}`,
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Broadcast failed. Transaction may be invalid or already confirmed.', code: 'BROADCAST_FAILED' },
      { status: 400 }
    );
  }
}
