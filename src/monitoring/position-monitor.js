/**
 * Position Monitor - Real-time P&L tracking and auto-close
 * Monitors open positions every 30 seconds
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("PositionMonitor");

export class PositionMonitor {
  constructor(riskManager, birdeyeProvider, jupiter, telegram) {
    this.riskManager = riskManager;
    this.birdeyeProvider = birdeyeProvider;
    this.jupiter = jupiter;
    this.telegram = telegram;

    this.monitoringInterval = null;
    this.isRunning = false;
    this.checkIntervalMs = 30000; // 30 seconds
  }

  start() {
    if (this.isRunning) {
      logger.warn("Monitor already running");
      return;
    }

    this.isRunning = true;
    logger.success(
      `✅ Position monitor started (${this.checkIntervalMs / 1000}s interval)`
    );

    this.monitoringInterval = setInterval(async () => {
      await this.checkPositions();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    logger.info("Position monitor stopped");
  }

  async checkPositions() {
    try {
      const positions = this.riskManager.openPositions;

      if (positions.length === 0) {
        return;
      }

      logger.info(`📊 Checking ${positions.length} open positions...`);

      for (const position of positions) {
        await this.checkPosition(position);
      }
    } catch (error) {
      logger.error("Position check failed:", error.message);
    }
  }

  async checkPosition(position) {
    try {
      // Get current price from Birdeye
      const priceData = await this.birdeyeProvider.getTokenPrice(
        position.token
      );

      if (!priceData || !priceData.value) {
        logger.warn(`⚠️ No price data for ${position.symbol}`);
        return;
      }

      const currentPrice = priceData.value;
      const entryPrice = position.entryPrice;

      // Calculate P&L
      const priceChange = (currentPrice - entryPrice) / entryPrice;
      const currentValue = position.amount * currentPrice;
      const pnlSOL = currentValue - position.investedSOL;
      const pnlPercent = (pnlSOL / position.investedSOL) * 100;

      // Update position
      position.currentPrice = currentPrice;
      position.pnlSOL = pnlSOL;
      position.pnlPercent = pnlPercent;
      position.lastCheck = Date.now();

      logger.info(
        `${position.symbol}: ${pnlPercent > 0 ? "+" : ""}${pnlPercent.toFixed(
          2
        )}% (${pnlSOL > 0 ? "+" : ""}${pnlSOL.toFixed(4)} SOL)`
      );

      // Check stop-loss
      if (pnlPercent <= -position.stopLoss * 100) {
        logger.warn(
          `🛑 Stop-loss triggered for ${position.symbol} (${pnlPercent.toFixed(
            2
          )}%)`
        );
        await this.closePosition(position, "stop-loss");
        return;
      }

      // Check take-profit levels
      // 🔥 PHASE 2: Enhanced TP with partial sells
      if (pnlPercent >= position.takeProfit2 * 100 && !position.tp2Hit) {
        logger.success(
          `🎯 Take-profit 2 hit for ${position.symbol} (${pnlPercent.toFixed(
            2
          )}%)`
        );
        // Sell remaining 60% at TP2
        await this.closePositionPartial(position, 0.6, "take-profit-2");
        position.tp2Hit = true;
        return;
      }

      if (pnlPercent >= position.takeProfit1 * 100 && !position.tp1Hit) {
        logger.success(
          `🎯 Take-profit 1 hit for ${position.symbol} (${pnlPercent.toFixed(
            2
          )}%)`
        );
        // Sell 40% at TP1, keep 60%
        await this.closePositionPartial(position, 0.4, "take-profit-1");
        position.tp1Hit = true;
        return;
      }

      // Trailing stop logic
      if (
        pnlPercent >= position.trailingStop * 100 &&
        !position.trailingStopActive
      ) {
        position.trailingStopActive = true;
        position.highestPnl = pnlPercent;
        logger.info(
          `📈 Trailing stop activated for ${
            position.symbol
          } at ${pnlPercent.toFixed(2)}%`
        );
      }

      if (position.trailingStopActive) {
        if (pnlPercent > position.highestPnl) {
          position.highestPnl = pnlPercent;
        }

        // Trailing stop: close if drops 30% from highest
        const dropFromHigh =
          ((position.highestPnl - pnlPercent) / position.highestPnl) * 100;

        if (dropFromHigh >= 30) {
          logger.success(
            `📉 Trailing stop triggered for ${
              position.symbol
            } (dropped ${dropFromHigh.toFixed(1)}% from peak)`
          );
          await this.closePosition(position, "trailing-stop");
          return;
        }
      }
    } catch (error) {
      logger.error(
        `Failed to check position ${position.symbol}:`,
        error.message
      );
    }
  }

  async closePosition(position, reason) {
    try {
      logger.info(`🔒 Closing position: ${position.symbol} (${reason})`);

      // Execute sell via Jupiter
      const quote = await this.jupiter.getQuote(
        position.token,
        "So11111111111111111111111111111111111111112", // SOL
        position.amount
      );

      if (!quote) {
        logger.error("❌ Failed to get sell quote");
        return false;
      }

      const trade = await this.jupiter.executeSwap(quote, {
        maxRetries: 3,
        priorityFee: "high",
      });

      if (!trade || !trade.signature) {
        logger.error("❌ Failed to execute sell");
        return false;
      }

      // Calculate final P&L
      const receivedSOL = parseFloat(quote.outAmount / 1e9);
      const finalPnL = receivedSOL - position.investedSOL;
      const finalPnLPercent = (finalPnL / position.investedSOL) * 100;

      // Remove from risk manager
      this.riskManager.removePosition(position.id);

      // Send notification
      await this.telegram.sendMessage(
        `${finalPnL > 0 ? "💰" : "📉"} *POSITION CLOSED*\n\n` +
          `Token: ${position.symbol}\n` +
          `Reason: ${reason}\n` +
          `Invested: ${position.investedSOL.toFixed(4)} SOL\n` +
          `Received: ${receivedSOL.toFixed(4)} SOL\n` +
          `P&L: ${finalPnL > 0 ? "+" : ""}${finalPnL.toFixed(4)} SOL (${
            finalPnL > 0 ? "+" : ""
          }${finalPnLPercent.toFixed(2)}%)\n` +
          `Hold Time: ${Math.floor(
            (Date.now() - position.openedAt) / 60000
          )}m\n` +
          `Signature: \`${trade.signature.slice(0, 16)}...\``
      );

      logger.success(
        `✅ Position closed: ${finalPnL > 0 ? "+" : ""}${finalPnL.toFixed(
          4
        )} SOL (${finalPnLPercent.toFixed(2)}%)`
      );

      return true;
    } catch (error) {
      logger.error(
        `Failed to close position ${position.symbol}:`,
        error.message
      );
      return false;
    }
  }

  /**
   * 🔥 PHASE 2: Partial position close for TP1/TP2
   */
  async closePositionPartial(position, sellPercent, reason) {
    try {
      const sellAmount = position.amount * sellPercent;

      logger.info(
        `🔒 Closing ${(sellPercent * 100).toFixed(0)}% of ${
          position.symbol
        } (${reason})`
      );

      // Execute sell via Jupiter
      const quote = await this.jupiter.getQuote(
        position.token,
        "So11111111111111111111111111111111111111112",
        sellAmount
      );

      if (!quote) {
        logger.error("❌ Failed to get sell quote");
        return false;
      }

      const trade = await this.jupiter.executeSwap(quote, {
        maxRetries: 3,
        priorityFee: "high",
      });

      if (!trade || !trade.signature) {
        logger.error("❌ Failed to execute partial sell");
        return false;
      }

      // Calculate P&L for this partial sell
      const receivedSOL = parseFloat(quote.outAmount / 1e9);
      const investedPortionSOL = position.investedSOL * sellPercent;
      const partialPnL = receivedSOL - investedPortionSOL;
      const partialPnLPercent = (partialPnL / investedPortionSOL) * 100;

      // Update position
      position.amount -= sellAmount;
      position.investedSOL -= investedPortionSOL;

      // Send notification
      await this.telegram.sendMessage(
        `💰 *PARTIAL SELL*\n\n` +
          `Token: ${position.symbol}\n` +
          `Reason: ${reason}\n` +
          `Sold: ${(sellPercent * 100).toFixed(0)}% (${sellAmount.toFixed(
            6
          )})\n` +
          `Received: ${receivedSOL.toFixed(4)} SOL\n` +
          `P&L: ${partialPnL > 0 ? "+" : ""}${partialPnL.toFixed(4)} SOL (${
            partialPnL > 0 ? "+" : ""
          }${partialPnLPercent.toFixed(2)}%)\n` +
          `Remaining: ${position.amount.toFixed(6)} ${position.symbol}\n` +
          `Signature: \`${trade.signature.slice(0, 16)}...\``
      );

      logger.success(
        `✅ Partial sell: ${partialPnL > 0 ? "+" : ""}${partialPnL.toFixed(
          4
        )} SOL (${partialPnLPercent.toFixed(2)}%)`
      );

      return true;
    } catch (error) {
      logger.error(
        `Failed to partial close ${position.symbol}:`,
        error.message
      );
      return false;
    }
  }

  getStats() {
    const positions = this.riskManager.openPositions;
    const totalPnL = positions.reduce((sum, pos) => sum + (pos.pnlSOL || 0), 0);

    return {
      isRunning: this.isRunning,
      openPositions: positions.length,
      totalPnL: parseFloat(totalPnL.toFixed(4)),
      positions: positions.map((p) => ({
        symbol: p.symbol,
        pnl: p.pnlPercent
          ? `${p.pnlPercent > 0 ? "+" : ""}${p.pnlPercent.toFixed(2)}%`
          : "N/A",
      })),
    };
  }
}

export default PositionMonitor;
