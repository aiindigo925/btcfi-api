/**
 * API Key Management — Developer API Key System
 *
 * Provides generate, validate, track, and revoke operations for API keys.
 * Keys are stored in Upstash Redis as hashes with usage counters.
 *
 * Redis key schema:
 *   apikey:{key_hash}     — Hash: { key, tier, label, created, expires, active }
 *   apikey:{key_hash}:usage:{date} — Hash: { endpoint: count, ... }
 *   apikey:{key_hash}:daily:{date} — String: total count for the day
 *   apikey:index          — Set of all active key hashes
 *   apikey:revoked        — Set of revoked key hashes
 */

import { getRedis } from '@/lib/redis';
import crypto from 'crypto';

// ============ TYPES ============

export type ApiKeyTier = 'free' | 'pro' | 'enterprise';

export interface ApiKeyInfo {
  key: string;          // full key with prefix (btcfi_xxx...)
  keyHash: string;      // SHA256 hash used as Redis key
  tier: ApiKeyTier;
  label: string;
  created: string;      // ISO date
  expires: string | null;
  active: boolean;
}

export interface ApiKeyUsageStats {
  keyHash: string;
  tier: ApiKeyTier;
  label: string;
  totalToday: number;
  dailyBreakdown: Record<string, number>;       // date → count
  endpointBreakdown: Record<string, number>;     // endpoint → total count
  dailyEndpointBreakdown: Record<string, Record<string, number>>; // date → {endpoint: count}
  createdAt: string;
}

export interface TierConfig {
  label: string;
  dailyLimit: number;
  monthlyPrice: number;
}

// ============ TIER CONFIGURATION ============

export const TIER_CONFIGS: Record<ApiKeyTier, TierConfig> = {
  free: {
    label: 'Free',
    dailyLimit: 100,
    monthlyPrice: 0,
  },
  pro: {
    label: 'Pro',
    dailyLimit: 1000,
    monthlyPrice: 29,
  },
  enterprise: {
    label: 'Enterprise',
    dailyLimit: Infinity,
    monthlyPrice: 299,
  },
};

// ============ KEY GENERATION ============

/**
 * Generate a random API key with prefix 'btcfi_'.
 * The key is 32 hex chars (128 bits of entropy) + prefix.
 */
export function generateApiKey(): { key: string; keyHash: string } {
  const randomHex = crypto.randomBytes(16).toString('hex');
  const key = `btcfi_${randomHex}`;
  const keyHash = hashKey(key);
  return { key, keyHash };
}

/**
 * Hash an API key for storage. Uses SHA-256 to avoid storing raw keys.
 */
export function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ============ KEY CRUD ============

/**
 * Store a new API key in Redis.
 */
export async function createApiKey(
  key: string,
  keyHash: string,
  tier: ApiKeyTier,
  label: string,
  expiresDays?: number
): Promise<ApiKeyInfo> {
  const redis = getRedis();
  const now = new Date().toISOString();
  const expires = expiresDays
    ? new Date(Date.now() + expiresDays * 86400000).toISOString()
    : null;

  const data = {
    key, // stored for admin retrieval (key hash is the Redis key)
    tier,
    label,
    created: now,
    expires: expires || '',
    active: 'true',
  };

  // Store key info as hash
  await redis.hset(`apikey:${keyHash}`, data);
  // Add to active index
  await redis.sadd('apikey:index', keyHash);

  return {
    key,
    keyHash,
    tier,
    label,
    created: now,
    expires,
    active: true,
  };
}

/**
 * Validate an API key against Redis. Returns key info if valid, null otherwise.
 */
export async function validateApiKey(
  key: string
): Promise<{ valid: boolean; info?: ApiKeyInfo; error?: string }> {
  if (!key || !key.startsWith('btcfi_')) {
    return { valid: false, error: 'Invalid key format' };
  }

  const redis = getRedis();
  const keyHash = hashKey(key);

  // Check if revoked
  const isRevoked = await redis.sismember('apikey:revoked', keyHash);
  if (isRevoked) {
    return { valid: false, error: 'Key has been revoked' };
  }

  // Fetch key info
  const info = await redis.hgetall(`apikey:${keyHash}`) as Record<string, string>;

  if (!info || !info.key) {
    return { valid: false, error: 'Key not found' };
  }

  if (info.active !== 'true') {
    return { valid: false, error: 'Key is inactive' };
  }

  // Check expiration
  if (info.expires && new Date(info.expires) < new Date()) {
    return { valid: false, error: 'Key has expired' };
  }

  return {
    valid: true,
    info: {
      key: info.key,
      keyHash,
      tier: info.tier as ApiKeyTier,
      label: info.label,
      created: info.created,
      expires: info.expires || null,
      active: true,
    },
  };
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(keyHash: string): Promise<boolean> {
  const redis = getRedis();
  await redis.hset(`apikey:${keyHash}`, { active: 'false' });
  await redis.srem('apikey:index', keyHash);
  await redis.sadd('apikey:revoked', keyHash);
  return true;
}

/**
 * List all API keys (admin use).
 */
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const redis = getRedis();
  const keyHashes = await redis.smembers('apikey:index');

  const keys: ApiKeyInfo[] = [];
  for (const hash of keyHashes) {
    const info = await redis.hgetall(`apikey:${hash}`) as Record<string, string>;
    if (info && info.key) {
      keys.push({
        key: info.key,
        keyHash: hash,
        tier: info.tier as ApiKeyTier,
        label: info.label,
        created: info.created,
        expires: info.expires || null,
        active: info.active === 'true',
      });
    }
  }

  return keys;
}

