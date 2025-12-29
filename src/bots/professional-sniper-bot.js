/**
 * Professional Sniper Bot - ElizaOS V2
 * Optimiert für Pump.fun Token Launches
 * Focus: Maximale Gewinne für API Upgrades
 */

import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { WalletService } from "./src/services/wallet.js";
import { JupiterService } from "./src/services/jupiter.js";
import { PumpFunService } from "./src/services/pumpfun.js";
import { JitoBundle } from "./src/services/jito-bundle.js";
import { TelegramService } from "./src/services/telegram.js";
import { Logger } from "./src/utils/logger.js";

const logger = new Logger("SniperBot");

class ProfessionalSniperBot {
  constructor(config, agent) {
    this.config = {
      // Sniper Settings
      targetLiquidity: config.targetLiquidity || 50, // $50 min
      maxLiquidity: config.maxLiquidity || 500, // $500 max (früh einsteigen)
      buyAmount: config.buyAmount || 0.05, // SOL per snipe
      takeProfit: config.takeProfitPercent || 200, // 200% = 3x
      stopLoss: config.stopLossPercent || 50, // -50% stop loss
      maxPositions: config.maxPositions || 3, // Max 3 gleichzeitig

      // Risk Management
      dailyMaxLoss: config.dailyMaxLoss || 0.2, // Max 0.2 SOL Verlust/Tag
      minHolders: config.minHolders || 10, // Min 10 holder
      bundleEnabled: config.bundleEnabled !== false, // Jito Bundles default ON

      // Speed Optimization
      skipVerification: config.skipVerification || false, // Für max Speed
      instantBuy: true,

      ...config,
    };

    this.agent = agent;
    this.connection = agent.connection;
    this.wallet = agent.wallet;
    this.jupiter = agent.jupiter;
    this.pumpfun = agent.pumpfun;
    this.telegram = agent.telegram;

    // Jito Bundle für MEV Protection
    if (this.config.bundleEnabled) {
      this.jito = new JitoBundle(this.connection, this.wallet);
    }

    // Statistics
    this.stats = {
      totalSnipes: 0,
      successful: 0,
      failed: 0,
      totalProfit: 0,
      totalLoss: 0,
      dailyLoss: 0,
      positions: new Map(),
      lastResetDate: new Date().toDateString(),
    };

    this.isRunning = false;
    this.monitoringInterval = null;
  }

  /**
   * Start Sniper Bot
   */
  async start() {
    if (this.isRunning) {
      logger.warn("⚠️ Sniper Bot already running");
      return;
    }

    logger.info("🎯 Starting Professional Sniper Bot...");
    logger.info(
      `Target: $${this.config.targetLiquidity}-${this.config.maxLiquidity} liquidity`
    );
    logger.info(`Buy Amount: ${this.config.buyAmount} SOL`);
    logger.info(
      `Take Profit: ${this.config.takeProfit}% | Stop Loss: ${this.config.stopLoss}%`
    );
    logger.info(
      `Jito Bundles: ${
        this.config.bundleEnabled ? "✅ Enabled" : "❌ Disabled"
      }`
    );

    this.isRunning = true;

    // Start monitoring new tokens
    await this.monitorNewTokens();

    // Start position monitoring (take profit/stop loss)
    this.startPositionMonitoring();

    await this.telegram?.sendMessage(
      `🎯 *Sniper Bot Started*\n\n` +
        `Target: $${this.config.targetLiquidity}-${this.config.maxLiquidity}\n` +
        `Buy: ${this.config.buyAmount} SOL\n` +
        `TP: ${this.config.takeProfit}% | SL: ${this.config.stopLoss}%\n` +
        `Max Positions: ${this.config.maxPositions}\n\n` +
        `Ready to snipe! 🔫`
    );
  }

  /**
   * Monitor new Pump.fun tokens
   */
  async monitorNewTokens() {
    logger.info("👀 Monitoring Pump.fun for new launches...");

    while (this.isRunning) {
      try {
        // Get recent Pump.fun tokens
        const newTokens = await this.pumpfun.getRecentTokens(20);

        for (const token of newTokens) {
          // Skip if already sniped
          if (this.stats.positions.has(token.mint)) continue;

          // Quick filter
          if (this.shouldSnipe(token)) {
            await this.executeSnipe(token);
          }
        }

        // Check every 3 seconds (aggressive)
        await this.sleep(3000);
      } catch (error) {
        logger.error("❌ Monitoring error:", error.message);
        await this.sleep(5000);
      }
    }
  }

