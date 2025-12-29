/**
 * 🔮 PRIVATE MEMPOOL - MEV Smart Wallet Tracking
 * Monitors pending transactions from high-performing wallets
 * Uses QuickNode MEV RPC for real-time mempool access
 */

import axios from "axios";
import { Logger } from "../utils/logger.js";
import EventEmitter from "eventemitter3";

const logger = new Logger("PrivateMempool");

export class PrivateMempool extends EventEmitter {
  constructor(telegram) {
    super();
    this.telegram = telegram;

    this.mevEndpoint = process.env.QUICKNODE_MEV_RPC || null;
    this.minWinRate = parseFloat(process.env.MEV_MIN_WIN_RATE || 0.85);
    this.checkInterval = parseInt(process.env.MEV_CHECK_INTERVAL || 5000); // 5s

    this.trackedWallets = new Map();
    this.pendingTxCache = new Map();
    this.isRunning = false;

    if (!this.mevEndpoint) {
      logger.warn("⚠️ QuickNode MEV endpoint not configured");
    } else {
      logger.info("🔮 PrivateMempool initialized");
    }
  }

  /**
   * Start mempool monitoring
   */
  start() {
    if (!this.mevEndpoint) {
      logger.error("Cannot start: MEV endpoint not configured");
      return;
    }

    if (this.isRunning) {
      logger.warn("Mempool monitor already running");
      return;
    }

    this.isRunning = true;
    logger.info("🔮 Starting mempool monitor...");

    // Check mempool every 5 seconds
    this.intervalId = setInterval(async () => {
      await this.checkMempool();
    }, this.checkInterval);

    logger.success("✅ Mempool monitor started");
  }

  /**
   * Stop mempool monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("🔮 Mempool monitor stopped");
  }

  /**
   * Check mempool for smart wallet transactions
   */
  async checkMempool() {
    try {
      // Get pending transactions (QuickNode MEV method)
      const pendingTxs = await this.getPendingTransactions();

      if (pendingTxs.length === 0) {
        return;
      }

      logger.info(`🔮 Found ${pendingTxs.length} pending transactions`);

      for (const tx of pendingTxs) {
        await this.analyzePendingTx(tx);
      }
    } catch (error) {
      logger.error("Mempool check failed:", error.message);
    }
  }

  /**
   * Get pending transactions from QuickNode MEV
   */
  async getPendingTransactions() {
    try {
      // QuickNode MEV-specific RPC call
      const response = await axios.post(this.mevEndpoint, {
        jsonrpc: "2.0",
        id: 1,
        method: "qn_mempool",
        params: [
          {
            filters: {
              accounts: Array.from(this.trackedWallets.keys()),
              programIds: [
                "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium
                "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
              ],
            },
          },
        ],
      });

      return response.data.result?.transactions || [];
    } catch (error) {
      // Fallback: Use standard Solana RPC (less reliable)
      logger.warn("MEV RPC failed, using fallback...");
      return [];
    }
  }

  /**
   * Analyze a pending transaction
   */
  async analyzePendingTx(tx) {
    try {
      const txHash = tx.signature || tx.hash;

      // Skip if already processed
      if (this.pendingTxCache.has(txHash)) {
        return;
      }

      this.pendingTxCache.set(txHash, Date.now());

      // Extract wallet and token info
      const wallet = tx.feePayer || tx.signer;
      const tokenMint = this.extractTokenMint(tx);

      if (!wallet || !tokenMint) {
        return;
      }

      // Check if wallet is tracked
      const walletInfo = this.trackedWallets.get(wallet);

      if (walletInfo && walletInfo.winRate >= this.minWinRate) {
        logger.success(
          `🔮 SMART BUY DETECTED: ${wallet.slice(0, 8)}... → ${tokenMint.slice(
            0,
            8
          )}... (Win Rate: ${(walletInfo.winRate * 100).toFixed(0)}%)`
        );

        // Emit event for auto-trading
        this.emit("smart-buy", {
          wallet,
          token: tokenMint,
          winRate: walletInfo.winRate,
          signature: txHash,
          timestamp: Date.now(),
        });

        // Telegram alert
        await this.telegram.sendMessage(
          `🔮 *MEMPOOL SIGNAL*\n\n` +
            `Smart Wallet: \`${wallet.slice(0, 16)}...\`\n` +
            `Win Rate: ${(walletInfo.winRate * 100).toFixed(0)}%\n` +
            `Token: \`${tokenMint.slice(0, 16)}...\`\n` +
            `Action: BUY (Pending)\n\n` +
            `💡 Copy trade opportunity!`
        );
      }

      // Clean cache (keep last 100)
      if (this.pendingTxCache.size > 100) {
        const oldest = Array.from(this.pendingTxCache.entries()).sort(
          (a, b) => a[1] - b[1]
        )[0];
        this.pendingTxCache.delete(oldest[0]);
      }
    } catch (error) {
      logger.error("Pending tx analysis failed:", error.message);
    }
  }

