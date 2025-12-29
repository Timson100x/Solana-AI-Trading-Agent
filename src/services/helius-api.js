/**
 * Helius API v0 - Enhanced Solana Transaction Data
 * Official endpoints for transaction history and address monitoring
 */

import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("HeliusAPI");

export class HeliusAPIService {
  constructor() {
    this.apiKey = process.env.HELIUS_API_KEY || "";
    this.baseUrl = "https://api-mainnet.helius-rpc.com/v0";
    this.cache = new Map();
    this.cacheTTL = 2 * 60 * 1000; // 2 minutes
    this.lastRequest = 0;
    this.minDelay = 200; // 200ms between requests
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      );
    }
    this.lastRequest = Date.now();
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get transaction details
   * @param {string} signature - Transaction signature
   * @returns {Object} Enhanced transaction data
   */
  async getTransaction(signature) {
    try {
      const cacheKey = `tx_${signature}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();

      const response = await axios.get(`${this.baseUrl}/transactions/`, {
        params: { "api-key": this.apiKey },
        data: { transactions: [signature] },
        timeout: 10000,
      });

      const txData = response.data[0];
      this.setCache(cacheKey, txData);
      return txData;
    } catch (error) {
      logger.error(`Transaction fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get address transaction history (ENHANCED)
   * @param {string} address - Wallet address
   * @param {Object} options - Query options
   * @returns {Array} Transaction history
   */
  async getAddressTransactions(address, options = {}) {
    try {
      const {
        limit = 100,
        before = null,
        until = null,
        type = null, // SWAP, TRANSFER, etc.
      } = options;

      const cacheKey = `addr_txs_${address}_${limit}_${type}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();

      logger.info(`🔍 Fetching transactions for ${address.slice(0, 8)}...`);

      const params = {
        "api-key": this.apiKey,
        limit,
      };
      if (before) params.before = before;
      if (until) params.until = until;
      if (type) params.type = type;

      const response = await axios.get(
        `${this.baseUrl}/addresses/${address}/transactions/`,
        {
          params,
          timeout: 15000,
        }
      );

      const transactions = response.data || [];
      this.setCache(cacheKey, transactions);

      logger.success(`✅ Found ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      logger.error(`Address transactions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get wallet's recent swaps
   * @param {string} address - Wallet address
   * @param {number} limit - Max transactions
   * @returns {Array} Recent swap transactions
   */
  async getRecentSwaps(address, limit = 50) {
    try {
      const transactions = await this.getAddressTransactions(address, {
        limit,
        type: "SWAP",
      });

      return transactions
        .filter((tx) => tx.type === "SWAP")
        .map((tx) => ({
          signature: tx.signature,
          timestamp: tx.timestamp,
          tokenIn: tx.tokenTransfers?.find(
            (t) => t.fromUserAccount === address
          ),
          tokenOut: tx.tokenTransfers?.find((t) => t.toUserAccount === address),
          source: tx.source,
          fee: tx.fee,
        }));
    } catch (error) {
      logger.error(`Recent swaps failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze wallet trading patterns
   * @param {string} address - Wallet address
   * @returns {Object} Trading analysis
   */
  async analyzeWalletTrading(address) {
    try {
      logger.info(
        `📊 Analyzing trading patterns for ${address.slice(0, 8)}...`
      );

      const transactions = await this.getAddressTransactions(address, {
        limit: 100,
        type: "SWAP",
      });

      if (transactions.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          avgProfit: 0,
          tokens: [],
        };
      }

      // Analyze token preferences
      const tokenMap = new Map();
      let profitableTrades = 0;

      for (const tx of transactions) {
        if (!tx.tokenTransfers) continue;

        for (const transfer of tx.tokenTransfers) {
          const mint = transfer.mint;
          if (!tokenMap.has(mint)) {
            tokenMap.set(mint, {
              mint,
              symbol: transfer.tokenSymbol,
              trades: 0,
              volume: 0,
            });
          }

          const tokenData = tokenMap.get(mint);
          tokenData.trades++;
          tokenData.volume += transfer.tokenAmount || 0;
        }

        // Simple profit detection (needs enhancement)
        if (tx.events?.swap?.nativeOutput > tx.events?.swap?.nativeInput) {
          profitableTrades++;
        }
      }

      const tokens = Array.from(tokenMap.values())
        .sort((a, b) => b.trades - a.trades)
        .slice(0, 10);

      return {
        address,
        totalTrades: transactions.length,
        winRate: (profitableTrades / transactions.length) * 100,
        avgProfit: 0, // Requires detailed calculation
        tokens,
        recentActivity: transactions.slice(0, 5).map((tx) => ({
          signature: tx.signature,
          timestamp: tx.timestamp,
          type: tx.type,
        })),
      };
    } catch (error) {
      logger.error(`Wallet analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Monitor address for new transactions (WebSocket alternative)
   * @param {string} address - Address to monitor
   * @param {Function} callback - Callback for new transactions
   */
  async monitorAddress(address, callback) {
    logger.info(`👀 Monitoring ${address.slice(0, 8)}... (polling mode)`);

    let lastSignature = null;

    const poll = async () => {
      try {
        const transactions = await this.getAddressTransactions(address, {
          limit: 10,
        });

        if (transactions.length === 0) return;

        // Find new transactions
        const newTxs = [];
        for (const tx of transactions) {
          if (tx.signature === lastSignature) break;
          newTxs.push(tx);
        }

        if (newTxs.length > 0) {
          lastSignature = transactions[0].signature;
          callback(newTxs);
        }
      } catch (error) {
        logger.error(`Monitor poll error: ${error.message}`);
      }
    };

    // Poll every 30 seconds
    setInterval(poll, 30000);
    poll(); // Initial poll
  }
}
