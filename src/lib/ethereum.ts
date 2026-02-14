/**
 * Ethereum Data Provider — MP5 Phase 8
 * Uses ethers.js with public RPC fallback.
 */

import { ethers } from 'ethers';

const RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
const FALLBACK_RPC = 'https://rpc.ankr.com/eth';

let _provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return _provider;
}

async function withFallback<T>(fn: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  try {
    return await fn(getProvider());
  } catch {
    const fallback = new ethers.JsonRpcProvider(FALLBACK_RPC);
    return await fn(fallback);
  }
}

export async function getEthGas() {
  return withFallback(async (provider) => {
    const feeData = await provider.getFeeData();
    const block = await provider.getBlock('latest');
    const gasPrice = feeData.gasPrice ? Number(feeData.gasPrice) / 1e9 : 0;
    const maxFee = feeData.maxFeePerGas ? Number(feeData.maxFeePerGas) / 1e9 : 0;
    const maxPriority = feeData.maxPriorityFeePerGas ? Number(feeData.maxPriorityFeePerGas) / 1e9 : 0;
    const baseFee = block?.baseFeePerGas ? Number(block.baseFeePerGas) / 1e9 : 0;

    return {
      gasPrice: { gwei: gasPrice.toFixed(2) },
      baseFee: { gwei: baseFee.toFixed(2) },
      maxFeePerGas: { gwei: maxFee.toFixed(2) },
      maxPriorityFeePerGas: { gwei: maxPriority.toFixed(2) },
      blockNumber: block?.number || 0,
      timestamp: block?.timestamp || 0,
    };
  });
}

export async function getEthAddress(addr: string) {
  if (!ethers.isAddress(addr)) throw new Error('Invalid Ethereum address');
  return withFallback(async (provider) => {
    const [balance, txCount, code] = await Promise.all([
      provider.getBalance(addr),
      provider.getTransactionCount(addr),
      provider.getCode(addr),
    ]);
    const ethBalance = ethers.formatEther(balance);
    const isContract = code !== '0x';

    return {
      address: addr,
      balance: { wei: balance.toString(), eth: ethBalance },
      transactionCount: txCount,
      isContract,
    };
  });
}

export async function getEthTx(hash: string) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error('Invalid transaction hash');
  return withFallback(async (provider) => {
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(hash),
      provider.getTransactionReceipt(hash),
    ]);
    if (!tx) throw new Error('Transaction not found');

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: { wei: tx.value.toString(), eth: ethers.formatEther(tx.value) },
      gasLimit: tx.gasLimit.toString(),
      gasPrice: tx.gasPrice ? (Number(tx.gasPrice) / 1e9).toFixed(2) + ' gwei' : null,
      nonce: tx.nonce,
      blockNumber: tx.blockNumber,
      status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
      gasUsed: receipt?.gasUsed?.toString() || null,
      effectiveGasPrice: receipt?.gasPrice ? (Number(receipt.gasPrice) / 1e9).toFixed(2) + ' gwei' : null,
      confirmations: receipt ? await provider.getBlockNumber() - (receipt.blockNumber || 0) : 0,
    };
  });
}