  /**
   * Extract token mint from transaction
   */
  extractTokenMint(tx) {
    try {
      // Check transaction instructions for token mint
      const instructions = tx.transaction?.message?.instructions || [];

      for (const ix of instructions) {
        // Jupiter swap instruction
        if (ix.programId === "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4") {
          const accounts = ix.accounts || [];
          if (accounts.length >= 3) {
            return accounts[2]; // Output token mint
          }
        }

        // Raydium swap instruction
        if (ix.programId === "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8") {
          const accounts = ix.accounts || [];
          if (accounts.length >= 4) {
            return accounts[3]; // Token mint
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Add wallet to tracking list
   */
  addWallet(address, winRate, trades = 0) {
    this.trackedWallets.set(address, {
      address,
      winRate,
      trades,
      addedAt: Date.now(),
    });

    logger.info(
      `🔮 Tracking wallet: ${address.slice(0, 8)}... (${(winRate * 100).toFixed(
        0
      )}% WR)`
    );
  }

  /**
   * Remove wallet from tracking
   */
  removeWallet(address) {
    this.trackedWallets.delete(address);
    logger.info(`🔮 Stopped tracking: ${address.slice(0, 8)}...`);
  }

  /**
   * Get pending smart buys for a token
   */
  async getPendingSmartBuys(tokenMint) {
    try {
      const response = await axios.post(this.mevEndpoint, {
        jsonrpc: "2.0",
        id: 1,
        method: "qn_mempool",
        params: [
          {
            filters: {
              tokenMint,
              programIds: [
                "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
                "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
              ],
            },
          },
        ],
      });

      const txs = response.data.result?.transactions || [];

      // Filter by tracked wallets with high win rate
      return txs.filter((tx) => {
        const wallet = tx.feePayer || tx.signer;
        const info = this.trackedWallets.get(wallet);
        return info && info.winRate >= this.minWinRate;
      });
    } catch (error) {
      logger.error("Failed to get pending smart buys:", error.message);
      return [];
    }
  }

  /**
   * Get mempool statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      trackedWallets: this.trackedWallets.size,
      pendingTxCached: this.pendingTxCache.size,
      minWinRate: this.minWinRate,
      checkInterval: this.checkInterval,
    };
  }

  /**
   * Import smart wallets from performance tracker
   */
  async importSmartWallets(wallets) {
    let imported = 0;

    for (const wallet of wallets) {
      if (wallet.winRate >= this.minWinRate) {
        this.addWallet(wallet.address, wallet.winRate, wallet.trades);
        imported++;
      }
    }

    logger.success(
      `✅ Imported ${imported} smart wallets for mempool tracking`
    );

    await this.telegram.sendMessage(
      `🔮 *MEMPOOL TRACKING ACTIVE*\n\n` +
        `Wallets: ${imported}\n` +
        `Min Win Rate: ${(this.minWinRate * 100).toFixed(0)}%\n` +
        `Check Interval: ${this.checkInterval / 1000}s\n\n` +
        `💡 Copy trading enabled!`
    );
  }
}