  /**
   * Check if token should be sniped
   */
  shouldSnipe(token) {
    // Reset daily stats
    const today = new Date().toDateString();
    if (today !== this.stats.lastResetDate) {
      this.stats.dailyLoss = 0;
      this.stats.lastResetDate = today;
    }

    // Check daily loss limit
    if (this.stats.dailyLoss >= this.config.dailyMaxLoss) {
      logger.warn("⚠️ Daily loss limit reached, skipping");
      return false;
    }

    // Check max positions
    if (this.stats.positions.size >= this.config.maxPositions) {
      return false;
    }

    // Liquidity check
    const liquidity = token.liquidity || 0;
    if (
      liquidity < this.config.targetLiquidity ||
      liquidity > this.config.maxLiquidity
    ) {
      return false;
    }

    // Holder check (if not skipping verification)
    if (
      !this.config.skipVerification &&
      token.holders < this.config.minHolders
    ) {
      return false;
    }

    // Age check - prefer fresh tokens (< 5 minutes old)
    const age = Date.now() - token.createdAt;
    if (age > 300000) return false; // Skip if > 5 min old

    return true;
  }

  /**
   * Execute Snipe
   */
  async executeSnipe(token) {
    this.stats.totalSnipes++;

    logger.info(`🎯 SNIPING: ${token.symbol || token.mint.slice(0, 8)}`);
    logger.info(`Liquidity: $${token.liquidity} | Holders: ${token.holders}`);

    const startTime = Date.now();

    try {
      let signature;

      // Use Jito Bundle for MEV protection
      if (this.config.bundleEnabled && this.jito) {
        logger.info("⚡ Using Jito Bundle for MEV protection...");
        signature = await this.snipeWithJito(token);
      } else {
        // Standard Jupiter swap
        signature = await this.snipeWithJupiter(token);
      }

      const executionTime = Date.now() - startTime;

      // Track position
      this.stats.positions.set(token.mint, {
        token: token.symbol || token.mint.slice(0, 8),
        mint: token.mint,
        buyPrice: token.price || 0,
        buyTime: Date.now(),
        amount: this.config.buyAmount,
        signature,
        liquidity: token.liquidity,
      });

      this.stats.successful++;

      logger.success(
        `✅ SNIPED in ${executionTime}ms: ${signature.slice(0, 8)}...`
      );

      await this.telegram?.sendMessage(
        `🎯 *SNIPE SUCCESSFUL!*\n\n` +
          `Token: ${token.symbol || token.mint.slice(0, 8)}\n` +
          `Liquidity: $${token.liquidity}\n` +
          `Amount: ${this.config.buyAmount} SOL\n` +
          `Time: ${executionTime}ms\n` +
          `Signature: \`${signature.slice(0, 16)}...\`\n\n` +
          `Monitoring for ${this.config.takeProfit}% profit... 💰`
      );
    } catch (error) {
      this.stats.failed++;
      logger.error(`❌ Snipe failed:`, error.message);

      await this.telegram?.sendMessage(
        `❌ Snipe failed: ${token.symbol || token.mint.slice(0, 8)}\n` +
          `Error: ${error.message}`
      );
    }
  }

  /**
   * Snipe with Jito Bundle (MEV Protected)
   */
  async snipeWithJito(token) {
    // Create buy transaction
    const quote = await this.jupiter.getQuote(
      "So11111111111111111111111111111111111111112", // SOL
      token.mint,
      this.config.buyAmount * 1e9
    );

    const swapTx = await this.jupiter.createSwapTransaction(quote);

    // Submit as Jito bundle
    const bundleResult = await this.jito.sendBundle([swapTx]);

    return bundleResult.signatures[0];
  }

  /**
   * Snipe with Jupiter (Standard)
   */
  async snipeWithJupiter(token) {
    const result = await this.jupiter.buyToken(
      token.mint,
      this.config.buyAmount,
      {
        slippageBps: 1000, // 10% slippage für snipes
        priorityLevel: "veryHigh",
      }
    );

    return result.signature;
  }

