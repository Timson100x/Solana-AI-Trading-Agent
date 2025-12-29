/**
 * 💎 WALLET OPTIMIZER - Initial Capital Optimization
 * Converts initial SOL to optimal WSOL/SOL split for trading
 * Target: 90% WSOL (trading) + 10% SOL (fees)
 */

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("WalletOptimizer");

export class WalletOptimizer {
  constructor(jupiter, wallet, telegram) {
    this.jupiter = jupiter;
    this.wallet = wallet;
    this.telegram = telegram;

    this.targetWsolRatio = parseFloat(process.env.REINVEST_RATIO || 0.9);
    this.minSolBuffer = parseFloat(process.env.MIN_SOL_BUFFER || 0.017);

    logger.info("💎 WalletOptimizer initialized");
  }

  /**
   * Optimize initial wallet balance
   * Converts SOL → WSOL for optimal trading setup
   */
  async optimize(initialSol = null) {
    try {
      const currentSol = initialSol || (await this.wallet.getBalance());

      if (currentSol < 0.05) {
        throw new Error(
          `Insufficient balance: ${currentSol} SOL (min 0.05 SOL)`
        );
      }

      logger.info(`💎 Optimizing wallet: ${currentSol} SOL`);

      // Calculate optimal split
      const targetWsol = currentSol * this.targetWsolRatio;
      const targetSol = currentSol * (1 - this.targetWsolRatio);

      // Ensure minimum SOL buffer for fees
      const safeTargetWsol = Math.max(0, currentSol - this.minSolBuffer);

      logger.info(
        `Target: ${safeTargetWsol.toFixed(
          4
        )} WSOL + ${this.minSolBuffer.toFixed(4)} SOL`
      );

      // Convert SOL → WSOL
      const wsolAmount = Math.floor(safeTargetWsol * LAMPORTS_PER_SOL);
      const SOL_MINT = "So11111111111111111111111111111111111111112";
      const WSOL_MINT = "So11111111111111111111111111111111111111112";

      const quote = await this.jupiter.getQuote(
        SOL_MINT,
        WSOL_MINT,
        wsolAmount
      );

      if (!quote) {
        throw new Error("Failed to get WSOL conversion quote");
      }

      logger.info(`Converting ${safeTargetWsol.toFixed(4)} SOL → WSOL...`);

      const trade = await this.jupiter.executeSwap(quote, {
        maxRetries: 3,
        priorityFee: "high",
      });

      if (trade && trade.signature) {
        const receivedWsol = parseFloat(quote.outAmount / 1e9);

        logger.success(
          `✅ OPTIMIZED: ${receivedWsol.toFixed(
            4
          )} WSOL (${trade.signature.slice(0, 16)}...)`
        );

        // Verify final balance
        const finalSol = await this.wallet.getBalance();
        const finalWsol = await this.wallet.getWrappedSOLBalance();

        await this.telegram.sendMessage(
          `💎 *WALLET OPTIMIZED*\n\n` +
            `Initial: ${currentSol.toFixed(4)} SOL\n` +
            `Final:\n` +
            `└ WSOL: ${finalWsol.toFixed(4)} (${(
              (finalWsol / (finalSol + finalWsol)) *
              100
            ).toFixed(0)}%)\n` +
            `└ SOL: ${finalSol.toFixed(4)} (${(
              (finalSol / (finalSol + finalWsol)) *
              100
            ).toFixed(0)}%)\n\n` +
            `💰 Trading Pool: ${finalWsol.toFixed(4)} WSOL\n` +
            `⚡ Fee Buffer: ${finalSol.toFixed(4)} SOL\n` +
            `Signature: \`${trade.signature.slice(0, 16)}...\``
        );

        return {
          success: true,
          wsol: finalWsol,
          sol: finalSol,
          signature: trade.signature,
        };
      }

      throw new Error("Trade execution failed");
    } catch (error) {
      logger.error("Wallet optimization failed:", error.message);

      await this.telegram.sendMessage(
        `❌ *OPTIMIZATION FAILED*\n\n` +
          `Error: ${error.message}\n\n` +
          `Please check your wallet balance and RPC connection.`
      );

      return { success: false, error: error.message };
    }
  }

  /**
   * Check if wallet needs optimization
   */
  async needsOptimization() {
    const sol = await this.wallet.getBalance();
    const wsol = await this.wallet.getWrappedSOLBalance();
    const total = sol + wsol;

    if (total < 0.05) {
      return { needed: false, reason: "Insufficient balance" };
    }

    const currentWsolRatio = wsol / total;
    const deviation = Math.abs(currentWsolRatio - this.targetWsolRatio);

    // Needs rebalance if deviation > 5%
    if (deviation > 0.05) {
      return {
        needed: true,
        reason: "Balance deviation",
        current: currentWsolRatio,
        target: this.targetWsolRatio,
      };
    }

    return { needed: false, reason: "Balance optimal" };
  }

  /**
   * Rebalance wallet to optimal ratio
   */
  async rebalance() {
    try {
      const check = await this.needsOptimization();

      if (!check.needed) {
        logger.info(`Balance optimal: ${check.reason}`);
        return { success: true, reason: "No rebalance needed" };
      }

      logger.info(`Rebalancing wallet: ${check.reason}`);

      const sol = await this.wallet.getBalance();
      const wsol = await this.wallet.getWrappedSOLBalance();
      const total = sol + wsol;

      const targetWsol = total * this.targetWsolRatio;
      const targetSol = total * (1 - this.targetWsolRatio);

      const wsolDiff = targetWsol - wsol;

      if (Math.abs(wsolDiff) < 0.01) {
        return { success: true, reason: "Difference too small" };
      }

      // If we need more WSOL, convert SOL → WSOL
      if (wsolDiff > 0 && sol > this.minSolBuffer) {
        const convertAmount = Math.min(wsolDiff, sol - this.minSolBuffer);
        await this.optimize(convertAmount);
      }

      return { success: true, rebalanced: true };
    } catch (error) {
      logger.error("Rebalance failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current wallet distribution
   */
  async getDistribution() {
    const sol = await this.wallet.getBalance();
    const wsol = await this.wallet.getWrappedSOLBalance();
    const total = sol + wsol;

    return {
      sol: {
        amount: sol,
        percent: total > 0 ? (sol / total) * 100 : 0,
      },
      wsol: {
        amount: wsol,
        percent: total > 0 ? (wsol / total) * 100 : 0,
      },
      total,
      optimal: {
        wsol: total * this.targetWsolRatio,
        sol: total * (1 - this.targetWsolRatio),
      },
    };
  }

  /**
   * Ensure optimal balance before trading
   */
  async ensureOptimalBalance() {
    const check = await this.needsOptimization();

    if (check.needed) {
      logger.warn("⚠️ Balance not optimal, rebalancing...");
      await this.rebalance();
    }
  }
}
