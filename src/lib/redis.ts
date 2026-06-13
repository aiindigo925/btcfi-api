/**
 * Shared Upstash Redis client
 * Used by: whale cron (dedup), watchlist (Phase 2), revenue tracking
 */

import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

export async function safeGet(key: string): Promise<string | null> {
  try {
    return await getRedis().get(key);
  } catch {
    return null;
  }
}

export async function safeSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  try {
    const redis = getRedis();
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds } as any);
    } else {
      await redis.set(key, value);
    }
  } catch {}
}


