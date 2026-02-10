/**
 * ZK Set Membership Proof — POST /api/v1/zk/membership
 * Prove "address belongs to set S" without revealing which address.
 * Price: $0.03 USDC
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMembershipProof } from '@/lib/zk';
import { isValidBitcoinAddress } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, setRoot, merkleProof } = body;

    if (!address || !isValidBitcoinAddress(address)) {
      return NextResponse.json({ success: false, error: 'Valid Bitcoin address required', code: 'INVALID_ADDRESS' }, { status: 400 });
    }

    if (!setRoot || typeof setRoot !== 'string' || setRoot.length !== 64) {
      return NextResponse.json({ success: false, error: 'Valid setRoot (64 hex chars) required', code: 'INVALID_SET_ROOT' }, { status: 400 });
    }

    if (!Array.isArray(merkleProof) || merkleProof.length === 0) {
      return NextResponse.json({ success: false, error: 'Non-empty merkleProof array required', code: 'INVALID_MERKLE_PROOF' }, { status: 400 });
    }

    const result = await generateMembershipProof({ address, setRoot, merkleProof });

    return NextResponse.json({
      success: true,
      proofType: 'set_membership',
      proof: result.proof,
      publicInputs: result.publicInputs,
      verified: result.verified,
      proofTimeMs: result.proofTimeMs,
      metadata: result.metadata,
      _meta: {
        description: 'ZK proof that address belongs to a defined set. Neither the address nor set contents are revealed.',
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
