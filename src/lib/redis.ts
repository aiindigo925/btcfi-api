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
