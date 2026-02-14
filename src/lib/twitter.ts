/**
 * X/Twitter Posting Utility — MP5 Phase 3
 * Posts whale alerts to X. Requires X API v2 credentials.
 * Only posts if all 4 env vars are set.
 */

import { TwitterApi } from 'twitter-api-v2';

const API_KEY = process.env.X_API_KEY || '';
const API_SECRET = process.env.X_API_SECRET || '';
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || '';
const ACCESS_SECRET = process.env.X_ACCESS_SECRET || '';

let _client: TwitterApi | null = null;

function getClient(): TwitterApi | null {
  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) return null;
  if (!_client) {
    _client = new TwitterApi({
      appKey: API_KEY,
      appSecret: API_SECRET,
      accessToken: ACCESS_TOKEN,
      accessSecret: ACCESS_SECRET,
    });
  }
  return _client;
}

/** Minimum BTC for X posting (higher signal than Telegram) */
const X_MIN_BTC = 50;

export async function postWhaleToX(whale: {
  txid: string;
  totalValueBtc: string;
  totalValueUsd: string;
  fee: number;
  feeRate: string;
  signal?: 'buy' | 'sell' | 'transfer';
}): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const btcVal = parseFloat(whale.totalValueBtc) || 0;
  if (btcVal < X_MIN_BTC) return false;

  const usd = parseFloat(whale.totalValueUsd).toLocaleString();
  const sig = whale.signal || 'transfer';
  const emoji = sig === 'buy' ? '🟢 WHALE BUY' : sig === 'sell' ? '🔴 WHALE SELL' : '🐋 WHALE ALERT';

  const tweet = [
    `${emoji}: ${whale.totalValueBtc} BTC ($${usd}) just moved`,
    `⛽ Fee: ${whale.feeRate}`,
    '',
    `Free whale alerts → t.me/BTCFi_Whales`,
    `Check any address → t.me/BTC_Fi_Bot`,
    `Is your BTC safe? → btcfi.aiindigo.com/safe`,
    '',
    '#Bitcoin #BTC #WhaleAlert',
  ].join('\n');

  try {
    await client.v2.tweet(tweet);
    return true;
  } catch (err) {
    console.error('X post failed:', err);
    return false;
  }
}
