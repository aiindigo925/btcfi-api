/**
 * Admin API Keys Management — CRUD for Developer API Keys
 *
 * GET    — List all keys with usage stats
 * POST   — Create new key (assign tier, label)
 * DELETE — Revoke key (pass keyHash in body)
 *
 * Auth: X-Admin-Key header (same as other admin routes)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateApiKey,
  createApiKey,
  revokeApiKey,
  listApiKeys,
  getAllUsageStats,
  type ApiKeyTier,
} from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdminAuth(request: NextRequest): boolean {
  const adminKey = request.headers.get('X-Admin-Key')
    || (request.headers.get('Authorization') || '').replace('Bearer ', '')
    || '';
  return ADMIN_KEY !== '' && adminKey === ADMIN_KEY;
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Set ADMIN_API_KEY env var and pass as X-Admin-Key header.' },
      { status: 401 }
    );
  }

  try {
    const keys = await listApiKeys();
    const stats = await getAllUsageStats();

    // Merge key info with usage stats
    const keysWithStats = keys.map((keyInfo) => ({
      ...keyInfo,
      // Mask key in listing — show prefix + last 4 chars
      keyPreview: `${keyInfo.key.slice(0, 11)}...${keyInfo.key.slice(-4)}`,
      usage: stats[keyInfo.keyHash] || null,
    }));

    return NextResponse.json({
      success: true,
      count: keys.length,
      keys: keysWithStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { tier = 'free', label = 'API Key', expiresDays } = body as {
      tier?: ApiKeyTier;
      label?: string;
      expiresDays?: number;
    };

    // Validate tier
    if (!['free', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be: free, pro, enterprise' },
        { status: 400 }
      );
    }

    // Generate key
    const { key, keyHash } = generateApiKey();

    // Store in Redis
    const keyInfo = await createApiKey(key, keyHash, tier, label, expiresDays);

    return NextResponse.json({
      success: true,
      message: 'API key created. Store it securely — the raw key is only shown once.',
      key,  // Full key shown only on creation
      keyHash,
      tier,
      label,
      created: keyInfo.created,
      expires: keyInfo.expires,
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { keyHash } = body as { keyHash?: string };

    if (!keyHash) {
      return NextResponse.json(
        { success: false, error: 'keyHash is required' },
        { status: 400 }
      );
    }

    await revokeApiKey(keyHash);

    return NextResponse.json({
      success: true,
      message: 'API key revoked',
      keyHash,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
