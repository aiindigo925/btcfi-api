/**
 * Watchlist — Redis-backed address watching
 * MP5 Phase 5
 *
 * Schema:
 *   watch:{chatId} → Set of addresses (max 5 per user)
 *   watchers:{addr} → Set of chatIds
 *   balance:{addr}  → last known balance (satoshis string)
 *   alerts:{chatId} → "on" | "off"
 */

import { getRedis } from './redis';

const MAX_WATCHES = 5;

export async function addWatch(chatId: string, address: string): Promise<{ ok: boolean; message: string }> {
  const redis = getRedis();
  const userKey = `watch:${chatId}`;
  const existing = await redis.smembers(userKey) as string[];
  if (existing.length >= MAX_WATCHES) {
    return { ok: false, message: `Max ${MAX_WATCHES} addresses. Use /unwatch to remove one first.` };
  }
  if (existing.includes(address)) {
    return { ok: false, message: 'Already watching this address.' };
  }
  await redis.sadd(userKey, address);
  await redis.sadd(`watchers:${address}`, chatId);
  return { ok: true, message: `Now watching ${address.slice(0, 12)}...` };
}

export async function removeWatch(chatId: string, address: string): Promise<{ ok: boolean; message: string }> {
  const redis = getRedis();
  await redis.srem(`watch:${chatId}`, address);
  await redis.srem(`watchers:${address}`, chatId);
  return { ok: true, message: `Stopped watching ${address.slice(0, 12)}...` };
}

export async function getWatchlist(chatId: string): Promise<string[]> {
  const redis = getRedis();
  return await redis.smembers(`watch:${chatId}`) as string[];
}

export async function getWatchers(address: string): Promise<string[]> {
  const redis = getRedis();
  return await redis.smembers(`watchers:${address}`) as string[];
}

export async function getAllWatchedAddresses(): Promise<string[]> {
  const redis = getRedis();
  // Scan for all watchers:* keys to find unique addresses
  const addresses = new Set<string>();
  let cursor = 0;
  do {
    const [next, keys] = await redis.scan(cursor, { match: 'watchers:*', count: 100 });
    cursor = Number(next);
    for (const key of keys as string[]) {
      addresses.add(key.replace('watchers:', ''));
    }
  } while (cursor !== 0);
  return Array.from(addresses);
}

export async function getStoredBalance(address: string): Promise<string | null> {
  const redis = getRedis();
  return await redis.get(`balance:${address}`) as string | null;
}

export async function setStoredBalance(address: string, satoshis: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`balance:${address}`, satoshis, { ex: 86400 }); // 24h TTL
}

export async function setAlerts(chatId: string, enabled: boolean): Promise<void> {
  const redis = getRedis();
  await redis.set(`alerts:${chatId}`, enabled ? 'on' : 'off');
}

export async function getAlerts(chatId: string): Promise<boolean> {
  const redis = getRedis();
  const val = await redis.get(`alerts:${chatId}`);
  return val !== 'off'; // Default: on
}
