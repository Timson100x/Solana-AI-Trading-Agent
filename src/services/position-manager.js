/**
 * Position Manager - Trading execution & risk management
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("PositionManager");

export class PositionManager {
  constructor(wallet, jupiter, telegram, gemini) {
    this.wallet = wallet;
    this.jupiter = jupiter;
    this.telegram = telegram;
    this.gemini = gemini;

    this.positions = [];
    this.dailyTrades = 0;
    this.dailyPnL = 0;

    this.totalCapital = parseFloat(process.env.TOTAL_CAPITAL_SOL || 0.17);
    this.maxPositionPercent = parseFloat(
      process.env.MAX_POSITION_PERCENT || 50
    );
    this.minPositionSize = parseFloat(
      process.env.MIN_POSITION_SIZE_SOL || 0.01
    );

    this.stopLossPercent = parseFloat(
      process.env.STOP_LOSS_PERCENT || process.env.STOP_LOSS_PERCENTAGE || 15
    );
    this.takeProfitPercent = parseFloat(
      process.env.TAKE_PROFIT_PERCENT ||
        process.env.TAKE_PROFIT_PERCENTAGE ||
        30
    );
    this.maxDailyTrades = parseInt(process.env.MAX_DAILY_TRADES || 10);

    this.setupDayTradingClose();
    this.setupDailyReset();

    logger.success("✅ Position Manager initialized");
  }

  setupDayTradingClose() {
    const closeTime = process.env.CLOSE_ALL_POSITIONS_AT || "23:30";
    const [hours, minutes] = closeTime.split(":").map(Number);

    setInterval(() => {
      const now = new Date();
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        this.closeAllPositions("Day trading EOD close");
      }
    }, 60000);

    logger.info(`📅 Auto-close configured: ${closeTime}`);
  }

  setupDailyReset() {
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyStats();
      }
    }, 60000);
  }

  calculatePositionSize(confidence) {
    try {
      const maxPosition = (this.totalCapital * this.maxPositionPercent) / 100;

      // Scale with confidence: 75% conf = 50% size, 100% conf = 100% size
      const confidenceMultiplier = Math.max(0, (confidence - 50) / 50);
      const positionSize = maxPosition * confidenceMultiplier;

      const finalSize = Math.max(
        this.minPositionSize,
        Math.min(positionSize, maxPosition)
      );

      logger.info(
        `📊 Position: ${finalSize.toFixed(4)} SOL (${confidence}% confidence)`
      );

      return finalSize;
    } catch (error) {
      logger.error("Position sizing failed:", error);
      return this.minPositionSize;
    }
  }

  async openPosition(signal) {
    try {
      // Check trading enabled
      if (process.env.TRADING_ENABLED !== "true") {
        logger.info("📝 Paper trading - signal logged only");
        return null;
      }

      // Check daily limit
      if (this.dailyTrades >= this.maxDailyTrades) {
        logger.warn(`⚠️  Daily limit reached (${this.maxDailyTrades})`);
        return null;
      }

      // Calculate size
      const positionSize = this.calculatePositionSize(signal.confidence);

      // Check balance
      const balance = await this.wallet.getWrappedSOLBalance();
      if (balance < positionSize) {
        logger.warn(
          `⚠️  Insufficient balance: ${balance.toFixed(
            4
          )} < ${positionSize.toFixed(4)}`
        );

        await this.wallet.autoWrapForTrading();

        const newBalance = await this.wallet.getWrappedSOLBalance();
        if (newBalance < positionSize) {
          logger.error("❌ Still insufficient after wrapping");
          return null;
        }
      }

      logger.info(`🚀 Opening position: ${signal.token.slice(0, 8)}...`);

      // Execute buy
      const trade = await this.jupiter.buyToken(signal.token, positionSize);

      const position = {
        id: Date.now(),
        token: signal.token,
        entryPrice: positionSize / trade.outputAmount,
        amount: trade.outputAmount,
        investedSOL: positionSize,
        openedAt: new Date(),
        signal,
        stopLoss: this.stopLossPercent,
        takeProfit: this.takeProfitPercent,
      };

      this.positions.push(position);
      this.dailyTrades++;

      await this.telegram.sendMessage(
        `🚀 *POSITION OPENED*\n\n` +
          `Token: \`${signal.token.slice(0, 8)}...\`\n` +
          `Size: ${positionSize.toFixed(4)} SOL\n` +
          `Amount: ${trade.outputAmount.toFixed(6)}\n` +
          `Confidence: ${signal.confidence}%\n` +
          `Tx: \`${trade.signature.slice(0, 8)}...\``
      );

      logger.success(`✅ Position opened: ${positionSize.toFixed(4)} SOL`);

      return position;
    } catch (error) {
      logger.error("Failed to open position:", error);
      await this.telegram.sendMessage(`❌ Open failed: ${error.message}`);
      return null;
    }
  }

  async closePosition(position, reason) {
    try {
      logger.info(`🔒 Closing: ${position.token.slice(0, 8)}... (${reason})`);

      const trade = await this.jupiter.sellToken(
        position.token,
        position.amount
      );

      const exitSOL = trade.outputAmount;
      const pnl = exitSOL - position.investedSOL;
      const pnlPercent = (pnl / position.investedSOL) * 100;

      this.dailyPnL += pnl;

      this.positions = this.positions.filter((p) => p.id !== position.id);

      const emoji = pnl > 0 ? "💰" : "📉";
      await this.telegram.sendMessage(
        `${emoji} *POSITION CLOSED*\n\n` +
          `Token: \`${position.token.slice(0, 8)}...\`\n` +
          `Reason: ${reason}\n` +
          `Invested: ${position.investedSOL.toFixed(4)} SOL\n` +
          `Returned: ${exitSOL.toFixed(4)} SOL\n` +
          `P&L: ${pnl > 0 ? "+" : ""}${pnl.toFixed(
            4
          )} SOL (${pnlPercent.toFixed(2)}%)\n` +
          `Tx: \`${trade.signature.slice(0, 8)}...\``
      );

      logger.success(`✅ Closed: ${pnl > 0 ? "+" : ""}${pnl.toFixed(4)} SOL`);

      return { pnl, pnlPercent, exitSOL };
    } catch (error) {
      logger.error("Failed to close position:", error);
      throw error;
    }
  }

  async closeAllPositions(reason = "Manual close") {
    logger.info(`🔒 Closing all positions: ${reason}`);

    for (const position of [...this.positions]) {
      try {
        await this.closePosition(position, reason);
      } catch (error) {
        logger.error(`Failed to close ${position.id}:`, error);
      }
    }

    await this.telegram.sendMessage(
      `📊 *All positions closed*\n\n` +
        `Reason: ${reason}\n` +
        `Daily P&L: ${this.dailyPnL > 0 ? "+" : ""}${this.dailyPnL.toFixed(
          4
        )} SOL`
    );
  }

  async monitorPositions() {
    for (const position of this.positions) {
      try {
        // Get current price via Jupiter quote
        const quote = await this.jupiter.getQuote(
          position.token,
          "So11111111111111111111111111111111111111112",
          position.amount
        );

        const currentValue = quote.outAmount / 1e9; // LAMPORTS to SOL
        const pnlPercent =
          ((currentValue - position.investedSOL) / position.investedSOL) * 100;

        if (pnlPercent <= -position.stopLoss) {
          await this.closePosition(
            position,
            `Stop loss (${pnlPercent.toFixed(2)}%)`
          );
        } else if (pnlPercent >= position.takeProfit) {
          await this.closePosition(
            position,
            `Take profit (${pnlPercent.toFixed(2)}%)`
          );
        }
      } catch (error) {
        logger.error(`Monitor failed for ${position.id}:`, error);
      }
    }
  }

  getStats() {
    return {
      openPositions: this.positions.length,
      dailyTrades: this.dailyTrades,
      dailyPnL: this.dailyPnL,
      maxDailyTrades: this.maxDailyTrades,
      positions: this.positions.map((p) => ({
        token: p.token.slice(0, 8) + "...",
        invested: p.investedSOL,
        openedAt: p.openedAt,
      })),
    };
  }

  resetDailyStats() {
    this.dailyTrades = 0;
    this.dailyPnL = 0;
    logger.info("📊 Daily stats reset");
  }
}
