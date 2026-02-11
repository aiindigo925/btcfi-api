/**
 * Whale Alert Cron — MP5 Phase 1 (Task 1.3)
 * Runs every 15 min via Vercel Cron.
 * Fetches whale txs, deduplicates via Redis, posts new ones to @BTCFi_Whales channel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWhaleTransactions } from '@/lib/intelligence';
import { getRedis } from '@/lib/redis';
import { postWhaleToChannel } from '@/lib/telegram-bot';

const CRON_SECRET = process.env.CRON_SECRET || '';
const MIN_BTC = 10; // Minimum BTC to alert
const DEDUP_TTL = 86400; // 24h TTL for seen txids

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const whales = await getWhaleTransactions(MIN_BTC);
    if (!whales.length) {
      return NextResponse.json({ success: true, posted: 0, message: 'No whales found' });
    }

    const redis = getRedis();
    let posted = 0;

    for (const whale of whales.slice(0, 10)) {
      const key = `whale:seen:${whale.txid}`;

      // Check if already posted
      const seen = await redis.get(key);
      if (seen) continue;

      // Mark as seen with 24h TTL
      await redis.set(key, '1', { ex: DEDUP_TTL });

      // Post to channel
      try {
        await postWhaleToChannel(whale);
        posted++;
      } catch (err) {
        console.error(`Failed to post whale ${whale.txid}:`, err);
      }

      // Small delay between posts to avoid Telegram rate limits
      if (posted > 0) await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({
      success: true,
      checked: whales.length,
      posted,
      threshold: `${MIN_BTC} BTC`,
    });
  } catch (err) {
    console.error('Whale cron error:', err);
    return NextResponse.json({ success: false, error: 'Whale cron failed' }, { status: 500 });
  }
}
