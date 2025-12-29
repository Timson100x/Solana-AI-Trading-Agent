/**
 * 🔄 REINVEST OPTIMIZER - 90% WSOL Strategy
 * Automatically reinvests 90% of profits into WSOL for trading
 * Keeps 10% in SOL for transaction fees
 */

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("ReinvestOptimizer");

export class ReinvestOptimizer {
  constructor(jupiter, wallet, telegram, positionManager) {
    this.jupiter = jupiter;
    this.wallet = wallet;
    this.telegram = telegram;
    this.positionManager = positionManager;

    // 90% reinvest into WSOL, 10% keep as SOL
    this.reinvestRatio = parseFloat(process.env.REINVEST_RATIO || 0.9);
    this.profitThreshold = parseFloat(
      process.env.REINVEST_PROFIT_THRESHOLD || 2.0
    ); // +200%
    this.intervalMinutes = parseInt(process.env.REINVEST_INTERVAL || 30);

    this.stats = {
      totalReinvested: 0,
      reinvestCount: 0,
      lastReinvest: null,
    };

    logger.info(
      `💰 ReinvestOptimizer initialized: ${
        this.reinvestRatio * 100
      }% WSOL reinvest`
    );
  }

  /**
   * Start automatic reinvest loop
   */
  startAuto() {
    logger.info(
      `🔄 Starting auto-reinvest (every ${this.intervalMinutes} minutes)...`
    );

    // Run immediately
    this.optimizeProfits();

    // Then every N minutes
    setInterval(async () => {
      await this.optimizeProfits();
    }, this.intervalMinutes * 60 * 1000);

    logger.success("✅ Auto-reinvest started");
  }

  /**
   * Optimize profits from winning positions
   */
  async optimizeProfits() {
    try {
      const positions = this.positionManager.positions;

      if (positions.length === 0) {
        return;
      }

      logger.info(`💰 Checking ${positions.length} positions for reinvest...`);

      // Filter positions above profit threshold
      const winners = positions.filter(
        (p) =>
          p.currentPrice &&
          (p.currentPrice - p.entryPrice) / p.entryPrice >= this.profitThreshold
      );

      if (winners.length === 0) {
        logger.info(
          `No positions above +${this.profitThreshold * 100}% profit`
        );
        return;
      }

      for (const position of winners) {
        await this.reinvestPosition(position);
      }

      // Send summary
      if (this.stats.reinvestCount > 0) {
        await this.telegram.sendMessage(
          `🔄 *REINVEST SUMMARY*\n\n` +
            `Positions: ${winners.length}\n` +
            `Total Reinvested: ${this.stats.totalReinvested.toFixed(4)} SOL\n` +
            `90% → WSOL (Trading)\n` +
            `10% → SOL (Fees)`
        );
      }
    } catch (error) {
      logger.error("Reinvest optimization failed:", error.message);
    }
  }

  /**
   * Reinvest a single position's profits
   */
  async reinvestPosition(position) {
    try {
      const pnl =
        (position.currentPrice - position.entryPrice) / position.entryPrice;
      const profitAmount = position.amount * pnl;

      logger.info(
        `🔄 Reinvesting ${position.symbol}: +${(pnl * 100).toFixed(
          1
        )}% (${profitAmount.toFixed(6)} tokens)`
      );

      // Calculate splits
      const wsolAmount = profitAmount * this.reinvestRatio; // 90%
      const solAmount = profitAmount * (1 - this.reinvestRatio); // 10%

      // WSOL Mint address
      const WSOL_MINT = "So11111111111111111111111111111111111111112";
      const SOL_MINT = "So11111111111111111111111111111111111111112"; // Same for unwrapping

      let totalReinvested = 0;

      // 1. Convert 90% to WSOL
      if (wsolAmount > 0) {
        const wsolQuote = await this.jupiter.getQuote(
          position.token,
          WSOL_MINT,
          Math.floor(wsolAmount)
        );

        if (wsolQuote) {
          const wsolTrade = await this.jupiter.executeSwap(wsolQuote, {
            maxRetries: 3,
            priorityFee: "high",
          });

          if (wsolTrade && wsolTrade.signature) {
            const receivedWSol = parseFloat(wsolQuote.outAmount / 1e9);
            totalReinvested += receivedWSol;

            logger.success(
              `✅ 90% → WSOL: ${receivedWSol.toFixed(
                4
              )} WSOL (${wsolTrade.signature.slice(0, 8)}...)`
            );
          }
        }
      }

      // 2. Convert 10% to SOL
      if (solAmount > 0) {
        const solQuote = await this.jupiter.getQuote(
          position.token,
          SOL_MINT,
          Math.floor(solAmount)
        );

        if (solQuote) {
          const solTrade = await this.jupiter.executeSwap(solQuote, {
            maxRetries: 3,
            priorityFee: "high",
          });

          if (solTrade && solTrade.signature) {
            const receivedSol = parseFloat(solQuote.outAmount / 1e9);
            totalReinvested += receivedSol;

            logger.success(
              `✅ 10% → SOL: ${receivedSol.toFixed(
                4
              )} SOL (${solTrade.signature.slice(0, 8)}...)`
            );
          }
        }
      }

      // Update position (reduce amount by reinvested tokens)
      position.amount -= profitAmount;
      position.reinvested = true;

      // Update stats
      this.stats.totalReinvested += totalReinvested;
      this.stats.reinvestCount++;
      this.stats.lastReinvest = Date.now();

      // Telegram notification
      await this.telegram.sendMessage(
        `🔄 *REINVEST COMPLETE*\n\n` +
          `Token: ${position.symbol}\n` +
          `Profit: +${(pnl * 100).toFixed(1)}%\n` +
          `Reinvested: ${totalReinvested.toFixed(4)} SOL\n` +
          `90% → WSOL (Trading Pool)\n` +
          `10% → SOL (Fee Buffer)\n` +
          `Remaining: ${position.amount.toFixed(6)} tokens`
      );
    } catch (error) {
      logger.error(`Failed to reinvest ${position.symbol}:`, error.message);
    }
  }

  /**
   * Force reinvest now (manual trigger)
   */
  async forceReinvest() {
    logger.info("🔄 Force reinvest triggered...");
    await this.optimizeProfits();
  }

  /**
   * Get reinvest statistics
   */
  getStats() {
    return {
      ...this.stats,
      reinvestRatio: this.reinvestRatio,
      profitThreshold: this.profitThreshold,
    };
  }

  /**
   * Calculate optimal WSOL/SOL balance
   */
  async calculateOptimalBalance() {
    const solBalance = await this.wallet.getBalance();
    const wsolBalance = await this.wallet.getWrappedSOLBalance();

    const total = solBalance + wsolBalance;
    const optimalWSol = total * this.reinvestRatio;
    const optimalSol = total * (1 - this.reinvestRatio);

    return {
      current: { sol: solBalance, wsol: wsolBalance },
      optimal: { sol: optimalSol, wsol: optimalWSol },
      needsRebalance: Math.abs(wsolBalance - optimalWSol) > 0.01,
    };
  }
}
