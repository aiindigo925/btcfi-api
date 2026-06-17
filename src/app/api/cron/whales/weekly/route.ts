/**
 * Weekly Whale Report Cron
 * Runs at 09:00 UTC every Monday via Vercel Cron.
 * Aggregates the past 7 days of whale data and posts a weekly report.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WHALE_CHANNEL_ID = process.env.WHALE_CHANNEL_ID || '';

interface WhaleDayEntry {
  txid: string;
  btc: number;
  usd: number;
  signal: string;
  ts: number;
}

/** Escape MarkdownV2 special characters */
function esc(s: string): string {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Send a MarkdownV2 message to the whale channel */
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
    console.error('[WeeklyWhale] Telegram sendMessage failed:', err);
    return false;
  }
}

/** Get YYYY-MM-DD strings for the past N days */
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/** Get ISO week key: YYYY-Www */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
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
    const days = getLastNDays(7);

    // Fetch all 7 days of data in parallel
    const dayKeys = days.map(d => `whale:day:${d}`);
    const rawData = await Promise.all(dayKeys.map(k => redis.get(k)));

    // Aggregate
    const allWhales: WhaleDayEntry[] = [];
    const dayCounts: { date: string; count: number; btc: number }[] = [];

    for (let i = 0; i < days.length; i++) {
      const raw = rawData[i];
      const dayData: WhaleDayEntry[] = Array.isArray(raw) ? raw : [];
      const dayBtc = dayData.reduce((sum, w) => sum + (w.btc || 0), 0);
      dayCounts.push({ date: days[i], count: dayData.length, btc: dayBtc });
      allWhales.push(...dayData);
    }

    if (allWhales.length === 0) {
      return NextResponse.json({
        success: true,
        weekKey: getWeekKey(new Date()),
        count: 0,
        message: 'No whale transactions in the past 7 days',
      });
    }

    const totalCount = allWhales.length;
    const totalBtc = allWhales.reduce((sum, w) => sum + (w.btc || 0), 0);
    const totalUsd = allWhales.reduce((sum, w) => sum + (w.usd || 0), 0);

    const buyCount = allWhales.filter(w => w.signal === 'buy').length;
    const sellCount = allWhales.filter(w => w.signal === 'sell').length;
    const transferCount = allWhales.filter(w => w.signal === 'transfer').length;
    const buyBtc = allWhales.filter(w => w.signal === 'buy').reduce((sum, w) => sum + (w.btc || 0), 0);
    const sellBtc = allWhales.filter(w => w.signal === 'sell').reduce((sum, w) => sum + (w.btc || 0), 0);

    // Top 5 whale transactions
    const top5 = [...allWhales].sort((a, b) => b.btc - a.btc).slice(0, 5);

    // Sentiment
    let sentiment = 'Neutral';
    if (buyBtc > sellBtc * 1.2) sentiment = 'Bullish';
    else if (sellBtc > buyBtc * 1.2) sentiment = 'Bearish';

    // Date range
    const weekEnd = days[0];
    const weekStart = days[days.length - 1];

    // Build daily breakdown string
    const dailyBreakdown = dayCounts
      .reverse()
      .map(d => `${esc(d.date)}: *${d.count}* txs \\(${esc(d.btc.toFixed(2))} BTC\\)`)
      .join('\n');

    // Build top 5 string
    const top5Str = top5
      .map((w, i) => `${i + 1}\\. *${esc(w.btc.toFixed(2))}* BTC \\($${esc(w.usd.toLocaleString('en-US', { maximumFractionDigits: 0 }))}\\) \\\\_${esc(w.signal)}\\\\_`)
      .join('\n');

    // Build MarkdownV2 message
    const msg = `📊 *Weekly Whale Report*\n`
      + `${esc(weekStart)} — ${esc(weekEnd)}\n\n`
      + `🐋 *${totalCount}* whale transactions this week\n`
      + `💰 Total volume: *${esc(totalBtc.toFixed(2))}* BTC *\\($${esc(totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }))}\\)*\n\n`
      + `🟢 Buys: *${buyCount}* \\(${esc(buyBtc.toFixed(2))} BTC\\)\n`
      + `🔴 Sells: *${sellCount}* \\(${esc(sellBtc.toFixed(2))} BTC\\)\n`
      + (transferCount > 0 ? `⚪ Transfers: *${transferCount}*\n` : '')
      + `\n📈 Weekly Sentiment: *${sentiment}*\n\n`
      + `*📅 Daily Breakdown*\n${dailyBreakdown}\n\n`
      + `*🏆 Top 5 Transactions*\n${top5Str}\n\n`
      + `_btcfi.aiindigo.com \\| @BTC\\_Fi\\_Bot_`;

    const sent = await sendMessage(msg);

    // Store weekly report in Redis (30-day TTL)
    const weekKey = `whale:week:${getWeekKey(new Date())}`;
    const weekReport = {
      weekStart,
      weekEnd,
      totalCount,
      totalBtc: parseFloat(totalBtc.toFixed(2)),
      totalUsd: parseFloat(totalUsd.toFixed(2)),
      buyCount,
      sellCount,
      transferCount,
      buyBtc: parseFloat(buyBtc.toFixed(2)),
      sellBtc: parseFloat(sellBtc.toFixed(2)),
      sentiment,
      dailyBreakdown: dayCounts,
      top5: top5.map(w => ({ txid: w.txid, btc: w.btc, usd: w.usd, signal: w.signal })),
    };
    try {
      await redis.set(weekKey, JSON.stringify(weekReport), { ex: 2592000 }); // 30 days
    } catch (err) {
      console.error('[WeeklyWhale] Failed to store weekly report:', err);
    }

    return NextResponse.json({
      success: true,
      weekKey,
      totalCount,
      totalBtc: parseFloat(totalBtc.toFixed(2)),
      totalUsd: parseFloat(totalUsd.toFixed(2)),
      buyCount,
      sellCount,
      sentiment,
      telegramSent: sent,
    });
  } catch (err) {
    console.error('[WeeklyWhale] Error:', err);
    return NextResponse.json({ success: false, error: 'Weekly whale report failed' }, { status: 500 });
  }
}
