/**
 * Shared Upstash Redis client
 * Used by: whale cron (dedup), watchlist (Phase 2), revenue tracking
 */

import { Redis } from '@upstash/redis/cloudflare';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv({
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL!,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
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


