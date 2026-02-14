/**
 * Whale Watcher Agent — Example
 *
 * Monitors large Bitcoin transactions and alerts on whale movements.
 * Run: npx tsx examples/whale-watcher.ts
 */
import BTCFi from '@aiindigo/btcfi';

const btcfi = new BTCFi();

async function main() {
  console.log('🐋 Whale Watcher — Monitoring large Bitcoin transactions\n');

  // Get whale alerts
  const whales = await btcfi.getWhaleAlerts();
  if (!whales.success) {
    console.error('Failed to fetch whale data');
    return;
  }
  console.log('Recent Whale Activity:');
  console.log(JSON.stringify(whales.data, null, 2));

  // Cross-reference with network health
  console.log('\n📊 Network Context:');
  const health = await btcfi.getNetworkHealth();
  console.log(JSON.stringify(health.data, null, 2));

  // Check mempool for context
  const mempool = await btcfi.getMempool();
  if (mempool.success) {
    console.log(`\nMempool: ${(mempool.mempool as any).count?.toLocaleString()} txs`);
  }
}

main().catch(console.error);
