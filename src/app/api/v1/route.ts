import { NextRequest, NextResponse } from 'next/server';
import { getBlockHeight, getBtcPrice } from '@/lib/bitcoin';
import { getX402Status } from '@/lib/x402';
import { getSolanaRpc } from '@/lib/rpc';

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
      version: '3.0.0',
      tagline: 'Bitcoin + BTCFi data for agents. No tokens. Just ship.',
      description: 'Agent-native Bitcoin data, intelligence, BTCFi, security, ZK proofs & real-time streams via x402 micropayments',
      masterplan: 'MP0 ✅ | MP1 ✅ | MP2 ✅ | MP3 ✅ | MP4 ✅',
      docs: '/api/docs',
      openapi: '/openapi.json',
      dashboard: '/dashboard',
    },
    live: {
      blockHeight,
      btcPrice,
    },
    endpoints: {
      // ── Phase 1: Core API ──
      fees: { url: '/api/v1/fees', method: 'GET', price: '$0.01', status: 'live' },
      mempool: { url: '/api/v1/mempool', method: 'GET', price: '$0.01', status: 'live' },
      address: {
        info: { url: '/api/v1/address/{addr}', method: 'GET', price: '$0.01', status: 'live' },
        utxos: { url: '/api/v1/address/{addr}/utxos', method: 'GET', price: '$0.01', status: 'live' },
        txs: { url: '/api/v1/address/{addr}/txs', method: 'GET', price: '$0.01', status: 'live' },
      },
      tx: {
        get: { url: '/api/v1/tx/{txid}', method: 'GET', price: '$0.01', status: 'live' },
        status: { url: '/api/v1/tx/{txid}/status', method: 'GET', price: '$0.01', status: 'live' },
        broadcast: { url: '/api/v1/tx/broadcast', method: 'POST', price: '$0.05', status: 'live' },
      },
      block: {
        latest: { url: '/api/v1/block/latest', method: 'GET', price: '$0.01', status: 'live' },
        byId: { url: '/api/v1/block/{height_or_hash}', method: 'GET', price: '$0.01', status: 'live' },
      },
      // ── Phase 2: Intelligence ──
      intelligence: {
        consolidate: { url: '/api/v1/intelligence/consolidate/{addr}', method: 'GET', price: '$0.02', status: 'live' },
        feePredict: { url: '/api/v1/intelligence/fees', method: 'GET', price: '$0.02', status: 'live' },
        whales: { url: '/api/v1/intelligence/whales', method: 'GET', price: '$0.02', status: 'live' },
        risk: { url: '/api/v1/intelligence/risk/{addr}', method: 'GET', price: '$0.02', status: 'live' },
        network: { url: '/api/v1/intelligence/network', method: 'GET', price: '$0.02', status: 'live' },
      },
      // ── MP1 Phase 8: Security ──
      security: {
        threat: { url: '/api/v1/security/threat/{addr}', method: 'GET', price: '$0.02', status: 'live', poweredBy: 'PCEF YARA patterns' },
      },
      // ── MP1 Phase 9: Staking ──
      staking: {
        status: { url: '/api/v1/staking/status?address={wallet}', method: 'GET', price: 'free', status: 'live' },
      },
      // ── MP2 Phase 11: Solv Protocol BTCFi ──
      solv: {
        reserves: { url: '/api/v1/solv/reserves', method: 'GET', price: '$0.02', status: 'live', description: 'SolvBTC supply across chains, backing ratio, TVL' },
        yield: { url: '/api/v1/solv/yield', method: 'GET', price: '$0.02', status: 'live', description: 'xSolvBTC APY, yield strategies, comparisons' },
        liquidity: { url: '/api/v1/solv/liquidity?chain=', method: 'GET', price: '$0.02', status: 'live', description: 'Cross-chain SolvBTC distribution' },
        risk: { url: '/api/v1/solv/risk', method: 'GET', price: '$0.02', status: 'live', description: 'Multi-factor risk assessment' },
      },
      zk: {
        balanceProof: { url: '/api/v1/zk/balance-proof', method: 'POST', price: '$0.03', status: 'live', poweredBy: 'zkRune Groth16' },
        ageProof: { url: '/api/v1/zk/age-proof', method: 'POST', price: '$0.03', status: 'live' },
        membership: { url: '/api/v1/zk/membership', method: 'POST', price: '$0.03', status: 'live' },
        verify: { url: '/api/v1/zk/verify', method: 'POST', price: '$0.01', status: 'live' },
      },
      stream: {
        events: { url: '/api/v1/stream', method: 'GET', price: '$0.01', status: 'live', description: 'SSE stream: new_block, fee_change, mempool_surge' },
        whales: { url: '/api/v1/stream/whales', method: 'GET', price: '$0.01', status: 'live', description: 'SSE whale tx alerts. Query: ?min=100' },
      },
    },
    x402: getX402Status(),
    security: {
      features: [
        'Dual-facilitator x402 (Base + Solana NLx402)',
        'YARA-pattern threat analysis (PCEF-inspired)',
        'Wallet signature authentication (Ed25519 + secp256k1)',
        'Encrypted responses (Curve25519 + XSalsa20-Poly1305)',
        'Nonce-based replay protection',
        'Tiered rate limiting with progressive backoff',
        'ZK proofs for privacy-preserving verification (Groth16)',
      ],
      headers: {
        'X-Payment': 'x402 micropayment proof (Base or Solana)',
        'X-Payment-Network': 'base | solana',
        'X-Signature': 'Wallet signature for higher rate limits',
        'X-Nonce': 'Unique nonce for replay protection',
        'X-Signer': 'Wallet address (EVM or Solana)',
        'X-Encrypt-Response': 'Curve25519 public key for encrypted response',
        'X-Staker': 'Staker wallet address for unlimited access',
      },
      manifest: '/.well-known/x402-manifest.json',
    },
    mcp: {
      package: '@aiindigo/btcfi-mcp',
      status: 'live',
      tools: 27,
      transport: 'stdio',
    },
    sdk: {
      package: '@aiindigo/btcfi',
      status: 'live',
      methods: 28,
    },
    _meta: {
      source: ['mempool.space', 'Solv Protocol on-chain', 'Whistle Network RPC'],
      solanaRpc: getSolanaRpc(),
      builder: 'AI Indigo',
      philosophy: 'No tokens. Product is the value. Ship > talk.',
      poweredBy: ['PCEF/NLx402', 'zkRune', 'Clawd Bot patterns', 'Utopian encryption'],
    },
  });
}
