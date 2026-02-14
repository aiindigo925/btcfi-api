/**
 * Wallet Utilities — MP5 Phase 4
 * Signing helpers for elevated rate limit requests.
 */

import { ethers } from 'ethers';

/** Generate nonce for request signing */
export function generateNonce(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Sign a message with EVM wallet (MetaMask/Coinbase) */
export async function signWithEvm(message: string): Promise<{ signature: string; signer: string }> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No EVM wallet detected');
  }
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);
  const address = await signer.getAddress();
  return { signature, signer: address };
}

/** Sign a message with Solana wallet (Phantom) */
export async function signWithSolana(message: string): Promise<{ signature: string; signer: string }> {
  if (typeof window === 'undefined' || !(window as any).solana?.isPhantom) {
    throw new Error('No Solana wallet detected');
  }
  const phantom = (window as any).solana;
  const encoded = new TextEncoder().encode(message);
  const { signature, publicKey } = await phantom.signMessage(encoded, 'utf8');
  return {
    signature: Buffer.from(signature).toString('base64'),
    signer: publicKey.toString(),
  };
}

/** Build signing headers for authenticated requests */
export function buildSigningHeaders(signature: string, signer: string, nonce: string): Record<string, string> {
  return {
    'X-Signature': signature,
    'X-Signer': signer,
    'X-Nonce': nonce,
    'X-Timestamp': Date.now().toString(),
  };
}
