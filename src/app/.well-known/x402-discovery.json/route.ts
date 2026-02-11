import { NextResponse } from 'next/server';

export async function GET() {
  const discovery = {
    version: '2.0',
    provider: {
      name: 'BTCFi API',
      url: 'https://btcfi.aiindigo.com',
      description: 'Bitcoin data, intelligence, security, Solv Protocol, and ZK proofs for AI agents',
    },
    payment: {
      networks: [
        {
          chain_id: 'eip155:8453',
          name: 'Base',
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          asset_symbol: 'USDC',
          facilitator: 'https://x402.org/facilitator',
          facilitator_provider: 'Coinbase',
        },
        {
          chain_id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'Solana',
          asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          asset_symbol: 'USDC',
          facilitator: 'https://thrt.ai/nlx402',
          facilitator_provider: 'NLx402 (PCEF)',
        },
      ],
      currency: 'USD',
      min_amount: '0.01',
      max_amount: '0.05',
    },
    endpoints_count: 31,
    openapi: '/openapi.json',
    peac: '/.well-known/peac.txt',
    mcp: { package: '@aiindigo/btcfi-mcp', tools: 27 },
    sdk: { package: '@aiindigo/btcfi', methods: 28 },
  };

  return NextResponse.json(discovery, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
