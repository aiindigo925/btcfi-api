"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BTCFi: () => BTCFi,
  BTCFiError: () => BTCFiError,
  PaymentRequiredError: () => PaymentRequiredError,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var BTCFi = class {
  baseUrl;
  paymentNetwork;
  paymentHeaders;
  evmPrivateKey;
  svmPrivateKey;
  timeout;
  retries;
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "https://btcfi.aiindigo.com";
    this.paymentNetwork = config.paymentNetwork || "base";
    this.paymentHeaders = config.paymentHeaders || {};
    this.evmPrivateKey = config.evmPrivateKey;
    this.svmPrivateKey = config.svmPrivateKey;
    this.timeout = config.timeout || 3e4;
    this.retries = config.retries || 2;
  }
  /** Check if auto-pay is configured */
  get canAutoPay() {
    return !!(this.evmPrivateKey || this.svmPrivateKey);
  }
  /** Build payment header for 402 auto-retry */
  async buildPaymentHeader(requirements) {
    try {
      if (this.paymentNetwork === "base" && this.evmPrivateKey) {
        try {
          const x402evm = await import("@x402/evm");
          return await x402evm.createPaymentHeader(this.evmPrivateKey, requirements);
        } catch {
          return btoa(JSON.stringify({
            network: "base",
            amount: requirements.maxAmountRequired,
            payTo: requirements.payTo,
            asset: requirements.asset,
            signer: "sdk-auto",
            timestamp: Date.now()
          }));
        }
      } else if (this.paymentNetwork === "solana" && this.svmPrivateKey) {
        return btoa(JSON.stringify({
          network: "solana",
          amount: requirements.maxAmountRequired,
          payTo: requirements.payTo,
          asset: requirements.asset,
          signer: "sdk-auto",
          nonce: Date.now().toString(36) + Math.random().toString(36).slice(2),
          timestamp: Date.now()
        }));
      }
    } catch {
    }
    return null;
  }
  async request(path, options) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      "X-Payment-Network": this.paymentNetwork,
      ...this.paymentHeaders
    };
    let lastError = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          headers,
          signal: AbortSignal.timeout(this.timeout)
        });
        if (res.status === 402) {
          const payment = await res.json();
          const requirements = payment.paymentRequirements;
          if (this.canAutoPay && requirements) {
            const paymentHeader = await this.buildPaymentHeader(requirements);
            if (paymentHeader) {
              headers["X-Payment"] = paymentHeader;
              const retryRes = await fetch(url, {
                ...options,
                headers,
                signal: AbortSignal.timeout(this.timeout)
              });
              if (retryRes.ok) return await retryRes.json();
            }
          }
          throw new PaymentRequiredError(payment);
        }
        if (!res.ok) {
          throw new BTCFiError(`API error ${res.status}`, res.status);
        }
        return await res.json();
      } catch (error) {
        if (error instanceof PaymentRequiredError) throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.retries) {
          await new Promise((r) => setTimeout(r, 1e3 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error("Request failed");
  }
  // Core
  async getFees() {
    return this.request("/api/v1/fees");
  }
  async getMempool() {
    return this.request("/api/v1/mempool");
  }
  async getAddress(addr) {
    return this.request(`/api/v1/address/${addr}`);
  }
  async getUtxos(addr) {
    return this.request(`/api/v1/address/${addr}/utxos`);
  }
  async getAddressTxs(addr) {
    return this.request(`/api/v1/address/${addr}/txs`);
  }
  async getTx(txid) {
    return this.request(`/api/v1/tx/${txid}`);
  }
  async getTxStatus(txid) {
    return this.request(`/api/v1/tx/${txid}/status`);
  }
  async broadcastTx(txHex) {
    return this.request("/api/v1/tx/broadcast", {
      method: "POST",
      body: JSON.stringify({ txHex })
    });
  }
  async getBlock(id) {
    return this.request(`/api/v1/block/${id}`);
  }
  async getLatestBlocks(limit = 10) {
    return this.request(`/api/v1/block/latest?limit=${limit}`);
  }
  // Intelligence
  async getConsolidationAdvice(addr) {
    return this.request(`/api/v1/intelligence/consolidate/${addr}`);
  }
  async getFeePrediction() {
    return this.request("/api/v1/intelligence/fees");
  }
  async getWhaleAlerts() {
    return this.request("/api/v1/intelligence/whales");
  }
  async getAddressRisk(addr) {
    return this.request(`/api/v1/intelligence/risk/${addr}`);
  }
  async getNetworkHealth() {
    return this.request("/api/v1/intelligence/network");
  }
  // Security
  async getThreatAnalysis(addr) {
    return this.request(`/api/v1/security/threat/${addr}`);
  }
  // Staking
  async getStakingStatus(addr) {
    return this.request(`/api/v1/staking/status${addr ? `?address=${addr}` : ""}`);
  }
  // Solv Protocol
  async getSolvReserves() {
    return this.request("/api/v1/solv/reserves");
  }
  async getSolvYield() {
    return this.request("/api/v1/solv/yield");
  }
  async getSolvLiquidity(chain) {
    return this.request(`/api/v1/solv/liquidity${chain ? `?chain=${chain}` : ""}`);
  }
  async getSolvRisk() {
    return this.request("/api/v1/solv/risk");
  }
  // System
  async getHealth() {
    return this.request("/api/health");
  }
  async getApiIndex() {
    return this.request("/api/v1");
  }
  // ZK Proofs
  async generateBalanceProof(address, threshold, unit = "sats") {
    return this.request("/api/v1/zk/balance-proof", {
      method: "POST",
      body: JSON.stringify({ address, threshold, unit })
    });
  }
  async generateAgeProof(address, minBlocks) {
    return this.request("/api/v1/zk/age-proof", {
      method: "POST",
      body: JSON.stringify({ address, minBlocks })
    });
  }
  async generateMembershipProof(address, setRoot, merkleProof) {
    return this.request("/api/v1/zk/membership", {
      method: "POST",
      body: JSON.stringify({ address, setRoot, merkleProof })
    });
  }
  async verifyProof(proofType, proof, publicInputs) {
    return this.request("/api/v1/zk/verify", {
      method: "POST",
      body: JSON.stringify({ proofType, proof, publicInputs })
    });
  }
  // Real-Time Streams
  stream(options) {
    const channel = options?.channel || "all";
    const base = this.baseUrl;
    if (channel === "whales") {
      const min = options?.min || 100;
      return new EventSource(`${base}/api/v1/stream/whales?min=${min}`);
    }
    return new EventSource(`${base}/api/v1/stream`);
  }
};
var BTCFiError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "BTCFiError";
  }
};
var PaymentRequiredError = class extends BTCFiError {
  paymentRequirements;
  constructor(data) {
    super("Payment required (x402)");
    this.name = "PaymentRequiredError";
    this.statusCode = 402;
    this.paymentRequirements = data;
  }
};
var index_default = BTCFi;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BTCFi,
  BTCFiError,
  PaymentRequiredError
});
