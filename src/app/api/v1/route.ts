import { NextRequest, NextResponse } from 'next/server';
import { getBlockHeight, getBtcPrice } from '@/lib/bitcoin';

export async function GET(request: NextRequest) {
  let blockHeight = 0;
  let btcPrice = { USD: 0, EUR: 0 };
  
  try {
    [blockHeight, btcPrice] = await Promise.all([
      getBlockHeight(),
      getBtcPrice(),
    ]);
  } catch (e) {
    // Continue with defaults
  }

  return NextResponse.json({
    success: true,
    api: {
      name: 'BTCFi API',
      version: '1.0.0',
      tagline: 'Bitcoin data for agents. No tokens. Just ship.',
      description: 'Agent-native Bitcoin data API via x402',
    },
    live: {
      blockHeight,
      btcPrice,
    },
    endpoints: {
      fees: {
        recommended: { url: '/api/v1/fees', method: 'GET' },
      },
      mempool: {
        summary: { url: '/api/v1/mempool', method: 'GET' },
        txs: { url: '/api/v1/mempool/txs', method: 'GET', params: ['limit'] },
      },
      address: {
        info: { url: '/api/v1/address/{addr}', method: 'GET' },
        utxos: { url: '/api/v1/address/{addr}/utxos', method: 'GET' },
        txs: { url: '/api/v1/address/{addr}/txs', method: 'GET' },
      },
      tx: {
        get: { url: '/api/v1/tx/{txid}', method: 'GET' },
        status: { url: '/api/v1/tx/{txid}/status', method: 'GET' },
        broadcast: { url: '/api/v1/tx/broadcast', method: 'POST' },
      },
      block: {
        latest: { url: '/api/v1/block/latest', method: 'GET' },
        byHeight: { url: '/api/v1/block/{height}', method: 'GET' },
        byHash: { url: '/api/v1/block/{hash}', method: 'GET' },
      },
    },
    x402: {
      enabled: false, // Will enable after testing
      facilitator: 'https://pay.aiindigo.com',
      price: '$0.01 USDC per query',
      networks: ['base', 'solana'],
    },
    _meta: {
      source: 'mempool.space',
      github: 'https://github.com/aiindigo925/btcfi-api',
      builder: 'Indigo & Molty',
      philosophy: 'No tokens. Just ship.',
    },
  });
}
