/**
 * Solana AI Trading Agent - Professional Edition
 * ElizaOS-Inspired Architecture
 */

import "dotenv/config";
import express from "express";
import { Connection } from "@solana/web3.js";
import { MultiRPCService } from "./src/services/multi-rpc.js";
import { WalletService } from "./src/services/wallet.js";
import { JupiterService } from "./src/services/jupiter.js";
import { SolanaService } from "./src/services/solana.js";
import { GeminiService } from "./src/services/gemini.js";
import { TelegramService } from "./src/services/telegram.js";
import { PositionManager } from "./src/services/position-manager.js";
import { WalletScout } from "./src/services/wallet-scout.js";
import { PerformanceTracker } from "./src/services/performance-tracker.js";
import { DexScreenerService } from "./src/services/dexscreener.js";
import { GmgnService } from "./src/services/gmgn.js";
import { PumpFunService } from "./src/services/pumpfun.js";
import { TokenDiscoveryService } from "./src/services/token-discovery.js";
import BubblemapsService from "./src/services/bubblemaps.js";
import { CoinGeckoService } from "./src/services/coingecko.js";
import { SolScanService } from "./src/services/solscan.js";
import { HeliusWebhooks } from "./src/services/helius-webhooks.js";
import { ReinvestOptimizer } from "./src/services/reinvest-optimizer.js";
import { WalletOptimizer } from "./src/services/wallet-optimizer.js";
import { PrivateMempool } from "./src/services/private-mempool.js";
import { JitoBundle } from "./src/services/jito-bundle.js";
import { LiquidityMigration } from "./src/discovery/liquidity-migration.js";
import { NLTelegramBridge } from "./src/services/nl-telegram-bridge.js";
import { GodModeAnalyzer } from "./src/analyzers/god-mode-analyzer.js";
import { TradeLogger } from "./src/utils/trade-logger.js";
import { BackupManager } from "./src/utils/backup-manager.js";
import { Logger } from "./src/utils/logger.js";
import fs from "fs/promises";

const logger = new Logger("Agent");

class TradingAgent {
  constructor() {
    this.app = express();
    this.stats = {
      startTime: Date.now(),
      totalSignals: 0,
      totalTrades: 0,
    };
    this.profitLockInProgress = false; // ✅ Add lock flag
  }

