/**
 * 🎯 LIQUIDITY MIGRATION - Raydium Pre-Launch Sniper
 * Detects tokens migrating to Raydium before liquidity is added
 * Snipers the pool creation moment for maximum gains
 */

import { Logger } from "../utils/logger.js";
import EventEmitter from "eventemitter3";

const logger = new Logger("LiquidityMigration");

export class LiquidityMigration extends EventEmitter {
  constructor(connection, helius, telegram) {
    super();
    this.connection = connection;
    this.helius = helius;
    this.telegram = telegram;

    // Raydium Program IDs
    this.raydiumProgramIds = [
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM V4
      "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLAMM
      "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h", // Raydium Concentrated
    ];

    this.minLiquiditySol = parseFloat(
      process.env.MIGRATION_MIN_LIQUIDITY || 500
    );
    this.maxLiquiditySol = parseFloat(
      process.env.MIGRATION_MAX_LIQUIDITY || 10000
    );
    this.checkInterval = parseInt(
      process.env.MIGRATION_CHECK_INTERVAL || 10000
    ); // 10s

    this.trackedMigrations = new Map();
    this.isRunning = false;

    logger.info("🎯 LiquidityMigration initialized");
  }

  /**
   * Start tracking liquidity migrations
   */
  startTracking() {
    if (this.isRunning) {
      logger.warn("Migration tracker already running");
      return;
    }

    this.isRunning = true;
    logger.info("🎯 Starting liquidity migration tracker...");

    // Check for migrations every 10 seconds
    this.intervalId = setInterval(async () => {
      await this.checkMigrations();
    }, this.checkInterval);

    // Subscribe to Raydium program updates via Helius
    this.subscribeToRaydium();

    logger.success("✅ Migration tracker started");
  }

