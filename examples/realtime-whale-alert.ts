/**
 * Real-Time Whale Alert Example — BTCFi SDK
 *
 * Subscribe to live whale transactions via Server-Sent Events.
 * Alerts when BTC transactions above threshold hit the mempool.
 */

import BTCFi from '@aiindigo/btcfi';

const btcfi = new BTCFi({
  paymentNetwork: 'base',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

async function main() {
  console.log('Connecting to whale alert stream (min 100 BTC)...');

  const eventSource = btcfi.stream({ channel: 'whales', min: 100 });

  eventSource.addEventListener('connected', (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    console.log(`Connected: ${data.message}`);
  });

  eventSource.addEventListener('whale_tx', (e: MessageEvent) => {
    const event = JSON.parse(e.data);
    const { txid, valueBtc, fee } = event.data;
    console.log(`🐳 WHALE: ${valueBtc} BTC | Fee: ${fee} sats | ${txid.slice(0, 16)}...`);
  });

  eventSource.addEventListener('timeout', (e: MessageEvent) => {
    console.log('Stream timeout — reconnecting...');
    eventSource.close();
    // Reconnect logic here
  });

  eventSource.onerror = () => {
    console.log('Stream error — will auto-reconnect');
  };

  // Also subscribe to all events on a separate stream
  const allEvents = btcfi.stream({ channel: 'all' });

  allEvents.addEventListener('new_block', (e: MessageEvent) => {
    const event = JSON.parse(e.data);
    console.log(`⛏️  New block: ${event.data.height}`);
  });

  allEvents.addEventListener('fee_change', (e: MessageEvent) => {
    const event = JSON.parse(e.data);
    console.log(`💰 Fee ${event.data.direction}: ${event.data.previous} → ${event.data.current} sat/vB (${event.data.changePercent}%)`);
  });

  allEvents.addEventListener('mempool_surge', (e: MessageEvent) => {
    const event = JSON.parse(e.data);
    console.log(`📈 Mempool surge: ${event.data.previous} → ${event.data.current} txs (+${event.data.changePercent}%)`);
  });

  // Keep running
  console.log('Listening for events... (Ctrl+C to stop)');
}

main().catch(console.error);
