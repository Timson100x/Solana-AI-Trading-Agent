/**
 * 🔥 TRICK #9: PROFIT LOCKER
 * Automatically locks in profits at +100% by selling 60%
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("ProfitLocker");

export class ProfitLocker {
  constructor(riskManager, jupiter, telegram, birdeyeProvider) {
    this.riskManager = riskManager;
    this.jupiter = jupiter;
    this.telegram = telegram;
    this.birdeyeProvider = birdeyeProvider;

    this.lockThreshold = 1.0; // +100% profit
    this.sellPercentage = 0.6; // Sell 60%
    this.portfolioThreshold = 0.1; // 10% of portfolio
    this.checkInterval = 30 * 60 * 1000; // 30 minutes
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start profit locking loop
   */
  start() {
    if (this.isRunning) {
      logger.warn("Profit locker already running");
      return;
    }

    this.isRunning = true;
    logger.success("✅ Profit locker started (30min interval)");

    // Run immediately
    this.checkAndLockProfits();

    // Then run every 30 minutes
    this.intervalId = setInterval(() => {
      this.checkAndLockProfits();
    }, this.checkInterval);
  }

  /**
   * Stop profit locking
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("Profit locker stopped");
  }

  /**
   * Check positions and lock profits
   */
  async checkAndLockProfits() {
    try {
      const positions = this.riskManager.openPositions;

      if (positions.length === 0) {
        logger.info("No open positions to check");
        return;
      }

      logger.info(
        `\ud83d\udd12 Checking ${positions.length} positions for profit locking...`
      );

      for (const position of positions) {
        await this.checkPosition(position);
      }
    } catch (error) {
      logger.error("Profit lock check failed:", error.message);
    }
  }

  /**
   * Check single position for profit locking
   */
  async checkPosition(position) {
    try {
      // Get current price
      const priceData = await this.birdeyeProvider.getTokenPrice(
        position.token
      );

      if (!priceData || !priceData.value) {
        return;
      }

      const currentPrice = priceData.value;
      const entryPrice = position.entryPrice;

      // Calculate P&L
      const priceChange = (currentPrice - entryPrice) / entryPrice;

      // Check if profit threshold reached
      if (priceChange < this.lockThreshold) {
        return; // Not profitable enough
      }

      // Calculate position value
      const currentValue = position.amount * currentPrice;
      const totalPortfolio = this.calculateTotalPortfolio();

      // Check if position is large enough (>10% portfolio)
      if (currentValue / totalPortfolio < this.portfolioThreshold) {
        return;
      }

      // Lock profits!
      const sellAmount = position.amount * this.sellPercentage;
      const pnlPercent = (priceChange * 100).toFixed(1);

      logger.success(
        `\ud83d\udd12 LOCKING PROFIT: ${position.symbol} +${pnlPercent}%`
      );

      // Execute sell
      const quote = await this.jupiter.getQuote(
        position.token,
        "So11111111111111111111111111111111111111112",
        sellAmount
      );

      if (!quote) {
        logger.error("Failed to get sell quote");
        return;
      }

      const trade = await this.jupiter.executeSwap(quote, {
        maxRetries: 3,
        priorityFee: "high",
      });

      if (trade && trade.signature) {
        // Update position
        position.amount -= sellAmount;
        position.lockedProfit = true;
        position.lockDate = new Date();

        const receivedSOL = parseFloat(quote.outAmount / 1e9);
        const profit = receivedSOL - position.investedSOL * this.sellPercentage;

        // Send notification
        await this.telegram.sendMessage(
          `\ud83d\udd12 *PROFIT LOCKED*\n\n` +
            `Token: ${position.symbol}\n` +
            `Profit: +${pnlPercent}%\n` +
            `Sold: ${(this.sellPercentage * 100).toFixed(
              0
            )}% (${sellAmount.toFixed(6)})\n` +
            `Received: ${receivedSOL.toFixed(4)} SOL\n` +
            `Profit: +${profit.toFixed(4)} SOL\n` +
            `Remaining: ${position.amount.toFixed(6)} ${position.symbol}\n` +
            `Signature: \`${trade.signature.slice(0, 16)}...\``
        );

        logger.success(
          `✅ Profit locked: +${profit.toFixed(4)} SOL from ${position.symbol}`
        );
      }
    } catch (error) {
      logger.error(
        `Failed to lock profit for ${position.symbol}:`,
        error.message
      );
    }
  }

  /**
   * Calculate total portfolio value
   */
  calculateTotalPortfolio() {
    const positions = this.riskManager.openPositions;
    const totalInvested = positions.reduce(
      (sum, pos) => sum + pos.investedSOL,
      0
    );
    return totalInvested + 1; // +1 SOL buffer
  }

  /**
   * Manual profit lock for specific position
   */
  async lockProfitManual(positionId) {
    const position = this.riskManager.openPositions.find(
      (p) => p.id === positionId
    );

    if (!position) {
      logger.error("Position not found");
      return false;
    }

    await this.checkPosition(position);
    return true;
  }
}

export default ProfitLocker;
