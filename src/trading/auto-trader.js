/**
 * Auto Trader - Automated trade execution
 * Complete flow from signal to execution
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("AutoTrader");

export class AutoTrader {
  constructor(tokenVerifier, riskManager, jupiter, telegram) {
    this.tokenVerifier = tokenVerifier;
    this.riskManager = riskManager;
    this.jupiter = jupiter;
    this.telegram = telegram;

    this.tradingEnabled =
      process.env.TRADING_ENABLED === "true" ||
      process.env.AUTO_TRADING_ENABLED === "true";
    this.executedTrades = 0;
    this.failedTrades = 0;
  }

  async execute(signal) {
    try {
      if (!this.tradingEnabled) {
        logger.info("📝 Paper mode - trade skipped");
        return { executed: false, reason: "Trading disabled" };
      }

      logger.info(
        `\n${"=".repeat(60)}\n🎯 AUTO TRADE: ${signal.token} (${
          signal.symbol
        })\n${"=".repeat(60)}`
      );

      // Step 1: Verify token safety
      logger.info("Step 1/5: Token verification...");
      const verification = await this.tokenVerifier.verify(
        signal.address,
        signal
      );

      if (!verification.verified) {
        logger.warn(
          `⚠️ Token failed verification (risk: ${verification.riskScore})`
        );
        await this.telegram.sendMessage(
          `⚠️ *Trade Skipped*\n\n` +
            `Token: ${signal.symbol}\n` +
            `Reason: Failed verification\n` +
            `Risk Score: ${verification.riskScore}\n` +
            `Red Flags: ${verification.redFlags.join(", ")}`
        );
        return {
          executed: false,
          reason: "Verification failed",
          verification,
        };
      }

      // Step 2: Calculate position size
      logger.info("Step 2/5: Position sizing...");
      const positionParams = await this.riskManager.calculatePositionSize(
        signal,
        verification
      );

      if (!positionParams) {
        logger.warn("⚠️ Position sizing rejected trade");
        return { executed: false, reason: "Position sizing failed" };
      }

      // Step 3: Check trade permission
      logger.info("Step 3/5: Risk management check...");
      const permitted = await this.riskManager.checkTradePermission();

      if (!permitted) {
        logger.warn("⚠️ Risk manager rejected trade");
        return {
          executed: false,
          reason: "Risk limits reached",
        };
      }

      // Step 4: Get quote from Jupiter
      logger.info("Step 4/5: Getting Jupiter quote...");
      const quote = await this.jupiter.getQuote(
        "So11111111111111111111111111111111111111112", // SOL
        signal.address,
        positionParams.positionSize
      );

      if (!quote) {
        logger.error("❌ Failed to get Jupiter quote");
        this.failedTrades++;
        return { executed: false, reason: "Quote failed" };
      }

      logger.info(
        `💱 Quote: ${positionParams.positionSize} SOL → ${parseFloat(
          quote.outAmount / 1e9
        ).toFixed(6)} ${signal.symbol}`
      );

      // Step 5: Execute swap
      logger.info("Step 5/5: Executing swap...");
      const trade = await this.jupiter.executeSwap(quote, {
        maxRetries: 3,
        priorityFee: "high",
      });

      if (!trade || !trade.signature) {
        logger.error("❌ Trade execution failed");
        this.failedTrades++;
        await this.telegram.sendMessage(
          `❌ *Trade Failed*\n\n` +
            `Token: ${signal.symbol}\n` +
            `Reason: Execution error`
        );
        return { executed: false, reason: "Execution failed" };
      }

      // Success!
      this.executedTrades++;
      const position = {
        id: Date.now(),
        token: signal.address,
        symbol: signal.symbol,
        entryPrice: signal.price || 0,
        amount: parseFloat(quote.outAmount / 1e9),
        investedSOL: positionParams.positionSize,
        openedAt: new Date(),
        signature: trade.signature,
        stopLoss: positionParams.stopLoss,
        takeProfit1: positionParams.takeProfit1,
        takeProfit2: positionParams.takeProfit2,
        trailingStop: positionParams.trailingStop,
        verification,
        signal,
      };

      // Add to risk manager
      this.riskManager.addPosition(position);

      // Send success notification
      await this.telegram.sendMessage(
        `🚀 *TRADE EXECUTED*\n\n` +
          `Token: ${signal.symbol}\n` +
          `Address: \`${signal.address}\`\n` +
          `Amount: ${position.amount.toFixed(6)}\n` +
          `Invested: ${positionParams.positionSize} SOL\n` +
          `Risk Score: ${verification.riskScore}\n` +
          `Stop-Loss: -${(positionParams.stopLoss * 100).toFixed(0)}%\n` +
          `Take-Profit: +${(positionParams.takeProfit1 * 100).toFixed(
            0
          )}% / +${(positionParams.takeProfit2 * 100).toFixed(0)}%\n` +
          `Signature: \`${trade.signature.slice(0, 16)}...\`\n\n` +
          `AI Reason: ${signal.reason.substring(0, 100)}`
      );

      logger.success(
        `✅ Trade executed successfully! Sig: ${trade.signature.slice(0, 8)}...`
      );

      return {
        executed: true,
        position,
        trade,
        verification,
        positionParams,
      };
    } catch (error) {
      logger.error("Auto-trade failed:", error.message);
      this.failedTrades++;

      await this.telegram.sendMessage(
        `❌ *Trade Error*\n\n` +
          `Token: ${signal.symbol || "Unknown"}\n` +
          `Error: ${error.message}`
      );

      return {
        executed: false,
        reason: error.message,
        error,
      };
    }
  }

  getStats() {
    return {
      executedTrades: this.executedTrades,
      failedTrades: this.failedTrades,
      successRate:
        this.executedTrades + this.failedTrades > 0
          ? (
              (this.executedTrades /
                (this.executedTrades + this.failedTrades)) *
              100
            ).toFixed(1)
          : 0,
    };
  }
}

export default AutoTrader;
