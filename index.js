/**
 * Solana AI Trading Agent - Professional Edition
 * ElizaOS-Inspired Architecture
 */

import 'dotenv/config';
import express from 'express';
import { Connection } from '@solana/web3.js';
import { WalletService } from './src/services/wallet.js';
import { JupiterService } from './src/services/jupiter.js';
import { SolanaService } from './src/services/solana.js';
import { GeminiService } from './src/services/gemini.js';
import { TelegramService } from './src/services/telegram.js';
import { PositionManager } from './src/services/position-manager.js';
import { WalletScout } from './src/services/wallet-scout.js';
import { PerformanceTracker } from './src/services/performance-tracker.js';
import { DexScreenerService } from './src/services/dexscreener.js';
import { HeliusWebhooks } from './src/services/helius-webhooks.js';
import { TradeLogger } from './src/utils/trade-logger.js';
import { BackupManager } from './src/utils/backup-manager.js';
import { Logger } from './src/utils/logger.js';
import fs from 'fs/promises';

const logger = new Logger('Agent');

class TradingAgent {
  constructor() {
    this.app = express();
    this.stats = { 
      startTime: Date.now(), 
      totalSignals: 0, 
      totalTrades: 0 
    };
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing Solana AI Trading Agent...');

      // Initialize Solana connection
      const rpcUrl = process.env.SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error('SOLANA_RPC_URL not configured');
      }

      this.connection = new Connection(rpcUrl, 'confirmed');
      logger.success('✅ Solana connection established');

      // Initialize all services
      this.solana = new SolanaService(this.connection);
      this.wallet = new WalletService(this.connection);
      await this.wallet.initialize();

      this.jupiter = new JupiterService(this.connection, this.wallet);
      this.gemini = new GeminiService();
      this.dexscreener = new DexScreenerService();

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

      // Initialize wallet scout
      this.walletScout = new WalletScout(
        this.solana,
        this.gemini,
        this.dexscreener
      );

      // Initialize Telegram (needs agent reference)
      this.telegram = new TelegramService(this);
      this.positionManager.telegram = this.telegram;

      // Auto-wrap SOL if enabled
      if (process.env.AUTO_WRAP_SOL === 'true' && 
          process.env.TRADING_ENABLED === 'true') {
        await this.wallet.autoWrapForTrading();
      }

      // Setup API & webhooks
      this.setupAPI();
      this.helius = new HeliusWebhooks(this);
      this.helius.setup(this.app);
      
      // Initialize webhook if enabled
      await this.helius.initialize();

      logger.success('✅ All services initialized');

