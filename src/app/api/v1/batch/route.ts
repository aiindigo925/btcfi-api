/**
 * Batch Query Endpoint — POST /api/v1/batch
 *
 * Run multiple balance lookups, risk analyses, and entity lookups
 * in parallel with a single request. Max 50 items per category.
 *
 * Pricing: $0.01 per address lookup, $0.02 per risk analysis, $0.05 per entity lookup.
 * Payment is enforced at middleware level; per-item cost is informational.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAddressInfo, getBtcPrice } from '@/lib/bitcoin';
import { getAddressRisk } from '@/lib/intelligence';
import { getEntityLabel } from '@/lib/entities';
import { isValidBitcoinAddress } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 50;

interface BatchAddressResult {
  input: string;
  result: {
    address: string;
    balance: {
      confirmed: { sats: number; btc: string; usd: string };
      pending: { sats: number; btc: string; usd: string };
    };
    stats: { txCount: number; fundedTxos: number; spentTxos: number };
  };
}

interface BatchRiskResult {
  input: string;
  result: {
    address: string;
    riskScore: number;
    riskGrade: string;
    factors: { name: string; score: number; weight: number; detail: string }[];
    patterns: string[];
    summary: string;
  };
}

interface BatchEntityResult {
  input: string;
  result: {
    address: string;
    entity: string;
    type: string;
    confidence: number;
  };
}

type BatchResult = BatchAddressResult | BatchRiskResult | BatchEntityResult;

interface BatchError {
  input: string;
  error: string;
}

export async function POST(request: NextRequest) {
  let body: { addresses?: string[]; risk?: string[]; entity?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const addresses = body.addresses ?? [];
  const risk = body.risk ?? [];
  const entity = body.entity ?? [];

  // Must have at least one non-empty array
  if (addresses.length === 0 && risk.length === 0 && entity.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'At least one of addresses, risk, or entity arrays must be non-empty',
        code: 'EMPTY_REQUEST',
      },
      { status: 400 }
    );
  }

  // Enforce max items per category
  if (addresses.length > MAX_ITEMS) {
    return NextResponse.json(
      { success: false, error: `addresses array exceeds max of ${MAX_ITEMS}`, code: 'TOO_MANY_ITEMS' },
      { status: 400 }
    );
  }
  if (risk.length > MAX_ITEMS) {
    return NextResponse.json(
      { success: false, error: `risk array exceeds max of ${MAX_ITEMS}`, code: 'TOO_MANY_ITEMS' },
      { status: 400 }
    );
  }
  if (entity.length > MAX_ITEMS) {
    return NextResponse.json(
      { success: false, error: `entity array exceeds max of ${MAX_ITEMS}`, code: 'TOO_MANY_ITEMS' },
      { status: 400 }
    );
  }

  // Validate all addresses are valid Bitcoin addresses
  const allAddresses = [...new Set([...addresses, ...risk, ...entity])];
  for (const addr of allAddresses) {
    if (typeof addr !== 'string' || addr.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: `Invalid entry: empty or non-string value`, code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    if (!isValidBitcoinAddress(addr)) {
      return NextResponse.json(
        { success: false, error: `Invalid Bitcoin address: ${addr}`, code: 'INVALID_ADDRESS' },
        { status: 400 }
      );
    }
  }

  // Process all items in parallel
  const results: BatchResult[] = [];
  const errors: BatchError[] = [];

  // Price lookup is shared across address and risk queries
  let priceData = { USD: 0, EUR: 0 };
  try {
    priceData = await getBtcPrice();
  } catch {
    // Continue with zero price — balance USD values will be 0
  }

  const settled = await Promise.allSettled([
    // Address balance lookups
    ...addresses.map(async (addr): Promise<BatchAddressResult> => {
      const info = await getAddressInfo(addr);
      const balanceSats = info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
      const pendingSats = info.mempool_stats.funded_txo_sum - info.mempool_stats.spent_txo_sum;
      return {
        input: addr,
        result: {
          address: addr,
          balance: {
            confirmed: {
              sats: balanceSats,
              btc: (balanceSats / 1e8).toFixed(8),
              usd: (balanceSats / 1e8 * priceData.USD).toFixed(2),
            },
            pending: {
              sats: pendingSats,
              btc: (pendingSats / 1e8).toFixed(8),
              usd: (pendingSats / 1e8 * priceData.USD).toFixed(2),
            },
          },
          stats: {
            txCount: info.chain_stats.tx_count,
            fundedTxos: info.chain_stats.funded_txo_count,
            spentTxos: info.chain_stats.spent_txo_count,
          },
        },
      };
    }),

    // Risk analysis lookups
    ...risk.map(async (addr): Promise<BatchRiskResult> => {
      const riskData = await getAddressRisk(addr);
      return { input: addr, result: riskData };
    }),

    // Entity lookups
    ...entity.map(async (addr): Promise<BatchEntityResult> => {
      const entityData = getEntityLabel(addr);
      return {
        input: addr,
        result: entityData ?? {
          address: addr,
          entity: 'Unknown',
          type: 'unknown',
          confidence: 0,
        },
      };
    }),
  ]);

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    // Determine the input value for this result
    let inputVal = '';
    if (i < addresses.length) {
      inputVal = addresses[i];
    } else if (i < addresses.length + risk.length) {
      inputVal = risk[i - addresses.length];
    } else {
      inputVal = entity[i - addresses.length - risk.length];
    }

    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      errors.push({
        input: inputVal,
        error: outcome.reason?.message || 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    errors,
    meta: {
      totalItems: addresses.length + risk.length + entity.length,
      successful: results.length,
      failed: errors.length,
      pricing: {
        addresses: '$0.01 each',
        risk: '$0.02 each',
        entity: '$0.05 each',
      },
    },
  });
}
