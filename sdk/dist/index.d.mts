/**
 * BTCFi SDK — TypeScript Client (Task 15.1)
 *
 * Usage:
 *   import { BTCFi } from '@aiindigo/btcfi';
 *   const btcfi = new BTCFi();
 *   const fees = await btcfi.getFees();
 */
interface BTCFiConfig {
    baseUrl?: string;
    paymentNetwork?: 'base' | 'solana';
    paymentHeaders?: Record<string, string>;
    /** EVM private key for auto-paying x402 on Base */
    evmPrivateKey?: string;
    /** Solana private key (base58) for auto-paying x402 via NLx402 */
    svmPrivateKey?: string;
    timeout?: number;
    retries?: number;
}
interface RecommendedFees {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
    minimumFee: number;
}
interface FeeEstimate {
    satPerByte: number;
    totalSats: number;
    usd: string;
}
interface FeeResponse {
    success: boolean;
    fees: {
        recommended: RecommendedFees;
        unit: string;
    };
    estimate: {
        typicalTxSize: number;
        fastest: FeeEstimate;
        medium: FeeEstimate;
        slow: FeeEstimate;
    };
    nextBlocks: unknown[];
    price: {
        btcUsd: number;
        btcEur: number;
    };
}
interface MempoolResponse {
    success: boolean;
    mempool: {
        count: number;
        vsize: number;
        totalFee: number;
        vsizeMB: string;
        totalFeeBTC: string;
    };
    feeHistogram: [number, number][];
    recentTxs: Array<{
        txid: string;
        size: number;
        fee: number;
        feeRate: string | null;
    }>;
}
interface AddressInfo {
    success: boolean;
    address: string;
    balance: {
        confirmed: {
            sats: number;
            btc: string;
            usd: string;
        };
        pending: {
            sats: number;
            btc: string;
            usd: string;
        };
    };
    stats: {
        txCount: number;
        fundedTxos: number;
        spentTxos: number;
    };
}
interface UTXO {
    txid: string;
    vout: number;
    value: number;
    valueBtc: string;
    confirmed: boolean;
    blockHeight?: number;
}
interface Transaction {
    txid: string;
    size: number;
    weight: number;
    fee: number;
    status: {
        confirmed: boolean;
        block_height?: number;
    };
}
interface Block {
    id: string;
    height: number;
    timestamp: number;
    tx_count: number;
    size: number;
}
interface IntelligenceResponse {
    success: boolean;
    data: Record<string, unknown>;
}
interface ThreatResponse {
    success: boolean;
    data: {
        address: string;
        overallScore: number;
        threatLevel: string;
        matchedPatterns: Array<{
            pattern: {
                id: string;
                name: string;
                severity: string;
                description: string;
                score: number;
            };
            matched: boolean;
            detail: string;
        }>;
        unmatchedCount: number;
        summary: string;
        recommendations: string[];
    };
}
interface SolvReserves {
    success: boolean;
    reserves: {
        totalSolvBTC: string;
        totalSolvBTCRaw: string;
        chains: Array<{
            chain: string;
            supply: string;
            supplyRaw: string;
            contract: string;
            status: string;
            error?: string;
        }>;
        backing: {
            ratio: string;
            verified: boolean;
            verifiedBy: string;
            note: string;
        };
        tvl: {
            btc: string;
            estimatedUsd: string;
        };
        timestamp: string;
    };
}
interface SolvYield {
    success: boolean;
    yield: {
        xSolvBTC: {
            chain: string;
            contract: string;
            exchangeRate: string;
            currentAPY: string;
            source: string;
        } | null;
        yieldStrategies: Array<{
            name: string;
            allocation: string;
            description: string;
        }>;
        comparison: Array<{
            protocol: string;
            product: string;
            apy: string;
        }>;
        timestamp: string;
    };
}
interface SolvRisk {
    success: boolean;
    risk: {
        overallGrade: string;
        overallScore: number;
        factors: Array<{
            name: string;
            score: number;
            grade: string;
            detail: string;
        }>;
        recommendations: string[];
        timestamp: string;
    };
}
interface HealthResponse {
    status: string;
    uptime: number;
    version: string;
    checks: Record<string, {
        status: string;
        latencyMs?: number;
    }>;
}
declare class BTCFi {
    private baseUrl;
    private paymentNetwork;
    private paymentHeaders;
    private evmPrivateKey?;
    private svmPrivateKey?;
    private timeout;
    private retries;
    constructor(config?: BTCFiConfig);
    /** Check if auto-pay is configured */
    get canAutoPay(): boolean;
    /** Build payment header for 402 auto-retry */
    private buildPaymentHeader;
    private request;
    getFees(): Promise<FeeResponse>;
    getMempool(): Promise<MempoolResponse>;
    getAddress(addr: string): Promise<AddressInfo>;
    getUtxos(addr: string): Promise<{
        success: boolean;
        address: string;
        summary: {
            total: number;
            confirmed: number;
            pending: number;
            totalSats: number;
            totalBtc: string;
            totalUsd: string;
        };
        utxos: UTXO[];
    }>;
    getAddressTxs(addr: string): Promise<{
        success: boolean;
        transactions: Transaction[];
    }>;
    getTx(txid: string): Promise<{
        success: boolean;
        transaction: Transaction;
    }>;
    getTxStatus(txid: string): Promise<{
        success: boolean;
        status: Record<string, unknown>;
    }>;
    broadcastTx(txHex: string): Promise<{
        success: boolean;
        txid: string;
    }>;
    getBlock(id: string | number): Promise<{
        success: boolean;
        block: Block;
    }>;
    getLatestBlocks(limit?: number): Promise<{
        success: boolean;
        blocks: Block[];
    }>;
    getConsolidationAdvice(addr: string): Promise<IntelligenceResponse>;
    getFeePrediction(): Promise<IntelligenceResponse>;
    getWhaleAlerts(): Promise<IntelligenceResponse>;
    getAddressRisk(addr: string): Promise<IntelligenceResponse>;
    getNetworkHealth(): Promise<IntelligenceResponse>;
    getThreatAnalysis(addr: string): Promise<ThreatResponse>;
    getStakingStatus(addr?: string): Promise<{
        success: boolean;
        data: Record<string, unknown>;
    }>;
    getSolvReserves(): Promise<SolvReserves>;
    getSolvYield(): Promise<SolvYield>;
    getSolvLiquidity(chain?: string): Promise<{
        success: boolean;
        liquidity: {
            byChain: Array<{
                chain: string;
                solvBTCSupply: string;
                percentage: string;
                protocols: string[];
            }>;
            totalSupply: string;
            dominantChain: string;
            timestamp: string;
        };
    }>;
    getSolvRisk(): Promise<SolvRisk>;
    getHealth(): Promise<HealthResponse>;
    getApiIndex(): Promise<Record<string, unknown>>;
    generateBalanceProof(address: string, threshold: number, unit?: 'btc' | 'sats'): Promise<ZKProofResult>;
    generateAgeProof(address: string, minBlocks: number): Promise<ZKProofResult>;
    generateMembershipProof(address: string, setRoot: string, merkleProof: string[]): Promise<ZKProofResult>;
    verifyProof(proofType: string, proof: Record<string, unknown>, publicInputs: string[]): Promise<ZKVerifyResult>;
    stream(options?: {
        channel?: 'all' | 'whales';
        min?: number;
    }): EventSource;
}
interface ZKProof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
}
interface ZKProofResult {
    success: boolean;
    proofType: string;
    proof: ZKProof;
    publicInputs: string[];
    verified: boolean;
    proofTimeMs: number;
    metadata: Record<string, unknown>;
    _meta: {
        description: string;
        verify: string;
        source: string;
        timestamp: string;
    };
}
interface ZKVerifyResult {
    success: boolean;
    verified: boolean;
    proofType: string;
    checks: string[];
    _meta: {
        description: string;
        source: string;
        timestamp: string;
    };
}
declare class BTCFiError extends Error {
    statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined);
}
declare class PaymentRequiredError extends BTCFiError {
    paymentRequirements: Record<string, unknown>;
    constructor(data: Record<string, unknown>);
}

export { type AddressInfo, BTCFi, type BTCFiConfig, BTCFiError, type Block, type FeeEstimate, type FeeResponse, type HealthResponse, type IntelligenceResponse, type MempoolResponse, PaymentRequiredError, type RecommendedFees, type SolvReserves, type SolvRisk, type SolvYield, type ThreatResponse, type Transaction, type UTXO, type ZKProof, type ZKProofResult, type ZKVerifyResult, BTCFi as default };