      return true;
    } catch (error) {
      logger.error('Initialization failed:', error);
      throw error;
    }
  }

  setupAPI() {
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', uptime: this.getUptime() });
    });

    // Stats endpoint
    this.app.get('/stats', (req, res) => {
      res.json(this.getStats());
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Solana AI Trading Agent Pro',
        version: '2.0.0',
        mode: process.env.TRADING_ENABLED === 'true' ? 'trading' : 'alert-only',
        uptime: this.getUptime(),
        stats: this.getStats()
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
      const mode = process.env.TRADING_ENABLED === 'true' ? 
        'LIVE TRADING 🔥' : 'Alert-Only Mode 🔔';

      const balance = await this.wallet.getBalance();
      const wsolBalance = await this.wallet.getWrappedSOLBalance();

      await this.telegram.sendMessage(
        `🚀 *Trading Agent Started*\n\n` +
        `Mode: ${mode}\n` +
        `Balance: ${balance.toFixed(4)} SOL\n` +
        `wSOL: ${wsolBalance.toFixed(4)} wSOL\n` +
        `Status: Ready!`
      );

      // Start monitoring loops
      this.startMonitoring();

      // Auto-scout wallets if enabled
      if (process.env.AUTO_SCOUT_WALLETS === 'true') {
        this.startWalletScouting();
      }

      // Daily backup
      this.startDailyBackup();

      logger.success('🎉 Agent fully operational!');
    } catch (error) {
      logger.error('Failed to start agent:', error);
      process.exit(1);
    }
  }

  startMonitoring() {
    // Main monitoring loop - every 60 seconds
    setInterval(async () => {
      try {
        await this.monitor();
      } catch (error) {
        logger.error('Monitoring error:', error);
      }
    }, 60000);

    // Position monitoring - every 30 seconds
    setInterval(async () => {
      try {
        await this.positionManager.monitorPositions();
      } catch (error) {
        logger.error('Position monitoring error:', error);
      }
    }, 30000);

    logger.success('✅ Monitoring loops started');
  }

  async monitor() {
    const wallets = await this.loadWallets();

    if (wallets.length === 0) {
      logger.warn('No wallets to monitor');
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

          if (signal && 
              signal.action === 'BUY' && 
              signal.confidence >= parseInt(process.env.MIN_CONFIDENCE || 75)) {

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
            if (process.env.TRADING_ENABLED === 'true') {
              const position = await this.positionManager.openPosition(signal);

              if (position) {
                this.stats.totalTrades++;

                // Log trade
                await this.tradeLogger.logTrade({
                  type: 'open',
                  token: signal.token,
                  amount: position.amount,
                  solAmount: position.investedSOL,
                  price: position.entryPrice,
                  signal,
                  wallet: wallet.address
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
    const mode = process.env.TRADING_ENABLED === 'true' ? 
      '🚀 AUTO-TRADING' : '⚠️ ALERT-ONLY';

    await this.telegram.sendMessage(
      `🚨 *SIGNAL DETECTED* ${mode}\n\n` +
      `Token: \`${signal.token.slice(0, 8)}...\`\n` +
      `Confidence: ${signal.confidence}%\n` +
      `Wallet: \`${wallet.address.slice(0, 8)}...\`\n` +
      `WR: ${wallet.winRate || 'N/A'}%\n\n` +
      `Reasoning: ${signal.reasoning}`
    );
  }

  startWalletScouting() {
    const intervalHours = parseInt(process.env.SCOUT_INTERVAL_HOURS || 24);
    const intervalMs = intervalHours * 3600000;

    // Scout immediately on first run
    setTimeout(async () => {
      try {
        logger.info('🔍 Initial wallet scouting...');
        const newWallets = await this.walletScout.scoutNewWallets();

        if (newWallets.length > 0) {
          await this.performanceTracker.addWallets(newWallets);

          await this.telegram.sendMessage(
            `✅ *Auto-Scout Complete*\n\n` +
            `Found ${newWallets.length} profitable wallets!`
          );
        }
      } catch (error) {
        logger.error('Auto-scout failed:', error);
      }
    }, 300000); // 5 minutes after start

    // Then scout on interval
    setInterval(async () => {
      try {
        logger.info('🔍 Scheduled wallet scouting...');
        const newWallets = await this.walletScout.scoutNewWallets();

        if (newWallets.length > 0) {
          await this.performanceTracker.addWallets(newWallets);

          await this.telegram.sendMessage(
            `✅ *Auto-Scout Complete*\n\n` +
            `Found ${newWallets.length} new wallets!`
          );
        }
      } catch (error) {
        logger.error('Auto-scout failed:', error);
      }
    }, intervalMs);

    logger.success(`✅ Auto-scouting enabled (every ${intervalHours}h)`);
  }

  startDailyBackup() {
    // Backup every 24 hours
    setInterval(async () => {
      try {
        await this.backupManager.createBackup();
        logger.info('📦 Daily backup created');
      } catch (error) {
        logger.error('Backup failed:', error);
      }
    }, 86400000); // 24 hours
  }

  async loadWallets() {
    try {
      const data = await fs.readFile('./config/smart-wallets.json', 'utf-8');
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
      webhooks: this.helius ? this.helius.getStatus() : { enabled: false },
      config: {
        tradingEnabled: process.env.TRADING_ENABLED === 'true',
        capital: parseFloat(process.env.TOTAL_CAPITAL_SOL || 0.17),
        minConfidence: parseInt(process.env.MIN_CONFIDENCE || 75)
      }
    };
  }
}

// Start the agent
const agent = new TradingAgent();
agent.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down gracefully...');

  // Close all positions if trading enabled
  if (process.env.TRADING_ENABLED === 'true') {
    await agent.positionManager.closeAllPositions('Shutdown');
  }

  // Create final backup
  await agent.backupManager.createBackup();

  logger.success('✅ Shutdown complete');
  process.exit(0);
});
