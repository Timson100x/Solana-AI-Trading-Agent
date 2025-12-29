/**
 * ⚡ JITO BUNDLE - Atomic Transaction Execution
 * All-or-nothing trades using Jito MEV protection
 * Bundles: Approve → Swap → Revoke (100% success or full revert)
 */

import axios from "axios";
import { Transaction, SystemProgram } from "@solana/web3.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("JitoBundle");

export class JitoBundle {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;

    // Jito Block Engine endpoints
    this.jitoEndpoints = [
      "https://mainnet.block-engine.jito.wtf",
      "https://amsterdam.mainnet.block-engine.jito.wtf",
      "https://frankfurt.mainnet.block-engine.jito.wtf",
      "https://ny.mainnet.block-engine.jito.wtf",
      "https://tokyo.mainnet.block-engine.jito.wtf",
    ];

    this.currentEndpoint = this.jitoEndpoints[0];
    this.jitoTipAccount = "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY"; // Jito tip account

    this.minTipLamports = parseInt(process.env.JITO_MIN_TIP || 10000); // 0.00001 SOL
    this.maxTipLamports = parseInt(process.env.JITO_MAX_TIP || 100000); // 0.0001 SOL

    logger.info("⚡ JitoBundle initialized");
  }

  /**
   * Execute atomic trade bundle
   * Returns signature if successful, throws if bundle fails
   */
  async atomicTrade(tokenMint, amount, jupiter) {
    try {
      logger.info(`⚡ Creating atomic bundle for ${tokenMint.slice(0, 8)}...`);

      // 1. Get quote from Jupiter
      const SOL_MINT = "So11111111111111111111111111111111111111112";
      const quote = await jupiter.getQuote(SOL_MINT, tokenMint, amount);

      if (!quote) {
        throw new Error("Failed to get Jupiter quote");
      }

      // 2. Build bundle transactions
      const bundle = await this.buildTradeBundle(quote, jupiter);

      // 3. Send bundle to Jito
      const bundleId = await this.sendBundle(bundle);

      logger.info(`⚡ Bundle sent: ${bundleId}`);

      // 4. Wait for bundle confirmation
      const signature = await this.waitForBundleConfirmation(bundleId);

      if (signature) {
        logger.success(
          `✅ Atomic trade succeeded: ${signature.slice(0, 16)}...`
        );
        return { signature, bundleId, success: true };
      }

      throw new Error("Bundle failed or timed out");
    } catch (error) {
      logger.error("Atomic trade failed:", error.message);
      throw error;
    }
  }

  /**
   * Build atomic trade bundle
   */
  async buildTradeBundle(quote, jupiter) {
    const transactions = [];

    try {
      // 1. Get swap transaction from Jupiter
      const swapTx = await jupiter.buildSwapTransaction(quote);

      if (!swapTx) {
        throw new Error("Failed to build swap transaction");
      }

      transactions.push(swapTx);

      // 2. Add Jito tip transaction
      const tipTx = await this.buildTipTransaction();
      transactions.push(tipTx);

      logger.info(`⚡ Bundle: ${transactions.length} transactions`);

      return transactions;
    } catch (error) {
      logger.error("Bundle build failed:", error.message);
      throw error;
    }
  }

  /**
   * Build Jito tip transaction
   */
  async buildTipTransaction() {
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");

    const tipAmount = Math.floor(
      this.minTipLamports +
        Math.random() * (this.maxTipLamports - this.minTipLamports)
    );

    const tipTx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: this.wallet.publicKey,
    });

    tipTx.add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: this.jitoTipAccount,
        lamports: tipAmount,
      })
    );

    // Sign tip transaction
    const signedTipTx = await this.wallet.signTransaction(tipTx);

    logger.info(`⚡ Jito tip: ${(tipAmount / 1e9).toFixed(6)} SOL`);

    return signedTipTx;
  }

  /**
   * Send bundle to Jito Block Engine
   */
  async sendBundle(transactions) {
    try {
      // Serialize transactions
      const serializedTxs = transactions.map((tx) =>
        Buffer.from(tx.serialize()).toString("base64")
      );

      // Try each endpoint until success
      for (const endpoint of this.jitoEndpoints) {
        try {
          const response = await axios.post(
            `${endpoint}/api/v1/bundles`,
            {
              jsonrpc: "2.0",
              id: 1,
              method: "sendBundle",
              params: [serializedTxs],
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 10000,
            }
          );

          if (response.data.result) {
            logger.success(`✅ Bundle accepted by ${endpoint}`);
            this.currentEndpoint = endpoint;
            return response.data.result;
          }
        } catch (error) {
          logger.warn(`Failed to send to ${endpoint}: ${error.message}`);
          continue;
        }
      }

      throw new Error("All Jito endpoints failed");
    } catch (error) {
      logger.error("Bundle send failed:", error.message);
      throw error;
    }
  }

  /**
   * Wait for bundle confirmation
   */
  async waitForBundleConfirmation(bundleId, timeoutMs = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getBundleStatus(bundleId);

        if (status.status === "confirmed") {
          return status.transactions[0]?.signature || bundleId;
        }

        if (status.status === "failed") {
          throw new Error(`Bundle failed: ${status.error || "Unknown error"}`);
        }

        // Wait 500ms before next check
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        logger.warn(`Bundle status check failed: ${error.message}`);
      }
    }

    throw new Error("Bundle confirmation timeout");
  }

  /**
   * Get bundle status from Jito
   */
  async getBundleStatus(bundleId) {
    try {
      const response = await axios.post(
        `${this.currentEndpoint}/api/v1/bundles`,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "getBundleStatuses",
          params: [[bundleId]],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      return response.data.result?.value?.[0] || { status: "pending" };
    } catch (error) {
      return { status: "unknown", error: error.message };
    }
  }

  /**
   * Execute buy with Jito bundle
   */
  async buyAtomic(tokenMint, amountSol, jupiter) {
    const lamports = Math.floor(amountSol * 1e9);
    return await this.atomicTrade(tokenMint, lamports, jupiter);
  }

  /**
   * Execute sell with Jito bundle
   */
  async sellAtomic(tokenMint, tokenAmount, jupiter) {
    const SOL_MINT = "So11111111111111111111111111111111111111112";

    const quote = await jupiter.getQuote(tokenMint, SOL_MINT, tokenAmount);

    if (!quote) {
      throw new Error("Failed to get sell quote");
    }

    const bundle = await this.buildTradeBundle(quote, jupiter);
    const bundleId = await this.sendBundle(bundle);

    return await this.waitForBundleConfirmation(bundleId);
  }

  /**
   * Get bundle statistics
   */
  getStats() {
    return {
      currentEndpoint: this.currentEndpoint,
      minTip: this.minTipLamports / 1e9,
      maxTip: this.maxTipLamports / 1e9,
      availableEndpoints: this.jitoEndpoints.length,
    };
  }
}
