/**
 * Professional Jupiter Service - ElizaOS V2
 * Optimized with compute budget & dynamic priority fees
 */

import {
  Connection,
  VersionedTransaction,
  PublicKey,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("JupiterV2");

export class JupiterService {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;

    // Jupiter Developer API (dev.jup.ag) - Official Endpoints
    this.apiKey = process.env.JUPITER_API_KEY || null;
    this.apiBase = "https://api.jup.ag";
    this.ultraBase = "https://api.jup.ag/ultra";

    // Multi-tier endpoint support
    this.endpoints = {
      // Ultra Swap API (Recommended - end-to-end execution)
      ultraSwap: `${this.ultraBase}/swap`,
      ultraQuote: `${this.ultraBase}/quote`,

      // Standard Swap API v6 - Try api.jup.ag first (works in most environments)
      quote: this.apiKey
        ? `${this.apiBase}/swap/v1/quote`
        : "https://quote-api.jup.ag/v6/quote",
      swap: this.apiKey
        ? `${this.apiBase}/swap/v1/swap`
        : "https://quote-api.jup.ag/v6/swap",

      // Price API v2/v3 (Source of truth)
      priceV2: `${this.apiBase}/price/v2`,
      priceV3: "https://price.jup.ag/v4/price",

      // Tokens API (CDN)
      tokens: "https://cache.jup.ag/tokens",
      tokenList: "https://token.jup.ag/all",

      // Fallbacks - add Raydium as last resort
      fallbacks: [
        "https://quote-api.jup.ag/v6",
        "https://public.jupiterapi.com/v6",
        "https://jupiter-swap-api.quiknode.pro/v6",
      ],

      // Raydium fallback
      raydiumQuote: "https://transaction-v1.raydium.io/compute/swap-base-in",
      raydiumSwap: "https://transaction-v1.raydium.io/transaction/swap-base-in",
    };

    this.WSOL = "So11111111111111111111111111111111111111112";

    // ElizaOS V2: Enhanced tracking
    this.successRate = { success: 0, failed: 0 };
    this.avgExecutionTime = 0;
    this.executionCount = 0;

    // API tier detection
    this.tier = this.apiKey
      ? this.apiKey.startsWith("ultra_")
        ? "ultra"
        : "pro"
      : "free";
    this.currentUrlIndex = 0;

    logger.success(
      `✅ Jupiter V2 initialized (dev.jup.ag | ${this.tier} tier | ElizaOS optimized)`
    );
  }

  /**
   * Get headers with API key (if available)
   */
  getHeaders() {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    return headers;
  }

  async getQuote(inputMint, outputMint, amount, options = {}) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const params = {
          inputMint,
          outputMint,
          amount: Math.floor(amount),
          slippageBps:
            options.slippageBps || parseInt(process.env.SLIPPAGE_BPS || 100),
          onlyDirectRoutes: options.onlyDirectRoutes || false,
          maxAccounts: options.maxAccounts || 64,
        };

        const response = await axios.get(`${this.endpoints.quote}`, {
          params,
          headers: this.getHeaders(),
          timeout: 10000,
        });

        if (!response.data || !response.data.outAmount) {
          throw new Error("Invalid quote response");
        }

        const quote = response.data;

        logger.info(
          `📊 Quote V2: ${(amount / 1e9).toFixed(4)} → ${(
            quote.outAmount / 1e9
          ).toFixed(4)} ` + `(${quote.routePlan?.length || 0} routes)`
        );

        return quote;
      } catch (error) {
        lastError = error;
        logger.warn(
          `Quote attempt ${attempt}/${maxRetries} failed: ${error.message}`
        );

        if (attempt < maxRetries) {
          // Try fallback URL
          const fallbackUrl =
            this.endpoints.fallbacks[attempt % this.endpoints.fallbacks.length];
          logger.warn(`⚠️ Retrying with fallback: ${fallbackUrl}`);
          this.endpoints.quote = `${fallbackUrl}/quote`;
          this.endpoints.swap = `${fallbackUrl}/swap`;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Failed to get quote after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * ElizaOS V2: Enhanced swap with dynamic priority fees
   */
  async executeSwap(quote, options = {}) {
    try {
      const startTime = Date.now();

      logger.info("🔄 Preparing V2 swap (ElizaOS optimized)...");

      // ElizaOS V2: Get dynamic priority fee
      const dynamicPriorityFee = await this.wallet.getDynamicPriorityFee();

      logger.info(
        `⚡ Dynamic priority fee: ${(dynamicPriorityFee / 1000000).toFixed(
          4
        )} SOL`
      );

      // Get serialized transaction from Jupiter
      const response = await axios.post(
        `${this.endpoints.swap}`,
        {
          quoteResponse: quote,
          userPublicKey: this.wallet.getPublicKey().toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          priorityLevelWithMaxLamports: {
            maxLamports: Math.max(dynamicPriorityFee, 10000),
            priorityLevel: options.priorityLevel || "high",
          },
        },
        {
          headers: this.getHeaders(),
          timeout: 15000,
        }
      );

      if (!response.data || !response.data.swapTransaction) {
        throw new Error("Invalid swap response");
      }

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(
        response.data.swapTransaction,
        "base64"
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction
      transaction.sign([this.wallet.getKeypair()]);

      logger.info("📤 Sending V2 transaction...");

      // ElizaOS V2: Enhanced send with retry logic
      let signature;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          signature = await this.connection.sendRawTransaction(
            transaction.serialize(),
            {
              skipPreflight: false,
              maxRetries: 2,
              preflightCommitment: "confirmed",
            }
          );
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;

          logger.warn(`Send attempt ${attempts} failed, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Wait for confirmation with timeout and enhanced status check
      let confirmation;
      try {
        confirmation = await Promise.race([
          this.connection.confirmTransaction(signature, "confirmed"),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Confirmation timeout")), 60000)
          ),
        ]);
      } catch (timeoutError) {
        logger.warn(
          `Confirmation timeout for ${signature}, checking status...`
        );

        // ✅ Manual status check on timeout
        const statusResponse = await this.connection.getSignatureStatus(
          signature
        );

        if (
          statusResponse.value?.confirmationStatus === "confirmed" ||
          statusResponse.value?.confirmationStatus === "finalized"
        ) {
          logger.success(
            `Transaction ${signature.slice(
              0,
              16
            )}... was confirmed despite timeout!`
          );
          // Continue normal flow
        } else if (statusResponse.value?.err) {
          throw new Error(
            `Transaction failed: ${JSON.stringify(statusResponse.value.err)}`
          );
        } else {
          throw new Error(
            `Transaction ${signature.slice(
              0,
              16
            )}... status unclear after timeout!`
          );
        }
      }

      if (confirmation && confirmation.value?.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      // Update stats
      const executionTime = Date.now() - startTime;
      this.successRate.success++;
      this.executionCount++;
      this.avgExecutionTime =
        (this.avgExecutionTime * (this.executionCount - 1) + executionTime) /
        this.executionCount;

      this.wallet.invalidateCache();

      logger.success(
        `✅ Swap V2 executed: ${signature.slice(0, 8)}... (${executionTime}ms)`
      );

      return {
        signature,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        executionTime,
        quote,
      };
    } catch (error) {
      this.successRate.failed++;
      logger.error("Swap V2 execution failed:", error);
      throw error;
    }
  }

  async buyToken(tokenMint, solAmount, options = {}) {
    try {
      logger.info(
        `🛒 Buying V2: ${tokenMint.slice(0, 8)}... with ${solAmount.toFixed(
          4
        )} SOL`
      );

      const lamports = Math.floor(solAmount * 1e9);

      const quote = await this.getQuote(
        this.WSOL,
        tokenMint,
        lamports,
        options
      );

      const result = await this.executeSwap(quote, options);

      logger.success(
        `✅ Bought V2: ${(result.outputAmount / 1e9).toFixed(6)} tokens`
      );

      return result;
    } catch (error) {
      logger.error("Buy V2 failed:", error);
      throw error;
    }
  }

  async sellToken(tokenMint, tokenAmount, decimals = 9, options = {}) {
    try {
      logger.info(
        `💸 Selling V2: ${(tokenAmount / Math.pow(10, decimals)).toFixed(
          6
        )} ${tokenMint.slice(0, 8)}...`
      );

      const amount = Math.floor(tokenAmount);

      const quote = await this.getQuote(tokenMint, this.WSOL, amount, options);

      const result = await this.executeSwap(quote, options);

      logger.success(
        `✅ Sold V2 for: ${(result.outputAmount / 1e9).toFixed(4)} SOL`
      );

      return result;
    } catch (error) {
      logger.error("Sell V2 failed:", error);
      throw error;
    }
  }

  async getTokenPrice(tokenMint, amount = 1e9) {
    try {
      const quote = await this.getQuote(tokenMint, this.WSOL, amount);
      return quote.outAmount / amount;
    } catch (error) {
      logger.error("Price check failed:", error);
      return 0;
    }
  }

  /**
   * 🔥 TRICK #1: DYNAMIC PRIORITY FEE HACK
   * Calculates 4x top fee for #1 confirmation priority
   */
  async calculateDynamicPriorityFee() {
    try {
      const recentFees = await this.connection.getRecentPrioritizationFees();

      if (!recentFees || recentFees.length === 0) {
        return 50000; // Default fallback
      }

      // Get top 10 fees and take the max
      const topFees = recentFees
        .slice(0, 10)
        .map((f) => f.prioritizationFee)
        .filter((f) => f > 0);

      const maxFee = Math.max(...topFees, 10000);

      // 4x multiplier for fastest confirmation
      const priorityFee = Math.floor(maxFee * 4);

      logger.info(`⚡ Dynamic priority fee: ${priorityFee} (4x top fee)`);
      return priorityFee;
    } catch (error) {
      logger.warn("Priority fee calculation failed, using default");
      return 100000; // Higher default for reliability
    }
  }

  /**
   * ElizaOS V2: Enhanced statistics
   */
  getStats() {
    const total = this.successRate.success + this.successRate.failed;
    const rate = total > 0 ? (this.successRate.success / total) * 100 : 0;

    return {
      successRate: rate.toFixed(2),
      totalSwaps: total,
      successful: this.successRate.success,
      failed: this.successRate.failed,
      avgExecutionTime: Math.round(this.avgExecutionTime),
      version: "ElizaOS V2",
    };
  }
}

export default JupiterService;
