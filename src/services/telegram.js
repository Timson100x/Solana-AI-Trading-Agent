/**
 * Complete Professional Telegram Bot
 * ElizaOS-inspired with all commands
 */

import TelegramBot from "node-telegram-bot-api";
import { Logger } from "../utils/logger.js";

const logger = new Logger("Telegram");

export class TelegramService {
  constructor(agent) {
    this.agent = agent;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured");
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.chatId = chatId;

    this.setupCommands();

    logger.success("✅ Telegram bot initialized");
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const mode =
        process.env.TRADING_ENABLED === "true"
          ? "LIVE TRADING 🔥"
          : "Alert-Only Mode 🔔";

      const balance = await this.agent.wallet.getBalance();
      const wsol = await this.agent.wallet.getWrappedSOLBalance();

      await this.sendMessage(
        `🚀 *Solana AI Trading Agent*\n\n` +
          `Mode: ${mode}\n` +
          `Balance: ${balance.toFixed(4)} SOL\n` +
          `wSOL: ${wsol.toFixed(4)} wSOL\n` +
          `Status: Ready!\n\n` +
          `Use /help for commands`
      );
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const stats = this.agent.getStats();
      const mode =
        process.env.TRADING_ENABLED === "true" ? "🟢 TRADING" : "🟡 ALERTS";

      await this.sendMessage(
        `📊 *Agent Status*\n\n` +
          `Mode: ${mode}\n` +
          `Uptime: ${stats.uptime} minutes\n` +
          `Signals: ${stats.totalSignals}\n` +
          `Trades: ${stats.totalTrades}\n` +
          `Open Positions: ${stats.positions?.openPositions || 0}\n` +
          `Daily P&L: ${stats.positions?.dailyPnL?.toFixed(4) || "0.0000"} SOL`
      );
    });

    // Balance command
    this.bot.onText(/\/balance/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const sol = await this.agent.wallet.getBalance();
      const wsol = await this.agent.wallet.getWrappedSOLBalance();
      const total = sol + wsol;

      await this.sendMessage(
        `💰 *Wallet Balance*\n\n` +
          `SOL: ${sol.toFixed(4)}\n` +
          `wSOL: ${wsol.toFixed(4)}\n` +
          `Total: ${total.toFixed(4)} SOL\n\n` +
          `Address: \`${this.agent.wallet
            .getPublicKey()
            .toBase58()
            .slice(0, 8)}...\``
      );
    });

    // Positions command
    this.bot.onText(/\/positions/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const positions = this.agent.positionManager.positions;

      if (positions.length === 0) {
        await this.sendMessage("📍 No open positions");
        return;
      }

      let message = `📍 *Open Positions (${positions.length})*\n\n`;

      for (const pos of positions) {
        const age = Math.floor((Date.now() - pos.openedAt) / 60000);
        message += `Token: \`${pos.token.slice(0, 8)}...\`\n`;
        message += `Invested: ${pos.investedSOL.toFixed(4)} SOL\n`;
        message += `Age: ${age}m\n\n`;
      }

      await this.sendMessage(message);
    });

    // Stats command
    this.bot.onText(/\/stats/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const stats = this.agent.getStats();
      const jupiterStats = this.agent.jupiter.getStats();
      const aiStats = this.agent.gemini.getStats();

      await this.sendMessage(
        `📊 *Trading Statistics*\n\n` +
          `*System:*\n` +
          `Uptime: ${stats.uptime}m\n` +
          `Total Signals: ${stats.totalSignals}\n` +
          `Total Trades: ${stats.totalTrades}\n\n` +
          `*Jupiter:*\n` +
          `Success Rate: ${jupiterStats.successRate}%\n` +
          `Total Swaps: ${jupiterStats.totalSwaps}\n\n` +
          `*AI:*\n` +
          `Avg Response: ${aiStats.avgResponseTime}ms\n` +
          `Total Requests: ${aiStats.totalRequests}`
      );
    });

    // Wallets command
    this.bot.onText(/\/wallets/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const wallets = await this.agent.loadWallets();

      if (wallets.length === 0) {
        await this.sendMessage(
          "💼 No wallets tracked yet\n\nUse /scout to discover wallets"
        );
        return;
      }

      let message = `💼 *Tracked Wallets (${wallets.length})*\n\n`;

      for (const wallet of wallets.slice(0, 10)) {
        const perf =
          this.agent.performanceTracker.performanceData[wallet.address];
        const wr = perf
          ? this.agent.performanceTracker.getWinRate(wallet.address)
          : 0;

        message += `\`${wallet.address.slice(0, 8)}...\`\n`;
        message += `WR: ${wr.toFixed(0)}% | `;
        message += `Signals: ${perf?.totalSignals || 0}\n\n`;
      }

      await this.sendMessage(message);
    });

    // Scout command
    this.bot.onText(/\/scout/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      await this.sendMessage(
        "🔍 Starting wallet scouting...\n\nThis may take 2-5 minutes"
      );

      try {
        const newWallets = await this.agent.walletScout.scoutNewWallets();

        if (newWallets.length === 0) {
          await this.sendMessage("⚠️ No new profitable wallets found");
          return;
        }

        await this.agent.performanceTracker.addWallets(newWallets);

        let message = `✅ *Found ${newWallets.length} profitable wallets!*\n\n`;

        for (const w of newWallets.slice(0, 5)) {
          message += `\`${w.address.slice(0, 8)}...\`\n`;
          message += `WR: ${w.winRate}% | Via: ${w.discoveredVia}\n\n`;
        }

        await this.sendMessage(message);
      } catch (error) {
        await this.sendMessage(`❌ Scouting failed: ${error.message}`);
      }
    });

    // Review command
    this.bot.onText(/\/review/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      await this.sendMessage("📊 Reviewing wallet performance...");

      const removed = await this.agent.performanceTracker.reviewWallets();

      if (removed.length === 0) {
        await this.sendMessage("✅ All wallets performing well!");
        return;
      }

      let message = `🗑️ *Removed ${removed.length} underperformers*\n\n`;

      for (const w of removed) {
        message += `\`${w.address.slice(0, 8)}...\`\n`;
        message += `Reason: ${w.reason}\n\n`;
      }

      await this.sendMessage(message);
    });

    // Close command
    this.bot.onText(/\/close/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const positions = this.agent.positionManager.positions;

      if (positions.length === 0) {
        await this.sendMessage("📍 No positions to close");
        return;
      }

      await this.sendMessage(`🔒 Closing ${positions.length} positions...`);

      await this.agent.positionManager.closeAllPositions(
        "Manual close via /close"
      );
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      await this.sendMessage(
        `📚 *Available Commands*\n\n` +
          `/start - Start bot & status\n` +
          `/status - Agent status\n` +
          `/balance - Wallet balances\n` +
          `/positions - Open positions\n` +
          `/stats - Trading statistics\n` +
          `/wallets - Tracked wallets\n` +
          `/scout - Find new wallets\n` +
          `/review - Review performance\n` +
          `/close - Close all positions\n` +
          `/buy <token> <sol> - 🛒 Direct buy\n` +
          `/snipe <address> - \ud83d\udd25 1-Click Buy\n` +
          `/profitlock - \ud83d\udd12 Lock +100% wins\n` +
          `/help - This message`
      );
    });

    // \ud83d\udd25 TRICK #7: 1-CLICK SNIPE COMMAND
    this.bot.onText(/\/snipe (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const tokenAddress = match[1].trim();

      await this.sendMessage(
        `\ud83c\udfaf Sniping ${tokenAddress.slice(0, 8)}...`
      );

      try {
        // Verify token
        const tokenVerifier = this.agent.tokenVerifier;
        const verified = await tokenVerifier.verify(tokenAddress);

        if (!verified.verified) {
          await this.sendMessage(
            `\u26a0\ufe0f *Snipe Rejected*\n\n` +
              `Token: \`${tokenAddress}\`\n` +
              `Risk Score: ${verified.riskScore}\n` +
              `Reason: ${verified.redFlags.join(", ")}`
          );
          return;
        }

        // Execute trade
        const autoTrader = this.agent.autoTrader;
        const result = await autoTrader.execute({
          address: tokenAddress,
          size: "0.02 SOL",
          source: "telegram_snipe",
          verified,
        });

        if (result.executed) {
          await this.sendMessage(
            `\ud83d\ude80 *SNIPED!*\n\n` +
              `Token: \`${tokenAddress}\`\n` +
              `Amount: ${result.position.amount.toFixed(6)}\n` +
              `Invested: ${result.position.investedSOL} SOL\n` +
              `Risk: ${verified.riskScore}\n` +
              `Signature: \`${result.trade.signature.slice(0, 16)}...\``
          );
        } else {
          await this.sendMessage(
            `\u274c *Snipe Failed*\n\n` + `Reason: ${result.reason}`
          );
        }
      } catch (error) {
        await this.sendMessage(`\u274c *Snipe Error*\n\n${error.message}`);
      }
    });

    // 🛒 BUY COMMAND - Direct token purchase
    this.bot.onText(/\/buy (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      const args = match[1].trim().split(/\s+/);
      const tokenAddress = args[0];
      const amountSOL = parseFloat(args[1] || "0.01");

      if (!tokenAddress || tokenAddress.length < 32) {
        await this.sendMessage(
          `❌ *Ungültiger Befehl*\n\n` +
            `Verwendung: \`/buy <token_address> <sol_amount>\`\n\n` +
            `Beispiel:\n\`/buy EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.01\``
        );
        return;
      }

      if (isNaN(amountSOL) || amountSOL < 0.001) {
        await this.sendMessage(`❌ Mindestbetrag: 0.001 SOL`);
        return;
      }

      if (process.env.TRADING_ENABLED !== "true") {
        await this.sendMessage(
          `⚠️ *Trading deaktiviert*\n\n` +
            `Setze \`TRADING_ENABLED=true\` in .env um zu handeln.`
        );
        return;
      }

      await this.sendMessage(
        `🛒 *Kaufe Token...*\n\n` +
          `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
          `Betrag: ${amountSOL} SOL\n\n` +
          `⏳ Hole Quote von Jupiter...`
      );

      try {
        const WSOL = "So11111111111111111111111111111111111111112";
        const lamports = Math.floor(amountSOL * 1e9);

        // Get quote
        const quote = await this.agent.jupiter.getQuote(
          WSOL,
          tokenAddress,
          lamports
        );

        if (!quote) {
          await this.sendMessage(
            `❌ Kein Quote erhalten - Token möglicherweise nicht handelbar`
          );
          return;
        }

        const outAmount = parseInt(quote.outAmount);
        const priceImpact = parseFloat(quote.priceImpactPct || 0);

        await this.sendMessage(
          `📊 *Quote erhalten*\n\n` +
            `Input: ${amountSOL} SOL\n` +
            `Output: ${(outAmount / 1e6).toFixed(6)} Token\n` +
            `Price Impact: ${priceImpact.toFixed(4)}%\n\n` +
            `🔄 Führe Swap aus...`
        );

        // Execute swap
        const result = await this.agent.jupiter.executeSwap(quote);

        if (result && result.signature) {
          await this.sendMessage(
            `✅ *KAUF ERFOLGREICH!*\n\n` +
              `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
              `Investiert: ${amountSOL} SOL\n` +
              `Signature: \`${result.signature.slice(0, 20)}...\`\n\n` +
              `[Auf Solscan ansehen](https://solscan.io/tx/${result.signature})`
          );

          // Add to position manager
          await this.agent.positionManager.openPosition({
            token: tokenAddress,
            amount: outAmount,
            investedSOL: amountSOL,
            entryPrice: amountSOL / (outAmount / 1e6),
            signature: result.signature,
            source: "telegram_buy",
          });
        } else {
          await this.sendMessage(
            `❌ Swap fehlgeschlagen: ${result?.error || "Unbekannter Fehler"}`
          );
        }
      } catch (error) {
        await this.sendMessage(`❌ *Kauf fehlgeschlagen*\n\n${error.message}`);
      }
    });

    // \ud83d\udd25 PROFIT LOCK COMMAND
    this.bot.onText(/\/profitlock/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;

      try {
        const profitLocker = this.agent.profitLocker;

        if (!profitLocker) {
          await this.sendMessage("\u26a0\ufe0f Profit locker not initialized");
          return;
        }

        await this.sendMessage(
          "\ud83d\udd12 Checking positions for profit locking..."
        );
        await profitLocker.checkAndLockProfits();
        await this.sendMessage("\u2705 Profit lock check complete!");
      } catch (error) {
        await this.sendMessage(`\u274c Profit lock error: ${error.message}`);
      }
    });

    logger.success("✅ All Telegram commands registered");
  }

  async sendMessage(text) {
    try {
      await this.bot.sendMessage(this.chatId, text, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      logger.error("Failed to send message:", error);
    }
  }

  async sendAlert(alert) {
    await this.sendMessage(`🚨 *${alert.title}*\n\n${alert.message}`);
  }
}