  /**
   * Monitor positions for take profit / stop loss
   */
  startPositionMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      for (const [mint, position] of this.stats.positions.entries()) {
        try {
          await this.checkPosition(mint, position);
        } catch (error) {
          logger.error(
            `Position check error for ${position.token}:`,
            error.message
          );
        }
      }
    }, 10000); // Check every 10s
  }

  /**
   * Check position for exit conditions
   */
  async checkPosition(mint, position) {
    // Get current price
    const quote = await this.jupiter.getQuote(
      mint,
      "So11111111111111111111111111111111111111112",
      position.amount * 1e9
    );

    const currentValue = quote.outAmount / 1e9;
    const profitPercent =
      ((currentValue - position.amount) / position.amount) * 100;

    // Take Profit
    if (profitPercent >= this.config.takeProfit) {
      logger.success(
        `💰 TAKE PROFIT: ${position.token} at +${profitPercent.toFixed(2)}%`
      );
      await this.exitPosition(mint, position, "TAKE_PROFIT", profitPercent);
      return;
    }

    // Stop Loss
    if (profitPercent <= -this.config.stopLoss) {
      logger.warn(
        `🛑 STOP LOSS: ${position.token} at ${profitPercent.toFixed(2)}%`
      );
      await this.exitPosition(mint, position, "STOP_LOSS", profitPercent);
      return;
    }

    // Trailing stop after 100% profit
    if (profitPercent > 100) {
      const ageMinutes = (Date.now() - position.buyTime) / 60000;
      if (ageMinutes > 15) {
        // Hold min 15 min for tax efficiency
        logger.info(
          `📈 Trailing: ${position.token} at +${profitPercent.toFixed(2)}%`
        );
        await this.exitPosition(mint, position, "TRAILING_STOP", profitPercent);
      }
    }
  }

  /**
   * Exit position
   */
  async exitPosition(mint, position, reason, profitPercent) {
    try {
      // Sell via Jupiter
      const result = await this.jupiter.sellToken(mint, position.amount, {
        slippageBps: 500,
        priorityLevel: "high",
      });

      const profit = (position.amount * profitPercent) / 100;

      // Update stats
      if (profit > 0) {
        this.stats.totalProfit += profit;
      } else {
        this.stats.totalLoss += Math.abs(profit);
        this.stats.dailyLoss += Math.abs(profit);
      }

      // Remove from positions
      this.stats.positions.delete(mint);

      logger.success(
        `✅ EXIT: ${position.token} | ${reason} | ${
          profitPercent > 0 ? "+" : ""
        }${profitPercent.toFixed(2)}% | ${
          profit > 0 ? "+" : ""
        }${profit.toFixed(4)} SOL`
      );

      await this.telegram?.sendMessage(
        `${profit > 0 ? "💰" : "🛑"} *Position Closed*\n\n` +
          `Token: ${position.token}\n` +
          `Reason: ${reason}\n` +
          `P&L: ${profitPercent > 0 ? "+" : ""}${profitPercent.toFixed(2)}%\n` +
          `Profit: ${profit > 0 ? "+" : ""}${profit.toFixed(4)} SOL\n` +
          `Signature: \`${result.signature.slice(0, 16)}...\`\n\n` +
          `Total Profit: ${this.stats.totalProfit.toFixed(4)} SOL 🚀`
      );
    } catch (error) {
      logger.error(`Exit failed for ${position.token}:`, error.message);
    }
  }

  /**
   * Stop Sniper Bot
   */
  async stop() {
    logger.info("🛑 Stopping Sniper Bot...");
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    await this.telegram?.sendMessage(
      `🛑 *Sniper Bot Stopped*\n\n` +
        `Total Snipes: ${this.stats.totalSnipes}\n` +
        `Successful: ${this.stats.successful}\n` +
        `Failed: ${this.stats.failed}\n` +
        `Win Rate: ${(
          (this.stats.successful / this.stats.totalSnipes) *
          100
        ).toFixed(1)}%\n\n` +
        `Total Profit: ${this.stats.totalProfit.toFixed(4)} SOL 💰\n` +
        `Total Loss: ${this.stats.totalLoss.toFixed(4)} SOL`
    );
  }

  /**
   * Get statistics
   */
  getStats() {
    const winRate =
      this.stats.totalSnipes > 0
        ? (this.stats.successful / this.stats.totalSnipes) * 100
        : 0;

    const netProfit = this.stats.totalProfit - this.stats.totalLoss;

    return {
      totalSnipes: this.stats.totalSnipes,
      successful: this.stats.successful,
      failed: this.stats.failed,
      winRate: winRate.toFixed(1) + "%",
      openPositions: this.stats.positions.size,
      totalProfit: this.stats.totalProfit.toFixed(4),
      totalLoss: this.stats.totalLoss.toFixed(4),
      netProfit: netProfit.toFixed(4),
      dailyLoss: this.stats.dailyLoss.toFixed(4),
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { ProfessionalSniperBot };
