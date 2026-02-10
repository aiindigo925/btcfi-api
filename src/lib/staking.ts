/**
 * BTCFi Staking Library — MP1 Task 9.2
 * Agent staking tiers with vesting-drip mechanics.
 *
 * Inspired by:
 *   - clawd-vesting: linear drip release of locked tokens
 *   - clawdfomo3d: last-buyer-wins game theory for bonuses
 *
 * Agents stake USDC in escrow (Base or Solana) for higher API tiers.
 * Staked funds drip as API credits over time.
 */

// ============ TIER DEFINITIONS ============

export interface StakingTier {
  name: string;
  minStakeUsdc: number;
  rateLimit: number | 'unlimited';
  features: string[];
  dripRate: string; // credits per day
  bonusEligible: boolean;
}

export const TIERS: Record<string, StakingTier> = {
  free: {
    name: 'Free',
    minStakeUsdc: 0,
    rateLimit: 100,
    features: ['core endpoints', 'rate limited'],
    dripRate: '0',
    bonusEligible: false,
  },
  staker: {
    name: 'Staker',
    minStakeUsdc: 100,
    rateLimit: 500,
    features: ['all endpoints', 'encrypted responses', 'threat analysis', '5x rate limit'],
    dripRate: '10 credits/day (~$0.10 value)',
    bonusEligible: true,
  },
  whale: {
    name: 'Whale',
    minStakeUsdc: 1000,
    rateLimit: 'unlimited',
    features: ['all endpoints', 'ZK proofs', 'priority routing', 'encrypted', 'dedicated support'],
    dripRate: '200 credits/day (~$2.00 value)',
    bonusEligible: true,
  },
};

// ============ STAKING STATUS ============

export interface StakeStatus {
  address: string;
  network: 'base' | 'solana' | 'none';
  stakedUsdc: number;
  tier: StakingTier;
  tierName: string;
  credits: {
    available: number;
    dripPerDay: number;
    nextDrip: string;
  };
  fomo: {
    eligible: boolean;
    currentPeriodEnd: string;
    lastStaker: string | null;
    bonusCredits: number;
  };
  escrow: {
    base: string;
    solana: string;
  };
}

/**
 * Determine tier from staked amount
 */
export function getTierForStake(stakedUsdc: number): StakingTier {
  if (stakedUsdc >= TIERS.whale.minStakeUsdc) return TIERS.whale;
  if (stakedUsdc >= TIERS.staker.minStakeUsdc) return TIERS.staker;
  return TIERS.free;
}

/**
 * Calculate drip credits based on stake and time
 * Vesting pattern: credits accrue linearly per day
 */
export function calculateDripCredits(
  stakedUsdc: number,
  stakeDurationDays: number
): number {
  const tier = getTierForStake(stakedUsdc);
  if (tier.name === 'Free') return 0;

  const dailyRate = tier.name === 'Whale' ? 200 : 10;
  return Math.floor(dailyRate * stakeDurationDays);
}

/**
 * Fomo3D-inspired bonus: last agent to stake in a 24h period gets bonus credits
 */
export function calculateFomoBonus(
  isLastStaker: boolean,
  stakedUsdc: number
): number {
  if (!isLastStaker) return 0;
  // Bonus: 10% of stake as credits
  return Math.floor(stakedUsdc * 0.1);
}

/**
 * Get stake status for an address.
 * Reads from on-chain escrow contracts on Base and Solana.
 * Falls back to zero stake if contracts not yet deployed or read fails.
 */
export async function getStakeStatus(address: string): Promise<StakeStatus> {
  let stakedUsdc = 0;
  let network: 'base' | 'solana' | 'none' = 'none';
  let credits = 0;
  let pendingCredits = 0;

  const baseContract = process.env.STAKING_CONTRACT_BASE;
  const solanaContract = process.env.STAKING_CONTRACT_SOLANA;

  // Try Base first (EVM address starts with 0x)
  if (baseContract && address.startsWith('0x')) {
    try {
      const { evmCall } = await import('./rpc');
      // getStakeInfo(address) selector = keccak256("getStakeInfo(address)")[:4]
      const selector = '0x7a766460'; // getStakeInfo(address)
      const paddedAddr = address.toLowerCase().replace('0x', '').padStart(64, '0');
      const result = await evmCall('base', baseContract, `${selector}${paddedAddr}`);
      // Decode: amount (uint256), tier (uint256), credits (uint256), pending (uint256), stakedAt (uint256), isFomo (bool)
      if (result && result.length > 2) {
        const hex = result.replace('0x', '');
        stakedUsdc = Number(BigInt('0x' + hex.slice(0, 64))) / 1e6;
        credits = Number(BigInt('0x' + hex.slice(128, 192)));
        pendingCredits = Number(BigInt('0x' + hex.slice(192, 256)));
        network = 'base';
      }
    } catch {
      // Contract not deployed or read failed — fall through
    }
  }

  // Try Solana if no Base stake found
  if (stakedUsdc === 0 && solanaContract && !address.startsWith('0x')) {
    try {
      const { solanaRpcCall } = await import('./rpc');
      // Read user_stake PDA account data
      // Seeds: ["user_stake", user_pubkey]
      // For now: structural read — full integration after Anchor deploy
      network = 'solana';
    } catch {
      // Contract not deployed
    }
  }
  const tier = getTierForStake(stakedUsdc);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCHours(23, 59, 59, 999);

  const nextDrip = new Date(now);
  nextDrip.setUTCDate(nextDrip.getUTCDate() + 1);
  nextDrip.setUTCHours(0, 0, 0, 0);

  return {
    address,
    network,
    stakedUsdc,
    tier,
    tierName: tier.name,
    credits: {
      available: credits + pendingCredits,
      dripPerDay: tier.name === 'Whale' ? 200 : tier.name === 'Staker' ? 10 : 0,
      nextDrip: nextDrip.toISOString(),
    },
    fomo: {
      eligible: tier.bonusEligible,
      currentPeriodEnd: periodEnd.toISOString(),
      lastStaker: null,
      bonusCredits: 0,
    },
    escrow: {
      base: process.env.STAKING_CONTRACT_BASE || '0xA6Bba2453673196ae22fb249C7eA9FA118a87150',
      solana: process.env.STAKING_CONTRACT_SOLANA || '8f2LTSW8ffDHE1UgkkUjJXpuXpvSq8gGXtWVrGX2uRqQ',
    },
  };
}

/**
 * Get tier info for display
 */
export function getTierInfo() {
  return {
    tiers: TIERS,
    howToStake: {
      step1: 'Send USDC to the escrow address for your preferred network',
      step2: 'Include your agent wallet address as memo/reference',
      step3: 'Set X-Staker header to your wallet address on API requests',
      step4: 'Credits drip daily — spend them on any endpoint',
    },
    fomoBonus: {
      description: 'Last agent to stake in each 24h period earns 10% bonus credits',
      inspired_by: 'Fomo3D game theory (via Clawd Bot)',
    },
    vestingDrip: {
      description: 'Staked funds generate API credits that drip linearly each day',
      inspired_by: 'clawd-vesting linear drip release pattern',
    },
  };
}
