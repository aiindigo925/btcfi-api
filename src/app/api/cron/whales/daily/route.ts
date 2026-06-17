/**
 * Daily Whale Summary Cron
 * Runs at 09:00 UTC daily via Vercel Cron.
 * Aggregates whale data stored by the 15-min whale cron and posts a daily summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WHALE_CHANNEL_ID = process.env.WHALE_CHANNEL_ID || '';

/** Escape MarkdownV2 special characters */
function esc(s: string): string {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Send a plain-text message to the whale channel */
async function sendMessage(text: string): Promise<boolean> {
  if (!WHALE_CHANNEL_ID || !TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: WHALE_CHANNEL_ID,
          text,
          parse_mode: 'MarkdownV2',
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    return res.ok;
  } catch (err) {
    console.error('[DailyWhale] Telegram sendMessage failed:', err);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'Service unavailable: CRON_SECRET not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const redis = getRedis();
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayKey = `whale:day:${today}`;

    // Fetch today's whale data
    const raw = await redis.get(dayKey);
    const dayData: Array<{ txid: string; btc: number; usd: number; signal: string; ts: number }> =
      Array.isArray(raw) ? raw : [];

    if (dayData.length === 0) {
      return NextResponse.json({
        success: true,
        date: today,
        count: 0,
        message: 'No whale transactions detected today',
      });
    }

    // Aggregate
    const count = dayData.length;
    const totalBtc = dayData.reduce((sum, w) => sum + (w.btc || 0), 0);
    const totalUsd = dayData.reduce((sum, w) => sum + (w.usd || 0), 0);

    const buyCount = dayData.filter(w => w.signal === 'buy').length;
    const sellCount = dayData.filter(w => w.signal === 'sell').length;
    const transferCount = dayData.filter(w => w.signal === 'transfer').length;
    const buyBtc = dayData.filter(w => w.signal === 'buy').reduce((sum, w) => sum + (w.btc || 0), 0);
    const sellBtc = dayData.filter(w => w.signal === 'sell').reduce((sum, w) => sum + (w.btc || 0), 0);

    // Sentiment: compare buy vs sell volume
    let sentiment = 'Neutral';
    if (buyBtc > sellBtc * 1.2) sentiment = 'Bullish';
    else if (sellBtc > buyBtc * 1.2) sentiment = 'Bearish';

    // Build MarkdownV2 message
    const msg = `📊 *Daily Whale Summary* — ${esc(today)}\n\n`
      + `🐋 *${count}* whale transaction${count !== 1 ? 's' : ''} detected\n`
      + `💰 Total volume: *${esc(totalBtc.toFixed(2))}* BTC *\\($${esc(totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }))}\\)*\n\n`
      + `🟢 Buys: *${buyCount}* \\(${esc(buyBtc.toFixed(2))} BTC\\)`
      + ` | 🔴 Sells: *${sellCount}* \\(${esc(sellBtc.toFixed(2))} BTC\\)\n`
      + (transferCount > 0 ? `⚪ Transfers: *${transferCount}*\n` : '')
      + `\n📈 Sentiment: *${sentiment}*\n\n`
      + `_btcfi.aiindigo.com \\| @BTC\\_Fi\\_Bot_`;

    const sent = await sendMessage(msg);

    // Return JSON for monitoring (Vercel logs)
    return NextResponse.json({
      success: true,
      date: today,
      count,
      totalBtc: parseFloat(totalBtc.toFixed(2)),
      totalUsd: parseFloat(totalUsd.toFixed(2)),
      buyCount,
      sellCount,
      transferCount,
      sentiment,
      telegramSent: sent,
    });
  } catch (err) {
    console.error('[DailyWhale] Error:', err);
    return NextResponse.json({ success: false, error: 'Daily whale summary failed' }, { status: 500 });
  }
}
