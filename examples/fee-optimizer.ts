/**
 * Fee Optimizer Agent — Example
 *
 * Monitors Bitcoin fees and recommends optimal send times.
 * Run: npx tsx examples/fee-optimizer.ts
 */
import BTCFi from '../sdk/src/index.js';

const btcfi = new BTCFi();

async function main() {
  console.log('🔍 Fetching current fees...\n');
  const fees = await btcfi.getFees();

  if (!fees.success) {
    console.error('Failed to fetch fees');
    return;
  }

  const { recommended } = fees.fees;
  console.log('Current Fee Rates (sat/vB):');
  console.log(`  ⚡ Fastest:  ${recommended.fastestFee} sat/vB → ~$${fees.estimate.fastest.usd}`);
  console.log(`  🔄 Medium:   ${recommended.halfHourFee} sat/vB → ~$${fees.estimate.medium.usd}`);
  console.log(`  🐢 Slow:     ${recommended.hourFee} sat/vB → ~$${fees.estimate.slow.usd}`);
  console.log(`  💰 Economy:  ${recommended.economyFee} sat/vB`);

  // Check fee prediction
  console.log('\n📊 Fetching AI fee prediction...\n');
  const prediction = await btcfi.getFeePrediction();
  console.log(JSON.stringify(prediction.data, null, 2));

  // Decision logic
  const ratio = recommended.fastestFee / recommended.economyFee;
  if (ratio > 5) {
    console.log('\n⚠️  High fee premium! Consider waiting for lower fees.');
  } else if (ratio < 2) {
    console.log('\n✅ Fee spread is tight — good time to send at any priority.');
  } else {
    console.log('\n📌 Moderate fees. Economy tier is reasonable if not urgent.');
  }
}

main().catch(console.error);
