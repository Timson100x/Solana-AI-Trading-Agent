/**
 * Web Dashboard API - Professional Trading Interface
 * ElizaOS V2 Powered
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Logger } from "./src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = new Logger("WebAPI");

export class WebDashboard {
  constructor(tradingAgent) {
    this.agent = tradingAgent;
    this.app = express();
    this.port = parseInt(process.env.API_PORT || process.env.WEB_PORT || 3000);

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "public")));

    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: Date.now(),
        uptime: process.uptime(),
        version: "2.1.0",
      });
    });

    // System stats
    this.app.get("/api/stats", async (req, res) => {
      try {
        const stats = {
          system: {
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage(),
            version: "2.1.0-ElizaOS-V2",
          },
          trading: this.agent.tradingStats || {
            totalSignals: 0,
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
          },
          jupiter: this.agent.jupiter?.getStats() || {},
          wallet: {
            publicKey: this.agent.wallet?.getPublicKey()?.toBase58() || "N/A",
            balance: await this.getWalletBalance(),
          },
          ai: this.agent.aiStats || {
            totalRequests: 0,
            avgResponseTime: 0,
          },
          performance: {
            successRate: this.calculateSuccessRate(),
            avgProfit: this.calculateAvgProfit(),
            uptime: this.formatUptime(process.uptime()),
          },
        };

        res.json(stats);
      } catch (error) {
        logger.error("Stats error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Recent trades
    this.app.get("/api/trades", (req, res) => {
      try {
        const trades = this.agent.recentTrades || [];
        res.json({
          total: trades.length,
          trades: trades.slice(-50), // Last 50 trades
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Active positions
    this.app.get("/api/positions", (req, res) => {
      try {
        const positions = this.agent.activePositions || [];
        res.json({
          total: positions.length,
          positions,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Recent alerts
    this.app.get("/api/alerts", (req, res) => {
      try {
        const alerts = this.agent.recentAlerts || [];
        res.json({
          total: alerts.length,
          alerts: alerts.slice(-20), // Last 20 alerts
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Configuration
    this.app.get("/api/config", (req, res) => {
      try {
        res.json({
          tradingEnabled: process.env.TRADING_ENABLED === "true",
          minConfidence: parseFloat(process.env.MIN_CONFIDENCE || 75),
          maxTradeAmount: parseFloat(process.env.MAX_TRADE_AMOUNT || 0.1),
          slippage: parseInt(process.env.SLIPPAGE_BPS || 100),
          stopLoss: parseFloat(process.env.STOP_LOSS_PERCENTAGE || 15),
          takeProfit: parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || 30),
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve dashboard
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // 404
    this.app.use((req, res) => {
      res.status(404).json({ error: "Not found" });
    });
  }

  async getWalletBalance() {
    try {
      if (!this.agent.wallet) return 0;
      return await this.agent.wallet.getBalance();
    } catch {
      return 0;
    }
  }

  calculateSuccessRate() {
    const stats = this.agent.tradingStats;
    if (!stats) return 0;
    const total = stats.successfulTrades + stats.failedTrades;
    if (total === 0) return 0;
    return ((stats.successfulTrades / total) * 100).toFixed(2);
  }

  calculateAvgProfit() {
    const trades = this.agent.recentTrades || [];
    if (trades.length === 0) return 0;
    const profitable = trades.filter((t) => t.profit > 0);
    if (profitable.length === 0) return 0;
    const sum = profitable.reduce((acc, t) => acc + t.profit, 0);
    return (sum / profitable.length).toFixed(2);
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.success(`🌐 Web Dashboard: http://localhost:${this.port}`);
          logger.info(`📊 API: http://localhost:${this.port}/api/stats`);
          resolve();
        });

        this.server.on("error", (error) => {
          if (error.code === "EADDRINUSE") {
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
      await new Promise((resolve) => this.server.close(resolve));
      logger.info("Web dashboard stopped");
    }
  }
}
