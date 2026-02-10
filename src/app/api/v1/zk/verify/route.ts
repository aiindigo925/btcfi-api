/**
 * ZK Proof Verification — POST /api/v1/zk/verify
 * Verify any BTCFi ZK proof without regeneration.
 * Agent B verifies proof created by Agent A.
 * Price: $0.01 USDC
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyProof } from '@/lib/zk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proofType, proof, publicInputs } = body;

    if (!proofType || typeof proofType !== 'string') {
      return NextResponse.json({ success: false, error: 'proofType required (balance_range, utxo_age, set_membership)', code: 'INVALID_TYPE' }, { status: 400 });
    }

    const validTypes = ['balance_range', 'utxo_age', 'set_membership'];
    if (!validTypes.includes(proofType)) {
      return NextResponse.json({ success: false, error: `Invalid proofType. Must be one of: ${validTypes.join(', ')}`, code: 'INVALID_TYPE' }, { status: 400 });
    }

    if (!proof || typeof proof !== 'object') {
      return NextResponse.json({ success: false, error: 'proof object required', code: 'INVALID_PROOF' }, { status: 400 });
    }

    if (!Array.isArray(publicInputs) || publicInputs.length === 0) {
      return NextResponse.json({ success: false, error: 'Non-empty publicInputs array required', code: 'INVALID_PUBLIC_INPUTS' }, { status: 400 });
    }

    const result = await verifyProof(proofType, proof, publicInputs);

    return NextResponse.json({
      success: true,
      verified: result.verified,
      proofType: result.proofType,
      checks: result.checks,
      _meta: {
        description: 'Standalone ZK proof verification. Does not require regeneration.',
        source: 'btcfi',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false, error: error instanceof Error ? error.message : 'Verification failed', code: 'ZK_VERIFY_ERROR',
    }, { status: 500 });
  }
}
