/**
 * Enhanced Trading Bot - AI-powered token discovery and analysis
 * LIVE TRADING MODE with Jupiter V6
 */

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import birdeyeProvider from "./providers/birdeye-provider.js";
import tradingAnalyzer from "./analyzers/trading-analyzer.js";
import tradingConfig from "./config/trading-config.js";
import { JupiterService } from "./services/jupiter.js";
import DirectSwapService from "./services/direct-swap.js";
import { WalletService } from "./services/wallet.js";
import { Logger } from "./utils/logger.js";

const logger = new Logger("EnhancedBot");

class EnhancedTradingBot {
  constructor() {
    // Initialize Telegram if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        polling: false,
      });
      this.chatId = process.env.TELEGRAM_CHAT_ID;
      logger.success("✅ Telegram bot initialized");
    } else {
      this.bot = null;
      this.chatId = null;
      logger.warn("⚠️ Telegram not configured");
    }

    // 🚨 Initialize Jupiter & Wallet for LIVE TRADING
    this.tradingEnabled = process.env.TRADING_ENABLED === "true";
    this.minPositionSize = parseFloat(
      process.env.MIN_POSITION_SIZE_SOL || 0.006
    );

    if (this.tradingEnabled) {
      try {
        const connection = new Connection(process.env.RPC_ENDPOINT);
        const keypair = Keypair.fromSecretKey(
          bs58.decode(process.env.WALLET_PRIVATE_KEY)
        );

        this.wallet = new WalletService(connection, keypair);

        // Try Jupiter first, fallback to DirectSwap if DNS fails
        try {
          this.jupiter = new JupiterService(connection, this.wallet);
          this.swapService = this.jupiter;
        } catch (jupError) {
          logger.warn("Jupiter init failed, using DirectSwap");
          this.swapService = new DirectSwapService(connection, this.wallet);
        }

        logger.success(
          `🚨 LIVE TRADING ENABLED (${this.minPositionSize} SOL per trade)`
        );
      } catch (error) {
        logger.error("Failed to initialize trading services:", error);
        this.tradingEnabled = false;
      }
    } else {
      logger.warn("⚠️ ALERT MODE - No trades will be executed");
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
    logger.info(`Strategy: � ULTRA WIDE SCAN MODE`);
    logger.info(
      `Liquidity Range: $${tradingConfig.birdeye.minLiquidity} - $${tradingConfig.birdeye.maxLiquidity} (Maximum Coverage)`
    );
    logger.info(`Scan Limit: ${tradingConfig.birdeye.limit} tokens\n`);

    try {
      // 1. Get tokens from Birdeye
      logger.info(
        `📊 Hole Token-Liste von Birdeye (${tradingConfig.birdeye.minLiquidity}-${tradingConfig.birdeye.maxLiquidity}$ liquidity)...`
      );

      const tokenListResponse = await birdeyeProvider.getTokenList({
        minLiquidity: tradingConfig.birdeye.minLiquidity,
        maxLiquidity: tradingConfig.birdeye.maxLiquidity,
      });

      if (
        !tokenListResponse ||
        !tokenListResponse.data ||
        !tokenListResponse.data.tokens
      ) {
        throw new Error("Keine Tokens von Birdeye erhalten");
      }

      const tokens = tokenListResponse.data.tokens;
      logger.success(`✅ ${tokens.length} Tokens gefunden\n`);

      if (tokens.length === 0) {
        logger.warn(
          "⚠️ Keine Tokens im gewünschten Liquiditätsbereich gefunden"
        );
        return [];
      }

      // 2. AI Analysis
      logger.info("🤖 Starte KI-Analyse...\n");

      const analyses = await Promise.all(
        tokens.map((token) => tradingAnalyzer.analyzeToken(token))
      );

      logger.success(`✅ ${analyses.length} Tokens analysiert\n`);

      // 3. Filter for BUY signals
      const buySignals = analyses.filter(
        (a) =>
          a.verdict === "BUY" &&
          a.confidence >= (tradingConfig.birdeye.minConfidence || 70)
      );

      const holdCount = analyses.filter((a) => a.verdict === "HOLD").length;
      const skipCount = analyses.filter((a) => a.verdict === "SKIP").length;
      const unknownCount = analyses.filter(
        (a) => !a.verdict || a.verdict === "UNKNOWN"
      ).length;

      // 4. Display results
      logger.info("=".repeat(60));
      logger.info(`📊 ERGEBNISSE:`);
      logger.info(`Gesamt analysiert: ${analyses.length}`);
      logger.info(`BUY: ${buySignals.length}`);
      logger.info(`HOLD: ${holdCount}`);
      logger.info(`SKIP: ${skipCount}`);
      if (unknownCount > 0) {
        logger.warn(`UNKNOWN (no verdict): ${unknownCount}`);
      }
      logger.info("=".repeat(60));

      if (buySignals.length > 0) {
        logger.info(`\n💰 BUY SIGNALS (${buySignals.length})`);
        logger.info("=".repeat(60) + "\n");

        // Send Telegram notification
        let telegramMsg = `🚀 *Enhanced Bot - BUY SIGNALS*\n\n`;
        telegramMsg += `Found ${buySignals.length} trading opportunities:\n\n`;

        buySignals.forEach((signal, i) => {
          logger.info(`${i + 1}. ${signal.token}`);
          logger.info(`   Adresse: ${signal.address}`);
          logger.info(`   Preis: $${signal.price}`);
          logger.info(
            `   Liquidität: $${
              signal.liquidity ? signal.liquidity.toFixed(2) : "N/A"
            }`
          );
          logger.info(`   Confidence: ${signal.confidence}%`);
          logger.info(`   Grund: ${signal.reason || "AI recommendation"}`);
          logger.info("");

          // Add to Telegram message
          telegramMsg += `*${i + 1}. ${signal.token}*\n`;
          telegramMsg += `Price: $${signal.price}\n`;
          telegramMsg += `Liquidity: $${
            signal.liquidity ? signal.liquidity.toFixed(0) : "N/A"
          }\n`;
          telegramMsg += `Confidence: ${signal.confidence}%\n`;
          telegramMsg += `Reason: ${
            signal.reason
              ? signal.reason.substring(0, 100)
              : "AI recommendation"
          }\n`;
          telegramMsg += `Address: \`${signal.address}\`\n\n`;
        });

        telegramMsg += `\n_Strategy: $${tradingConfig.birdeye.minLiquidity} - $${tradingConfig.birdeye.maxLiquidity} liquidity_`;

        await this.sendTelegramMessage(telegramMsg);

        // 🚨 EXECUTE LIVE TRADES
        if (this.tradingEnabled && this.swapService) {
          logger.info("\n🚨 LIVE TRADING EXECUTION STARTING...\n");

          for (const signal of buySignals) {
            try {
              logger.info(
                `💰 Executing BUY for ${signal.token} (${signal.address})`
              );

              const result = await this.swapService.buyToken(
                signal.address,
                this.minPositionSize,
                { slippageBps: 500 } // 5% slippage for safety
              );

              logger.success(
                `✅ Trade executed! Signature: ${result.signature.slice(
                  0,
                  16
                )}...`
              );

              // Send success notification
              await this.sendTelegramMessage(
                `✅ *TRADE EXECUTED*\n\n` +
                  `Token: ${signal.token}\n` +
                  `Amount: ${this.minPositionSize} SOL\n` +
                  `Signature: \`${result.signature}\`\n\n` +
                  `https://solscan.io/tx/${result.signature}`
              );

              // Wait 2 seconds between trades
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } catch (error) {
              logger.error(
                `❌ Trade failed for ${signal.token}:`,
                error.message
              );

              await this.sendTelegramMessage(
                `❌ *TRADE FAILED*\n\n` +
                  `Token: ${signal.token}\n` +
                  `Error: ${error.message}`
              );
            }
          }

          logger.success(
            `\n✅ Trading execution complete (${buySignals.length} trades attempted)\n`
          );
        }
      } else {
        logger.warn("\n⚠️ Keine BUY-Signale gefunden");

        // Send notification anyway
        await this.sendTelegramMessage(
          `📊 *Enhanced Bot Scan Complete*\n\nAnalyzed ${analyses.length} tokens\nNo buy signals found\n\n_Will scan again soon_`
        );
      }

      return buySignals;
    } catch (error) {
      logger.error("❌ Bot Fehler:", error.message);

      // Send error notification
      await this.sendTelegramMessage(
        `❌ *Enhanced Bot Error*\n\n${error.message}`
      );

      throw error;
    }
  }
}

// Export singleton instance
export default new EnhancedTradingBot();
