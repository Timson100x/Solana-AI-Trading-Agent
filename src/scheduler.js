/**
 * Auto-Scheduler for Enhanced Trading Bot
 * Runs scans automatically at configured intervals
 */

import "dotenv/config";
import enhancedBot from "./enhanced-bot.js";
import { Logger } from "./utils/logger.js";
import tradingConfig from "./config/trading-config.js";

const logger = new Logger("Scheduler");

class BotScheduler {
  constructor() {
    this.isRunning = false;
    this.scanCount = 0;
    // 🔥 15-MIN SCANS: Perfekte Balance Speed/Rate Limit
    this.intervalMinutes =
      tradingConfig.scan?.intervalMinutes ||
      parseInt(process.env.SCAN_INTERVAL_MINUTES || "15");
  }

  async start() {
    logger.success(`🚀 Bot Scheduler gestartet`);
    logger.info(`⏰ Scan-Intervall: ${this.intervalMinutes} Minuten\n`);

    // Initial scan immediately
    await this.runScan();

    // Schedule recurring scans
    setInterval(async () => {
      await this.runScan();
    }, this.intervalMinutes * 60 * 1000);

    logger.info(`✅ Scheduler läuft im Hintergrund`);
  }

  async runScan() {
    if (this.isRunning) {
      logger.warn("⚠️ Scan already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    this.scanCount++;

    try {
      logger.info(
        `\n${"=".repeat(60)}\n📊 Scan #${
          this.scanCount
        } - ${new Date().toLocaleTimeString()}\n${"=".repeat(60)}\n`
      );

      await enhancedBot.run();

      logger.success(
        `\n✅ Scan #${this.scanCount} abgeschlossen. Nächster Scan in ${this.intervalMinutes} Minuten.\n`
      );
    } catch (error) {
      logger.error(`❌ Scan #${this.scanCount} fehlgeschlagen:`, error.message);
    } finally {
      this.isRunning = false;
    }
  }
}

// Start scheduler
const scheduler = new BotScheduler();
scheduler.start();

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("\n👋 Scheduler wird beendet...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("\n👋 Scheduler wird beendet...");
  process.exit(0);
});
