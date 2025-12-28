/**
 * External Monitoring Service
 * Provides public API access with optional authentication
 */

import express from 'express';
import { Logger } from './utils/logger.js';

const logger = new Logger('ExternalMonitor');

export class ExternalMonitoringService {
  constructor(tradingAgent) {
    this.agent = tradingAgent;
    this.app = express();
    this.port = process.env.EXTERNAL_API_PORT || 3001;
    this.apiKey = process.env.EXTERNAL_API_KEY;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());

    // CORS - allow all
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // API Key authentication (optional)
    if (this.apiKey) {
      this.app.use((req, res, next) => {
        const providedKey = req.headers['x-api-key'];

        if (!providedKey || providedKey !== this.apiKey) {
          return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Invalid or missing API key'
          });
        }
        next();
      });
    }
  }

  setupRoutes() {
    // Public health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: Date.now(),
        version: '2.1.0'
      });
    });

    // Quick status
    this.app.get('/status', async (req, res) => {
      try {
        const balance = await this.agent.wallet?.getBalance() || 0;
        const stats = this.agent.tradingStats || {};

        res.json({
          status: 'online',
          balance: balance.toFixed(4),
          totalTrades: (stats.successfulTrades || 0) + (stats.failedTrades || 0),
          successRate: this.calculateSuccessRate(),
          timestamp: Date.now()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Wallet info
    this.app.get('/wallet', async (req, res) => {
      try {
        const balance = await this.agent.wallet?.getBalance() || 0;
        const wsolBalance = await this.agent.wallet?.getWrappedSOLBalance() || 0;

        res.json({
          publicKey: this.agent.wallet?.getPublicKey()?.toBase58() || 'N/A',
          balance: parseFloat(balance.toFixed(4)),
          wsolBalance: parseFloat(wsolBalance.toFixed(4)),
          total: parseFloat((balance + wsolBalance).toFixed(4)),
          timestamp: Date.now()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Trading stats
    this.app.get('/trading', (req, res) => {
      try {
        const stats = this.agent.tradingStats || {};

        res.json({
          totalSignals: stats.totalSignals || 0,
          totalTrades: (stats.successfulTrades || 0) + (stats.failedTrades || 0),
          successfulTrades: stats.successfulTrades || 0,
          failedTrades: stats.failedTrades || 0,
          successRate: this.calculateSuccessRate(),
          timestamp: Date.now()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Recent trades
    this.app.get('/trades', (req, res) => {
      try {
        const trades = this.agent.recentTrades || [];
        const limit = parseInt(req.query.limit) || 10;

        res.json({
          total: trades.length,
          trades: trades.slice(-limit).reverse(),
          timestamp: Date.now()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Performance
    this.app.get('/performance', (req, res) => {
      try {
        res.json({
          successRate: this.calculateSuccessRate(),
          avgProfit: this.calculateAvgProfit(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          timestamp: Date.now()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Simple command endpoint
    this.app.post('/command', async (req, res) => {
      try {
        const { action, params } = req.body;

        let result = { success: false, message: 'Unknown command' };

        switch (action) {
          case 'get_balance':
            const balance = await this.agent.wallet?.getBalance() || 0;
            result = {
              success: true,
              balance: balance.toFixed(4),
              unit: 'SOL'
            };
            break;

          case 'get_stats':
            result = {
              success: true,
              stats: {
                trades: (this.agent.tradingStats?.successfulTrades || 0) + 
                       (this.agent.tradingStats?.failedTrades || 0),
                successRate: this.calculateSuccessRate(),
                uptime: Math.floor(process.uptime())
              }
            };
            break;

          case 'get_status':
            result = {
              success: true,
              status: 'online',
              trading: process.env.TRADING_ENABLED === 'true',
              version: '2.1.0-ElizaOS-V2'
            };
            break;

          default:
            result = {
              success: false,
              message: 'Available commands: get_balance, get_stats, get_status'
            };
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // 404
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  calculateSuccessRate() {
    const stats = this.agent.tradingStats;
    if (!stats) return '0';
    const total = (stats.successfulTrades || 0) + (stats.failedTrades || 0);
    if (total === 0) return '0';
    return (((stats.successfulTrades || 0) / total) * 100).toFixed(2);
  }

  calculateAvgProfit() {
    const trades = this.agent.recentTrades || [];
    if (trades.length === 0) return '0';
    const profitable = trades.filter(t => t.profit > 0);
    if (profitable.length === 0) return '0';
    const sum = profitable.reduce((acc, t) => acc + t.profit, 0);
    return (sum / profitable.length).toFixed(2);
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.success(`🌐 External API: http://localhost:${this.port}`);
          if (this.apiKey) {
            logger.info(`🔒 API Key authentication enabled`);
          } else {
            logger.warn('⚠️  No API key set - public access!');
          }
          resolve();
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.warn(`Port ${this.port} in use, trying ${this.port + 1}...`);
            this.port++;
            this.start().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
      logger.info('External API stopped');
    }
  }
}
