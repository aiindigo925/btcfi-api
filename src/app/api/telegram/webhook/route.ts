/**
 * Telegram Bot Webhook — Vercel Serverless
 *
 * POST /api/telegram/webhook
 *
 * Set webhook via:
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url": "https://btcfi.aiindigo.com/api/telegram/webhook"}'
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { bot } = await import('@/lib/telegram-bot');
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always 200 to prevent Telegram retries
  }
}

export async function GET() {
  return NextResponse.json({
    bot: 'BTCFi Telegram Bot',
    status: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not configured',
    commands: ['/price', '/fees', '/mempool', '/address', '/tx', '/whale', '/risk', '/network'],
  });
}