// ============ USAGE TRACKING ============

/**
 * Get today's date string (YYYY-MM-DD).
 */
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Track API usage: increment counters for today.
 * Called on every request that uses an API key.
 */
export async function trackUsage(
  keyHash: string,
  endpoint: string
): Promise<void> {
  const redis = getRedis();
  const today = getToday();

  // Normalize endpoint to first 2 segments (e.g., /api/v1/fees → /api/v1/fees)
  const normalizedEndpoint = endpoint.split('?')[0]; // strip query params

  // Increment per-endpoint counter for today
  await redis.hincrby(`apikey:${keyHash}:usage:${today}`, normalizedEndpoint, 1);

  // Increment daily total counter
  await redis.incr(`apikey:${keyHash}:daily:${today}`);

  // Set TTL on daily keys (31 days retention)
  await redis.expire(`apikey:${keyHash}:daily:${today}`, 31 * 86400);
  await redis.expire(`apikey:${keyHash}:usage:${today}`, 31 * 86400);
}

/**
 * Check if a key has remaining quota for today.
 * Returns { allowed, remaining, limit, usedToday }
 */
export async function checkQuota(
  keyHash: string,
  tier: ApiKeyTier
): Promise<{ allowed: boolean; remaining: number; limit: number | string; usedToday: number }> {
  const redis = getRedis();
  const today = getToday();
  const config = TIER_CONFIGS[tier];

  if (config.dailyLimit === Infinity) {
    return { allowed: true, remaining: Infinity, limit: 'unlimited', usedToday: 0 };
  }

  const usedToday = await redis.get<number>(`apikey:${keyHash}:daily:${today}`) || 0;
  const remaining = Math.max(0, config.dailyLimit - usedToday);

  return {
    allowed: remaining > 0,
    remaining,
    limit: config.dailyLimit,
    usedToday,
  };
}

/**
 * Get usage statistics for an API key.
 * Returns last 30 days of data.
 */
export async function getUsageStats(
  keyHash: string,
  tier: ApiKeyTier,
  label: string,
  createdAt: string
): Promise<ApiKeyUsageStats> {
  const redis = getRedis();
  const today = getToday();
  const endpointBreakdown: Record<string, number> = {};
  const dailyBreakdown: Record<string, number> = {};
  const dailyEndpointBreakdown: Record<string, Record<string, number>> = {};

  // Get last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dailyCount = await redis.get<number>(`apikey:${keyHash}:daily:${date}`);
    if (dailyCount && dailyCount > 0) {
      dailyBreakdown[date] = dailyCount;
    }

    // Get per-endpoint breakdown for this day
    const endpointData = await redis.hgetall(`apikey:${keyHash}:usage:${date}`) as Record<string, string>;
    if (endpointData) {
      dailyEndpointBreakdown[date] = {};
      for (const [ep, count] of Object.entries(endpointData)) {
        const numCount = parseInt(count, 10);
        endpointBreakdown[ep] = (endpointBreakdown[ep] || 0) + numCount;
        dailyEndpointBreakdown[date][ep] = numCount;
      }
    }
  }

  // Today's count
  const todayCount = dailyBreakdown[today] || 0;

  return {
    keyHash,
    tier,
    label,
    totalToday: todayCount,
    dailyBreakdown,
    endpointBreakdown,
    dailyEndpointBreakdown,
    createdAt,
  };
}

/**
 * Get all usage stats for all keys (admin use).
 */
export async function getAllUsageStats(): Promise<Record<string, ApiKeyUsageStats>> {
  const keys = await listApiKeys();
  const stats: Record<string, ApiKeyUsageStats> = {};

  for (const keyInfo of keys) {
    stats[keyInfo.keyHash] = await getUsageStats(
      keyInfo.keyHash,
      keyInfo.tier,
      keyInfo.label,
      keyInfo.created
    );
  }

  return stats;
}
