import { NextResponse } from 'next/server';

export async function GET() {
  const peacTxt = `version: 0.9.15
provider: BTCFi API
provider_url: https://btcfi.aiindigo.com
operator: AI Indigo
operator_url: https://aiindigo.com

usage: conditional
purposes: [research, commercial, agent-automation, analytics]
attribution: optional
receipts: optional

rate_limit: 100/minute
rate_limit_signed: 500/minute

price: 0.01
currency: USD
payment_methods: [x402]
payment_networks: [base, solana]
payment_endpoint: https://btcfi.aiindigo.com/api/v1

data_source: mempool.space, Solv Protocol, on-chain analysis
data_freshness: real-time (mempool), 10s cache (blocks), 60s cache (price)
data_license: open data (Bitcoin blockchain is public)

prohibited_uses: [surveillance, sanctions-evasion, money-laundering]

contact: security@aiindigo.com
terms_updated: 2026-02-11`;

  return new NextResponse(peacTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
