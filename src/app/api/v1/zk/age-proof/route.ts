/**
 * ZK UTXO Age Proof — POST /api/v1/zk/age-proof
 * Prove "address has UTXOs older than N blocks" without revealing which UTXOs.
 * Price: $0.03 USDC
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAgeProof } from '@/lib/zk';
import { isValidBitcoinAddress } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, minBlocks } = body;

    if (!address || !isValidBitcoinAddress(address)) {
      return NextResponse.json({ success: false, error: 'Valid Bitcoin address required', code: 'INVALID_ADDRESS' }, { status: 400 });
    }

    if (typeof minBlocks !== 'number' || minBlocks <= 0) {
      return NextResponse.json({ success: false, error: 'Positive minBlocks required', code: 'INVALID_MIN_BLOCKS' }, { status: 400 });
    }

    const result = await generateAgeProof({ address, minBlocks });

    return NextResponse.json({
      success: true,
      proofType: 'utxo_age',
      proof: result.proof,
      publicInputs: result.publicInputs,
      verified: result.verified,
      proofTimeMs: result.proofTimeMs,
      metadata: result.metadata,
      _meta: {
        description: 'ZK proof that address holds UTXOs older than the specified block threshold. Does not reveal which UTXOs qualify.',
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
