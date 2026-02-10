/**
 * Staking Status Endpoint — MP1 Task 9.4
 * Check stake status, tier, credits, and Fomo3D bonus eligibility.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStakeStatus, getTierInfo } from '@/lib/staking';
import { isValidEvmAddress, isValidSolanaAddress } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  // No address → return tier info
  if (!address) {
    return NextResponse.json({
      success: true,
      data: getTierInfo(),
      meta: { endpoint: 'staking-info', pricing: 'free' },
    });
  }

  // Validate address format
  if (!isValidEvmAddress(address) && !isValidSolanaAddress(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallet address. Provide EVM (0x...) or Solana address.', code: 'INVALID_ADDRESS' },
      { status: 400 }
    );
  }

  try {
    const status = await getStakeStatus(address);
    return NextResponse.json({
      success: true,
      data: status,
      meta: { endpoint: 'staking-status', pricing: 'free' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to check staking status', code: 'STAKE_CHECK_FAILED' },
      { status: 500 }
    );
  }
}
