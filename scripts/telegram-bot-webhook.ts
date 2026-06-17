/**
 * BTCFi Telegram Bot — Local Webhook Server
 *
 * Runs on Mac Studio, receives Telegram updates via CF tunnel.
 * API calls go to Vercel (btcfi.aiindigo.com) — no self-referencing.
 *
 * Port: 3400
 * CF tunnel: btcfi-bot.aiindigo.com → localhost:3400
 * Start: cd ~/btcfi-api && npx tsx scripts/telegram-bot-webhook.ts
 */

import 'dotenv/config';
import { createServer } from 'http';
import { bot } from '../src/lib/telegram-bot';

const PORT = 3400;
const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || '';

const server = createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: 'BTCFi Telegram Bot', mode: 'webhook-local' }));
    return;
  }

  // Webhook endpoint
  if (req.method === 'POST' && req.url === '/webhook') {
    try {
      // Validate secret token
      if (SECRET_TOKEN) {
        const token = req.headers['x-telegram-bot-api-secret-token'] || '';
        if (token !== SECRET_TOKEN) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }
      }

      // Read body
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');

      const body = JSON.parse(raw);
      if (!body || typeof body.update_id !== 'number') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid update' }));
        return;
      }

      await bot.handleUpdate(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('[BTCFi Bot] Webhook error:', err);
      // Always 200 to prevent Telegram retries
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[BTCFi Bot] Webhook server on port ${PORT}`);
  console.log(`[BTCFi Bot] Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://btcfi-bot.aiindigo.com/webhook`);
});
