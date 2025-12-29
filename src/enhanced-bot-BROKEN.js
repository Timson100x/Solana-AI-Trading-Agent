/**
 * Enhanced Trading Bot - AI-powered token discovery and analysis
 * Uses Birdeye for discovery and Groq for analysis
 * Now with AUTO-TRADING capabilities
 */

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import birdeyeProvider from "./providers/birdeye-provider.js";
import tradingAnalyzer from "./analyzers/trading-analyzer.js";
import tradingConfig from "./config/trading-config.js";
import { Logger } from "./utils/logger.js";

// Auto-Trading imports
import { Connection } from "@solana/web3.js";
import { TokenVerifier } from "./verifiers/token-verifier.js";
import { RiskManager } from "./trading/risk-manager.js";
import { AutoTrader } from "./trading/auto-trader.js";
import { PositionMonitor } from "./monitoring/position-monitor.js";
import DexScreenerService from "./services/dexscreener.js";
import BubbleMapsService from "./services/bubblemaps.js";
import JupiterService from "./services/jupiter.js";
import WalletService from "./services/wallet.js";

const logger = new Logger("EnhancedBot");

export class EnhancedTradingBot {
  constructor() {
    // Initialize Telegram if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        polling: false,
      });
      this.chatId = process.env.TELEGRAM_CHAT_ID;
      logger.success("✅ Telegram notifications enabled");
    } else {
      logger.warn("⚠️ Telegram not configured - running without notifications");
    }
  }

  async sendTelegramMessage(text) {
    if (!this.bot || !this.chatId) return;

    try {
      await this.bot.sendMessage(this.chatId, text, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      logger.error("Telegram send failed:", error.message);
    }
  }

  async run() {
    logger.info("🚀 Enhanced Trading Bot gestartet...\n");
    logger.info(`Strategy: 🔥 Ultra Early Sniper Mode`);
    logger.info(`Liquidity Range: $50 - $350 (God Mode)`);
    logger.info(`Scan Limit: 100 tokens\n`);

    try {
      // 1. Tokens von Birdeye holen
      logger.info("📊 Hole Token-Liste von Birdeye (50-350$ liquidity)...");
      const tokenListResponse = await birdeyeProvider.getTokenList({
        minLiquidity: 50,  // 🔥 Hardcoded: Ultra früh!
        maxLiquidity: 350, // 🔥 Hardcoded: Pre-Pump!
        limit: 100,        // 🔥 Mehr Tokens scannen
        // AUTO-TRADING: Execute trades
        const tradeResults = [];

        for (let i = 0; i < buySignals.length; i++) {
          const signal = buySignals[i];

          logger.info(`${i + 1}. ${signal.token}`);
          logger.info(`   Adresse: ${signal.address}`);
          logger.info(`   Preis: $${signal.price}`);
          logger.info(`   Liquidität: $${signal.liquidity.toFixed(2)}`);
          logger.info(`   Grund: ${signal.reason}`);

          // Execute auto-trade if enabled
          if (
            tradingConfig.autoTrading.enabled &&
            this.autoTradingInitialized
          ) {
            logger.info(`   🤖 Executing auto-trade...`);
            const result = await this.autoTrader.execute(signal);
            tradeResults.push(result);

            if (result.executed) {
              logger.success(`   ✅ Trade executed!`);
            } else {
              logger.warn(`   ⚠️ Trade skipped: ${result.reason}`);
            }
          }

          logger.info("");

          // Add to Telegram message (only for alerts, trades send their own messages)
          if (!tradingConfig.autoTrading.enabled) {
            telegramMsg += `*${i + 1}. ${signal.token}*\n`;
            telegramMsg += `Price: $${signal.price}\n`;
            telegramMsg += `Liquidity: $${signal.liquidity.toFixed(0)}\n`;
            telegramMsg += `Volume 24h: $${
              signal.liquidity ? (signal.liquidity * 10).toFixed(0) : "N/A"
            }\n`;
            telegramMsg += `Reason: ${signal.reason.substring(0, 100)}\n`;
            telegramMsg += `Address: \`${signal.address}\`\n\n`;
          }

      // Auto-trading stats
      if (this.autoTrader && tradingConfig.autoTrading.enabled) {
        const autoStats = this.autoTrader.getStats();
        logger.info(`\nAuto-Trading:`);
        logger.info(`  Executed: ${autoStats.executedTrades}`);
        logger.info(`  Failed: ${autoStats.failedTrades}`);
        logger.info(`  Success Rate: ${autoStats.successRate}%`);
      }

      // Risk manager stats
      if (this.riskManager && tradingConfig.autoTrading.enabled) {
        const riskStats = this.riskManager.getStats();
        logger.info(`\nPortfolio:`);
        logger.info(`  Open Positions: ${riskStats.openPositions}`);
        logger.info(`  Total Invested: ${riskStats.totalInvested} SOL`);
      }

        }

        // Send alert message if trading disabled
        if (!tradingConfig.autoTrading.enabled) {
          telegramMsg += `_Strategy: ${tradingConfig.birdeye.minLiquidity} - ${tradingConfig.birdeye.maxLiquidity} liquidity_`;
          await this.sendTelegramMessage(telegramMsg);
        } else {
          // Send summary for auto-trading
          const executedCount = tradeResults.filter((r) => r.executed).length;
          const summaryMsg =
            `📊 *Auto-Trading Summary*\n\n` +
            `Signals: ${buySignals.length}\n` +
            `Executed: ${executedCount}\n` +
            `Skipped: ${buySignals.length - executedCount}\n\n` +
            `${this.riskManager ? `Open Positions: ${this.riskManager.openPositions.length}` : ""}`;

          await this.sendTelegramMessage(summaryMsg);
        }
        if (
          priceData &&
          priceData.liquidity >= 50 &&   // 🔥 Ultra Early: 50$ min
          priceData.liquidity <= 350     // 🔥 Pre-Pump: 350$ max
        ) {
          enrichedTokens.push({
            symbol: token.symbol || "UNKNOWN",
            address: token.address,
            price: priceData.value,
            liquidity: priceData.liquidity,
            volume24h: token.v24hUSD,
            priceChange24h: priceData.priceChange24h || 0,
          });
        }

        await birdeyeProvider.sleep(tradingConfig.rateLimits.birdeye);
      }

      logger.success(
        `✅ ${enrichedTokens.length} Tokens mit guter Liquidität (${tokensToCheck} geprüft)\n`
      );

      // 3. KI-Analyse
      logger.info("🤖 Starte KI-Analyse...\n");
      const analyses = await tradingAnalyzer.analyzeBatch(
        enrichedTokens,
        tradingConfig.rateLimits.groq
      );

      // 4. Ergebnisse filtern und anzeigen
      const buySignals = analyses.filter((a) => a.decision === "BUY");

      logger.info("\n" + "=".repeat(60));
      logger.info(`💰 BUY SIGNALS (${buySignals.length})`);
      logger.info("=".repeat(60) + "\n");

      if (buySignals.length > 0) {
        // Send Telegram notification for buy signals
        let telegramMsg = `🚀 *Enhanced Bot - BUY SIGNALS*\n\n`;
        telegramMsg += `Found ${buySignals.length} trading opportunities:\n\n`;

        buySignals.forEach((signal, i) => {
          logger.info(`${i + 1}. ${signal.token}`);
          logger.info(`   Adresse: ${signal.address}`);
          logger.info(`   Preis: $${signal.price}`);
          logger.info(`   Liquidität: $${signal.liquidity.toFixed(2)}`);
          logger.info(`   Grund: ${signal.reason}`);
          logger.info("");

          // Add to Telegram message
          telegramMsg += `*${i + 1}. ${signal.token}*\n`;
          telegramMsg += `Price: $${signal.price}\n`;
          telegramMsg += `Liquidity: $${signal.liquidity.toFixed(0)}\n`;
          telegramMsg += `Volume 24h: $${
            signal.liquidity ? (signal.liquidity * 10).toFixed(0) : "N/A"
          }\n`;
          telegramMsg += `Reason: ${signal.reason.substring(0, 100)}\n`;
          telegramMsg += `Address: \`${signal.address}\`\n\n`;
        });

        telegramMsg += `_Strategy: ${tradingConfig.birdeye.minLiquidity} - ${tradingConfig.birdeye.maxLiquidity} liquidity_`;

        // Send to Telegram
        await this.sendTelegramMessage(telegramMsg);
      } else {
        logger.info("No BUY signals found");
        await this.sendTelegramMessage(
          `📊 *Enhanced Bot Scan*\n\nAnalyzed ${analyses.length} tokens\nNo BUY signals found this run`
        );
      }

      // 5. Statistiken
      const skipCount = analyses.filter((a) => a.decision === "SKIP").length;
      const holdCount = analyses.filter((a) => a.decision === "HOLD").length;

      logger.info("=".repeat(60));
      logger.info("📊 STATISTIK");
      logger.info("=".repeat(60));
      logger.info(`Gesamt analysiert: ${analyses.length}`);
      logger.info(`BUY: ${buySignals.length}`);
      logger.info(`HOLD: ${holdCount}`);
      logger.info(`SKIP: ${skipCount}`);
      logger.info("=".repeat(60));

      return buySignals;
    } catch (error) {
      logger.error("❌ Bot Fehler:", error.message);

      // Send error notification to Telegram
      await this.sendTelegramMessage(
        `❌ *Enhanced Bot Error*\n\n${error.message}`
      );

      throw error;
    }
  }
}

// Export singleton instance
export default new EnhancedTradingBot();
