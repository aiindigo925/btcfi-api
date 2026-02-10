/**
 * ZK Balance Range Proof — POST /api/v1/zk/balance-proof
 * Prove "address has balance >= threshold" without revealing exact balance.
 * Price: $0.03 USDC
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBalanceProof } from '@/lib/zk';
import { isValidBitcoinAddress } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, threshold, unit = 'sats' } = body;

    if (!address || !isValidBitcoinAddress(address)) {
      return NextResponse.json({ success: false, error: 'Valid Bitcoin address required', code: 'INVALID_ADDRESS' }, { status: 400 });
    }

    if (typeof threshold !== 'number' || threshold <= 0) {
      return NextResponse.json({ success: false, error: 'Positive threshold required', code: 'INVALID_THRESHOLD' }, { status: 400 });
    }

    if (unit !== 'btc' && unit !== 'sats') {
      return NextResponse.json({ success: false, error: 'Unit must be "btc" or "sats"', code: 'INVALID_UNIT' }, { status: 400 });
    }

    const result = await generateBalanceProof({ address, threshold, unit });

    return NextResponse.json({
      success: true,
      proofType: 'balance_range',
      proof: result.proof,
      publicInputs: result.publicInputs,
      verified: result.verified,
      proofTimeMs: result.proofTimeMs,
      metadata: result.metadata,
      _meta: {
        description: 'ZK proof that address balance meets or exceeds threshold. Proof does not reveal exact balance.',
        verify: '/api/v1/zk/verify',
        source: 'btcfi',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false, error: error instanceof Error ? error.message : 'Proof generation failed', code: 'ZK_ERROR',
    }, { status: 500 });
  }
}
