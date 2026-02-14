/**
 * Whale Alert Cron — MP5 Phase 1+3
 * Runs every 15 min via Vercel Cron.
 * Fetches whale txs, deduplicates via Redis, posts to @BTCFi_Whales + X.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWhaleTransactions } from '@/lib/intelligence';
import { getRedis } from '@/lib/redis';
import { postWhaleToChannel } from '@/lib/telegram-bot';
import { postWhaleToX } from '@/lib/twitter';

const CRON_SECRET = process.env.CRON_SECRET || '';
const DEFAULT_MIN_BTC = 10; // Minimum BTC to alert
const DEDUP_TTL = 86400; // 24h TTL for seen txids

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Allow ?min=N for testing, default to 10 BTC
    const { searchParams } = new URL(request.url);
    const minBtc = parseFloat(searchParams.get('min') || '') || DEFAULT_MIN_BTC;
    const whales = await getWhaleTransactions(minBtc);
    if (!whales.length) {
      return NextResponse.json({ success: true, posted: 0, tweeted: 0, message: 'No whales found' });
    }

    const redis = getRedis();
    let posted = 0;
    let tweeted = 0;

    for (const whale of whales.slice(0, 10)) {
      const key = `whale:seen:${whale.txid}`;

      // Check if already posted
      const seen = await redis.get(key);
      if (seen) continue;

      // Mark as seen with 24h TTL
      await redis.set(key, '1', { ex: DEDUP_TTL });

      // Post to Telegram channel
      try {
        await postWhaleToChannel(whale);
        posted++;
      } catch (err) {
        console.error(`Failed to post whale ${whale.txid}:`, err);
      }

      // Post to X (only ≥50 BTC, handled internally by postWhaleToX)
      try {
        const didTweet = await postWhaleToX(whale);
        if (didTweet) tweeted++;
      } catch (err) {
        console.error(`Failed to tweet whale ${whale.txid}:`, err);
      }

      // Small delay between posts to avoid rate limits
      if (posted > 0) await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({
      success: true,
      checked: whales.length,
      posted,
      tweeted,
      threshold: `${minBtc} BTC`,
    });
  } catch (err) {
    console.error('Whale cron error:', err);
    return NextResponse.json({ success: false, error: 'Whale cron failed' }, { status: 500 });
  }
}