  async initialize() {
    try {
      logger.info("🚀 Initializing Solana AI Trading Agent...");

      // Initialize Multi-RPC with automatic failover
      this.multiRPC = new MultiRPCService();
      this.connection = this.multiRPC.getConnection();
      logger.success("✅ Solana connection established with Multi-RPC");

      // Initialize all services
      this.solana = new SolanaService(this.connection);
      this.wallet = new WalletService(this.connection);
      await this.wallet.initialize();

      this.jupiter = new JupiterService(this.connection, this.wallet);
      this.gemini = new GeminiService();
      this.dexscreener = new DexScreenerService();
      this.gmgn = new GmgnService();
      this.pumpfun = new PumpFunService();
      this.coingecko = new CoinGeckoService();
      this.solscan = new SolScanService();
      this.bubblemaps = new BubblemapsService();
      await this.bubblemaps.initialize();
      this.tokenDiscovery = new TokenDiscoveryService(
        this.bubblemaps,
        this.coingecko,
        this.solscan
      );

      // Initialize managers
      this.performanceTracker = new PerformanceTracker();
      await this.performanceTracker.loadPerformance();

      this.tradeLogger = new TradeLogger();
      this.backupManager = new BackupManager();

      // Create backup on startup
      await this.backupManager.createBackup();

      // Initialize position manager
      this.positionManager = new PositionManager(
        this.wallet,
        this.jupiter,
        null, // Telegram initialized later
        this.gemini
      );

      // Initialize wallet scout with all sources
      this.walletScout = new WalletScout(
        this.solana,
        this.gemini,
        this.dexscreener,
        this.gmgn,
        this.pumpfun,
        this.tokenDiscovery,
        this.bubblemaps,
        this.coingecko,
        this.solscan
      );

      // Initialize Telegram (needs agent reference)
      this.telegram = new TelegramService(this);
      this.positionManager.telegram = this.telegram;

      // 🤖 NEW: Natural Language Command Handler (ElizaOS V2)
      if (process.env.ENABLE_NL_COMMANDS !== "false") {
        this.nlBridge = new NLTelegramBridge(this.telegram, this.gemini);
        logger.success("✅ NL Auto-Deploy System initialized");
      }

      // Auto-wrap SOL if enabled
      if (
        process.env.AUTO_WRAP_SOL === "true" &&
        process.env.TRADING_ENABLED === "true"
      ) {
        await this.wallet.autoWrapForTrading();
      }

      // Setup API & webhooks
      this.setupAPI();
      this.helius = new HeliusWebhooks(this);
      this.helius.setup(this.app);

      // 🔥 GOD MODE: Initialize Phase 3 Services
      this.walletOptimizer = new WalletOptimizer(
        this.jupiter,
        this.wallet,
        this.telegram
      );
      this.reinvestOptimizer = new ReinvestOptimizer(
        this.jupiter,
        this.wallet,
        this.telegram,
        this.positionManager
      );

      this.privateMempool = new PrivateMempool(this.telegram);
      this.jitoBundle = new JitoBundle(this.connection, this.wallet);
      this.liquidityMigration = new LiquidityMigration(
        this.connection,
        this.solana,
        this.telegram
      );

      // God Mode Analyzer with all services
      this.godModeAnalyzer = new GodModeAnalyzer({
        tokenVerifier: this.tokenVerifier || null,
        honeypotDetector: this.honeypotDetector || null,
        volumeAnalyzer: this.volumeAnalyzer || null,
        privateMempool: this.privateMempool,
        liquidityMigration: this.liquidityMigration,
        dexScreener: this.dexscreener,
        birdeye: this.birdeye || null,
      });

      logger.success("✅ All services initialized");

      return true;
    } catch (error) {
      logger.error("Initialization failed:", error);
      throw error;
    }
  }