  /**
   * Stop tracking
   */
  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("🎯 Migration tracker stopped");
  }

  /**
   * Check for new liquidity migrations
   */
  async checkMigrations() {
    try {
      // Get recent Raydium program calls
      const migrations = await this.getPreRaydiumTokens();

      if (migrations.length === 0) {
        return;
      }

      logger.info(`🎯 Found ${migrations.length} potential migrations`);

      for (const migration of migrations) {
        await this.processMigration(migration);
      }
    } catch (error) {
      logger.error("Migration check failed:", error.message);
    }
  }

  /**
   * Get tokens being migrated to Raydium (pre-launch)
   */
  async getPreRaydiumTokens() {
    try {
      const migrations = [];

      // Check each Raydium program
      for (const programId of this.raydiumProgramIds) {
        const txs = await this.helius.getRecentProgramTransactions(
          programId,
          10
        );

        for (const tx of txs) {
          const migration = await this.parseMigrationTx(tx);

          if (migration && !migration.finalized) {
            // Filter by liquidity range
            if (
              migration.liquidity >= this.minLiquiditySol &&
              migration.liquidity <= this.maxLiquiditySol
            ) {
              migrations.push(migration);
            }
          }
        }
      }

      return migrations;
    } catch (error) {
      logger.error("Failed to get pre-Raydium tokens:", error.message);
      return [];
    }
  }

  /**
   * Parse migration transaction
   */
  async parseMigrationTx(tx) {
    try {
      const description = tx.description || "";

      // Check for pool initialization
      if (
        description.includes("initialize") ||
        description.includes("create_pool") ||
        description.includes("add_liquidity")
      ) {
        const tokenMint = this.extractTokenMint(tx);
        const liquidity = this.estimateLiquidity(tx);
        const finalized =
          tx.slot && tx.slot < (await this.connection.getSlot()) - 10;

        return {
          tokenMint,
          liquidity,
          finalized,
          signature: tx.signature,
          timestamp: tx.timestamp || Date.now() / 1000,
          program: tx.instructions?.[0]?.programId || "unknown",
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract token mint from transaction
   */
  extractTokenMint(tx) {
    try {
      // Check token transfers
      const transfers = tx.tokenTransfers || [];

      for (const transfer of transfers) {
        if (
          transfer.mint &&
          transfer.mint !== "So11111111111111111111111111111111111111112"
        ) {
          return transfer.mint;
        }
      }

      // Fallback: check account keys
      const accounts = tx.transaction?.message?.accountKeys || [];
      return accounts[3] || null; // Common position for token mint
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimate liquidity from transaction
   */
  estimateLiquidity(tx) {
    try {
      const transfers = tx.tokenTransfers || [];
      let solAmount = 0;

      for (const transfer of transfers) {
        // SOL/WSOL transfers indicate liquidity
        if (transfer.mint === "So11111111111111111111111111111111111111112") {
          solAmount += parseFloat(transfer.tokenAmount || 0) / 1e9;
        }
      }

      return solAmount;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Process a detected migration
   */
  async processMigration(migration) {
    try {
      const key = `${migration.tokenMint}_${migration.signature}`;

      // Skip if already processed
      if (this.trackedMigrations.has(key)) {
        return;
      }

      this.trackedMigrations.set(key, {
        ...migration,
        detected: Date.now(),
      });

      logger.success(
        `🎯 MIGRATION DETECTED: ${migration.tokenMint.slice(
          0,
          8
        )}... (~${migration.liquidity.toFixed(0)} SOL)`
      );

      // Emit event for auto-sniping
      this.emit("migration:detected", {
        token: migration.tokenMint,
        liquidity: migration.liquidity,
        signature: migration.signature,
        program: migration.program,
      });

      // Telegram alert
      await this.telegram.sendMessage(
        `🎯 *LIQUIDITY MIGRATION*\n\n` +
          `Token: \`${migration.tokenMint.slice(0, 16)}...\`\n` +
          `Liquidity: ~${migration.liquidity.toFixed(0)} SOL\n` +
          `Program: ${this.getProgramName(migration.program)}\n` +
          `Status: ${migration.finalized ? "Finalized" : "Pending"}\n\n` +
          `💡 Pool creation imminent!`
      );

      // Clean old migrations (keep last 50)
      if (this.trackedMigrations.size > 50) {
        const oldest = Array.from(this.trackedMigrations.entries()).sort(
          (a, b) => a[1].detected - b[1].detected
        )[0];
        this.trackedMigrations.delete(oldest[0]);
      }
    } catch (error) {
      logger.error("Migration processing failed:", error.message);
    }
  }

  /**
   * Subscribe to Raydium program updates (real-time)
   */
  subscribeToRaydium() {
    try {
      // Use Helius webhook for real-time updates
      for (const programId of this.raydiumProgramIds) {
        this.connection.onProgramAccountChange(
          programId,
          async (accountInfo, context) => {
            logger.info(
              `🎯 Raydium program update detected (slot ${context.slot})`
            );
            await this.checkMigrations();
          },
          "confirmed"
        );
      }

      logger.info("🎯 Subscribed to Raydium program updates");
    } catch (error) {
      logger.warn("Failed to subscribe to Raydium:", error.message);
    }
  }

  /**
   * Get program name from ID
   */
  getProgramName(programId) {
    const names = {
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM V4",
      CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLAMM",
      "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h": "Raydium Concentrated",
    };
    return names[programId] || "Unknown";
  }

  /**
   * Get migration statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      trackedMigrations: this.trackedMigrations.size,
      minLiquidity: this.minLiquiditySol,
      maxLiquidity: this.maxLiquiditySol,
      checkInterval: this.checkInterval,
    };
  }

  /**
   * Check if token has pending migration
   */
  hasPendingMigration(tokenMint) {
    for (const [key, migration] of this.trackedMigrations.entries()) {
      if (migration.tokenMint === tokenMint && !migration.finalized) {
        return true;
      }
    }
    return false;
  }
}
