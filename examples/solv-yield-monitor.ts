/**
 * Solv Yield Monitor Agent — Example
 *
 * Monitors SolvBTC reserves, yield, and risk across chains.
 * Run: npx tsx examples/solv-yield-monitor.ts
 */
import BTCFi from '../sdk/src/index.js';

const btcfi = new BTCFi();

async function main() {
  console.log('📈 Solv Protocol Monitor\n');

  // Fetch all Solv data in parallel
  const [reserves, yieldData, risk, liquidity] = await Promise.allSettled([
    btcfi.getSolvReserves(),
    btcfi.getSolvYield(),
    btcfi.getSolvRisk(),
    btcfi.getSolvLiquidity(),
  ]);

  if (reserves.status === 'fulfilled' && reserves.value.success) {
    const r = (reserves.value as any).reserves;
    console.log('🏦 Reserves:');
    console.log(`  Total SolvBTC: ${r.totalSolvBTC}`);
    console.log(`  TVL: ${r.tvl.estimatedUsd}`);
    console.log(`  Backing: ${r.backing.ratio} (${r.backing.verified ? '✅ Verified' : '⚠️ Unverified'})`);
    console.log('  Chains:');
    for (const chain of r.chains) {
      console.log(`    ${chain.chain}: ${chain.supply} BTC [${chain.status}]`);
    }
  }

  if (yieldData.status === 'fulfilled' && yieldData.value.success) {
    const y = (yieldData.value as any).yield;
    console.log('\n💰 Yield:');
    if (y.xSolvBTC) {
      console.log(`  xSolvBTC APY: ${y.xSolvBTC.currentAPY}`);
      console.log(`  Exchange Rate: ${y.xSolvBTC.exchangeRate}`);
    } else {
      console.log('  xSolvBTC data unavailable');
    }
  }

  if (risk.status === 'fulfilled' && risk.value.success) {
    const rk = (risk.value as any).risk;
    console.log(`\n🛡️ Risk: Grade ${rk.overallGrade} (${rk.overallScore}/100)`);
    for (const f of rk.factors) {
      console.log(`  ${f.grade} ${f.name}: ${f.score}/100`);
    }
    if (rk.recommendations.length > 0) {
      console.log('  Recommendations:');
      for (const rec of rk.recommendations) {
        console.log(`    → ${rec}`);
      }
    }
  }
}

main().catch(console.error);