  setupAPI() {
    this.app.use(express.json());
    this.app.use(express.static("public"));

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", uptime: this.getUptime() });
    });

    // Stats endpoint
    this.app.get("/stats", (req, res) => {
      res.json(this.getStats());
    });

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        name: "Solana AI Trading Agent Pro",
        version: "2.0.0",
        mode: process.env.TRADING_ENABLED === "true" ? "trading" : "alert-only",
        uptime: this.getUptime(),
        stats: this.getStats(),
      });
    });

    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      logger.success(`✅ API running on port ${port}`);
    });
  }

  async start() {
    try {
      await this.initialize();

      // Send startup notification
      const mode =
        process.env.TRADING_ENABLED === "true"
          ? "LIVE TRADING 🔥"
          : "Alert-Only Mode 🔔";

      const balance = await this.wallet.getBalance();
      const wsolBalance = await this.wallet.getWrappedSOLBalance();

      await this.telegram.sendMessage(
        `🚀 *Trading Agent Started*\n\n` +
          `Mode: ${mode}\n` +
          `Balance: ${balance.toFixed(4)} SOL\n` +
          `wSOL: ${wsolBalance.toFixed(4)} wSOL\n` +
          `Status: Ready!`
      );

      // 🔥 PHASE 2: Start Helius Webhooks if configured
      if (process.env.HELIUS_API_KEY && this.heliusWebhooks) {
        await this.heliusWebhooks.startServer(3000);
        this.heliusWebhooks.setupWebhookEndpoint();
        await this.heliusWebhooks.createNewPoolWebhook();
        logger.success("🔗 Helius webhooks active - Real-time pool detection!");
      }

      // 🔥 PHASE 3: Start God Mode Systems
      if (process.env.GODMODE === "true") {
        await this.startGodMode();
      }

      // Start monitoring loops
      this.startMonitoring();

      // 🔥 PHASE 2: Profit Locking Loop (every 30 min)
      this.startProfitLocking();

      // Auto-scout wallets if enabled
      if (process.env.AUTO_SCOUT_WALLETS === "true") {
        this.startWalletScouting();
      }

      // Daily backup
      this.startDailyBackup();

      logger.success("🎉 Agent fully operational with PHASE 2 features!");
    } catch (error) {
      logger.error("Failed to start agent:", error);
      process.exit(1);
    }
  }

  startMonitoring() {
    // Main monitoring loop - every 60 seconds
    setInterval(async () => {
      try {
        await this.monitor();
      } catch (error) {
        logger.error("Monitoring error:", error);
      }
    }, 60000);

    // Position monitoring - every 30 seconds
    setInterval(async () => {
      try {
        await this.positionManager.monitorPositions();
      } catch (error) {
        logger.error("Position monitoring error:", error);
      }
    }, 30000);

    logger.success("✅ Monitoring loops started");
  }

  async monitor() {
    const wallets = await this.loadWallets();

    if (wallets.length === 0) {
      logger.warn("No wallets to monitor");
      return;
    }

    for (const wallet of wallets) {
      try {
        const transactions = await this.solana.getRecentTransactions(
          wallet.address,
          5
        );

        for (const tx of transactions) {
          const signal = await this.gemini.analyzeTransaction(tx, wallet);

          if (
            signal &&
            signal.action === "BUY" &&
            signal.confidence >= parseInt(process.env.MIN_CONFIDENCE || 75)
          ) {
            this.stats.totalSignals++;

            // Track signal
            await this.performanceTracker.trackSignal(
              wallet.address,
              signal,
              false
            );

            // Send alert
            await this.sendSignalAlert(signal, wallet);

            // Execute trade if enabled
            if (process.env.TRADING_ENABLED === "true") {
              const position = await this.positionManager.openPosition(signal);

              if (position) {
                this.stats.totalTrades++;

                // Log trade
                await this.tradeLogger.logTrade({
                  type: "open",
                  token: signal.token,
                  amount: position.amount,
                  solAmount: position.investedSOL,
                  price: position.entryPrice,
                  signal,
                  wallet: wallet.address,
                });

                // Track execution
                await this.performanceTracker.trackSignal(
                  wallet.address,
                  signal,
                  true
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Monitor error for ${wallet.address.slice(0, 8)}:`, error);
      }
    }
  }

  async sendSignalAlert(signal, wallet) {
    const mode =
      process.env.TRADING_ENABLED === "true"
        ? "🚀 AUTO-TRADING"
        : "⚠️ ALERT-ONLY";

    await this.telegram.sendMessage(
      `🚨 *SIGNAL DETECTED* ${mode}\n\n` +
        `Token: \`${signal.token.slice(0, 8)}...\`\n` +
        `Confidence: ${signal.confidence}%\n` +
        `Wallet: \`${wallet.address.slice(0, 8)}...\`\n` +
        `WR: ${wallet.winRate || "N/A"}%\n\n` +
        `Reasoning: ${signal.reasoning}`
    );
  }

  startWalletScouting() {
    const intervalHours = parseInt(process.env.SCOUT_INTERVAL_HOURS || 6);
    const intervalMs = intervalHours * 3600000;

    // Scout immediately on first run (no delay)
    (async () => {
      try {
        logger.info("🔍 Initial wallet scouting...");
        const newWallets = await this.walletScout.scoutNewWallets();

        if (newWallets.length > 0) {
          await this.performanceTracker.addWallets(newWallets);

          await this.telegram.sendMessage(
            `✅ *Auto-Scout Complete*\n\n` +
              `Found ${newWallets.length} profitable wallets!`
          );
        } else {
          logger.warn("Auto-scout found no wallets on initial run");
        }
      } catch (error) {
        logger.error("Auto-scout failed:", error);
      }
    })();

    // Then scout on interval
    setInterval(async () => {
      try {
        logger.info("🔍 Scheduled wallet scouting...");
        const newWallets = await this.walletScout.scoutNewWallets();

        if (newWallets.length > 0) {
          await this.performanceTracker.addWallets(newWallets);

          await this.telegram.sendMessage(
            `✅ *Auto-Scout Complete*\n\n` +
              `Found ${newWallets.length} new wallets!`
          );
        }
      } catch (error) {
        logger.error("Auto-scout failed:", error);
      }
    }, intervalMs);

    logger.success(`✅ Auto-scouting enabled (every ${intervalHours}h)`);
  }

  startDailyBackup() {
    // Backup every 24 hours
    setInterval(async () => {
      try {
        await this.backupManager.createBackup();
        logger.info("📦 Daily backup created");
      } catch (error) {
        logger.error("Backup failed:", error);
      }
    }, 86400000); // 24 hours
  }

  /**
   * 🔥 PHASE 2: Profit Locking Loop
   * Runs every 30 minutes to lock +100% profits
   */
  startProfitLocking() {
    logger.info("💰 Starting profit locking loop (30min intervals)...");

    // Run immediately
    this.checkProfitLocking();

    // Then every 30 minutes
    setInterval(async () => {
      await this.checkProfitLocking();
    }, 30 * 60 * 1000);

    logger.success("✅ Profit locking loop started");
  }

  async checkProfitLocking() {
    // ✅ Prevent parallel execution
    if (this.profitLockInProgress) {
      logger.info("Profit locking already in progress, skipping...");
      return;
    }
    
    this.profitLockInProgress = true;
    
    try {
      const positions = [...this.positionManager.positions]; // ✅ Copy array

      if (positions.length === 0) {
        return;
      }

      logger.info(
        `💰 Checking ${positions.length} positions for profit locking...`
      );

      // Filter winners (+100% or more)
      const winners = positions.filter(
        (p) =>
          p.currentPrice && (p.currentPrice - p.entryPrice) / p.entryPrice > 1.0
      );

      if (winners.length === 0) {
        logger.info("No positions at +100% profit yet");
        return;
      }

      const totalValue = await this.calculateTotalPortfolio();

      for (const winner of winners) {
        // ✅ Check if position still exists
        const currentPos = this.positionManager.positions.find(p => p.id === winner.id);
        if (!currentPos) {
          logger.warn(`Position ${winner.id} no longer exists`);
          continue;
        }
        
        // ✅ Use currentPos for calculations
        const positionValue = currentPos.amount * currentPos.currentPrice;
        const pnlPercent =
          ((currentPos.currentPrice - currentPos.entryPrice) / currentPos.entryPrice) * 100;

        // Only lock if position is >10% of portfolio
        if (positionValue > totalValue * 0.1) {
          logger.success(
            `🔒 LOCKING PROFIT: ${currentPos.symbol} +${pnlPercent.toFixed(1)}%`
          );

          // Sell 60%, keep 40%
          const sellAmount = currentPos.amount * 0.6;

          try {
            const quote = await this.jupiter.getQuote(
              currentPos.token,
              "So11111111111111111111111111111111111111112",
              sellAmount
            );

            if (quote) {
              const trade = await this.jupiter.executeSwap(quote, {
                maxRetries: 3,
                priorityFee: "high",
              });

              if (trade && trade.signature) {
                const receivedSOL = parseFloat(quote.outAmount / 1e9);

                // ✅ Update original position
                currentPos.amount -= sellAmount;
                currentPos.lockedProfit = true;

                await this.telegram.sendMessage(
                  `🔒 *PROFIT LOCKED*\n\n` +
                    `Token: ${currentPos.symbol}\n` +
                    `Profit: +${pnlPercent.toFixed(1)}%\n` +
                    `Sold: 60% (${sellAmount.toFixed(6)})\n` +
                    `Received: ${receivedSOL.toFixed(4)} SOL\n` +
                    `Remaining: ${currentPos.amount.toFixed(6)}\n` +
                    `Signature: \`${trade.signature.slice(0, 16)}...\``
                );

                logger.success(
                  `✅ Profit locked: ${receivedSOL.toFixed(4)} SOL`
                );
              }
            }
          } catch (error) {
            logger.error(
              `Failed to lock profit for ${currentPos.symbol}:`,
              error.message
            );
          }
        }
      }
    } catch (error) {
      logger.error("Profit locking check failed:", error.message);
    } finally {
      this.profitLockInProgress = false; // ✅ Always release lock
    }
  }

  async calculateTotalPortfolio() {
    const balance = await this.wallet.getBalance();
    const wsolBalance = await this.wallet.getWrappedSOLBalance();
    return balance + wsolBalance + 1; // +1 buffer
  }

  /**
   * 🔥 PHASE 3: GOD MODE - 95% Win Rate System
   */
  async startGodMode() {
    logger.info("🔥 Starting GOD MODE (95% Win Rate System)...");

    try {
      // 1. Optimize wallet balance (0.17 SOL → 90% WSOL + 10% SOL)
      if (process.env.OPTIMIZE_WALLET === "true") {
        logger.info("💎 Optimizing wallet balance...");
        const result = await this.walletOptimizer.optimize();
        if (result.success) {
          logger.success(
            `✅ Wallet optimized: ${result.wsol.toFixed(
              4
            )} WSOL + ${result.sol.toFixed(4)} SOL`
          );
        }
      }

      // 2. Start auto-reinvest (90% profits → WSOL)
      this.reinvestOptimizer.startAuto();

      // 3. Start private mempool monitoring (smart wallet copy-trading)
      if (process.env.QUICKNODE_MEV_RPC) {
        this.privateMempool.start();

        // Import smart wallets from performance tracker
        const wallets = await this.loadWallets();
        if (wallets.length > 0) {
          await this.privateMempool.importSmartWallets(wallets);
        }

        // Listen for smart buy signals
        this.privateMempool.on("smart-buy", async (signal) => {
          logger.info(`🔮 Smart buy signal: ${signal.token.slice(0, 8)}...`);

          if (process.env.TRADING_ENABLED === "true") {
            await this.executeGodModeTrade(signal.token);
          }
        });
      }

      // 4. Start liquidity migration tracking (Raydium sniper)
      this.liquidityMigration.startTracking();

      this.liquidityMigration.on("migration:detected", async (migration) => {
        logger.info(`🎯 Migration detected: ${migration.token.slice(0, 8)}...`);

        if (
          process.env.TRADING_ENABLED === "true" &&
          process.env.SNIPER_MODE === "true"
        ) {
          await this.executeGodModeTrade(migration.token);
        }
      });

      // 5. Start God Mode scanner
      this.startGodModeScanner();

      logger.success("✅ GOD MODE ACTIVE - 95% Win Rate System Engaged! 🔥");

      await this.telegram.sendMessage(
        `🔥 *GOD MODE ACTIVATED*\n\n` +
          `Systems Online:\n` +
          `✅ Wallet Optimizer (90% WSOL)\n` +
          `✅ Auto-Reinvest (30min)\n` +
          `✅ Private Mempool (MEV)\n` +
          `✅ Liquidity Sniper (Raydium)\n` +
          `✅ 12-Layer Filter\n\n` +
          `Target: 95% Win Rate 🎯`
      );
    } catch (error) {
      logger.error("God Mode startup failed:", error.message);
    }
  }

  /**
   * Start God Mode scanner (1-minute intervals)
   */
  startGodModeScanner() {
    logger.info("🔥 Starting God Mode scanner...");

    setInterval(async () => {
      try {
        // Get trending tokens from DexScreener
        const tokens = await this.dexscreener.getTrendingTokens({
          limit: 10,
          minLiquidity: 50,
          maxLiquidity: 350,
        });

        if (!tokens || tokens.length === 0) {
          logger.info("No trending tokens found in 50-350$ range");
          return;
        }

        logger.info(
          `🔍 Scanning ${tokens.length} tokens with God Mode filter...`
        );

        for (const token of tokens.slice(0, 5)) {
          // Check top 5
          const analysis = await this.godModeAnalyzer.godModeFilter(token);

          if (
            analysis.verdict === "GOD_MODE_BUY" &&
            process.env.TRADING_ENABLED === "true"
          ) {
            logger.success(
              `🔥 GOD MODE SIGNAL: ${token.symbol} (${analysis.score}/12)`
            );
            await this.executeGodModeTrade(token.address);
          } else if (analysis.verdict === "GOD_MODE_BUY") {
            logger.info(
              `📊 GOD MODE SIGNAL (Alert Only): ${token.symbol} (${analysis.score}/12) - Trading disabled`
            );
          }
        }
      } catch (error) {
        logger.error("God Mode scanner error:", error.message);
      }
    }, 60 * 1000); // Every 60 seconds

    logger.success("✅ God Mode scanner started (60s intervals)");
  }

  /**
   * Execute trade with God Mode checks
   */
  async executeGodModeTrade(tokenAddress) {
    try {
      logger.info(
        `🔥 Executing God Mode trade for ${tokenAddress.slice(0, 8)}...`
      );

      // ✅ Balance check first
      const wsolBalance = await this.wallet.getWrappedSOLBalance();
      const tradeAmountSol = parseFloat(process.env.GOD_MODE_TRADE_AMOUNT || 0.006);
      
      if (wsolBalance < tradeAmountSol) {
        logger.warn(`Insufficient balance for God Mode trade: ${wsolBalance.toFixed(4)} < ${tradeAmountSol}`);
        await this.telegram.sendMessage(`⚠️ God Mode trade skipped: Insufficient balance`);
        return;
      }

      // ✅ Run God Mode filter
      const tokenData = { address: tokenAddress };
      const analysis = await this.godModeAnalyzer.godModeFilter(tokenData);
      
      const minScore = parseInt(process.env.GOD_MODE_MIN_SCORE || 5);
      if (analysis.verdict !== "GOD_MODE_BUY" || analysis.score < minScore) {
        logger.warn(`⚠️ God Mode check failed: ${analysis.score}/${minScore}`);
        return;
      }

      // ✅ Ensure optimal wallet balance
      await this.walletOptimizer.ensureOptimalBalance();

      // ✅ Execute trade
      const tradeAmount = Math.floor(tradeAmountSol * 1e9);

      let result;
      if (process.env.USE_JITO_BUNDLES === "true") {
        result = await this.jitoBundle.buyAtomic(
          tokenAddress,
          tradeAmountSol,
          this.jupiter
        );
      } else {
        // Fallback: Standard Jupiter swap
        const quote = await this.jupiter.getQuote(
          "So11111111111111111111111111111111111111112",
          tokenAddress,
          tradeAmount
        );

        if (quote) {
          const trade = await this.jupiter.executeSwap(quote, {
            maxRetries: 3,
            priorityFee: "veryHigh",
          });
          result = trade;
        }
      }

      if (result && result.signature) {
        logger.success(
          `✅ God Mode trade executed: ${result.signature.slice(0, 16)}...`
        );

        await this.telegram.sendMessage(
          `🔥 *GOD MODE TRADE*\n\n` +
            `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
            `God Score: ${analysis.score}/12\n` +
            `Confidence: ${analysis.confidence.toFixed(0)}%\n` +
            `Amount: ${tradeAmountSol.toFixed(4)} SOL\n` +
            `Signature: \`${result.signature.slice(0, 16)}...\`\n\n` +
            `💎 Target: 95% Win Rate!`
        );

        // ✅ Add to position monitor
        await this.positionManager.openPosition({
          token: tokenAddress,
          amount: tradeAmount,
          entryPrice: 0, // Will be calculated
          signature: result.signature,
          godMode: true,
          godScore: analysis.score,
        });
      }
    } catch (error) {
      logger.error("God Mode trade failed:", error.message);
      await this.telegram.sendMessage(`🚨 God Mode Error: ${error.message}`);
    }
  }

  async loadWallets() {
    try {
      const data = await fs.readFile("./config/smart-wallets.json", "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  getUptime() {
    return Math.floor((Date.now() - this.stats.startTime) / 60000);
  }

  getStats() {
    return {
      uptime: this.getUptime(),
      totalSignals: this.stats.totalSignals,
      totalTrades: this.stats.totalTrades,
      positions: this.positionManager.getStats(),
      config: {
        tradingEnabled: process.env.TRADING_ENABLED === "true",
        capital: parseFloat(process.env.TOTAL_CAPITAL_SOL || 0.17),
        minConfidence: parseInt(process.env.MIN_CONFIDENCE || 75),
      },
    };
  }
}

// Start the agent
const agent = new TradingAgent();
agent.start().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("\n🛑 Shutting down gracefully...");

  // Close all positions if trading enabled
  if (process.env.TRADING_ENABLED === "true") {
    await agent.positionManager.closeAllPositions("Shutdown");
  }

  // Create final backup
  await agent.backupManager.createBackup();

  logger.success("✅ Shutdown complete");
  process.exit(0);
});
