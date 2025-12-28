/**
 * Performance Tracker - Tracks wallet performance and removes underperformers
 */

import fs from 'fs/promises';
import { Logger } from '../utils/logger.js';

const logger = new Logger('PerformanceTracker');

export class PerformanceTracker {
  constructor() {
    this.performanceData = {};
    this.configPath = './config/smart-wallets.json';
    this.performancePath = './config/wallet-performance.json';
  }

  /**
   * Track a signal from a wallet
   */
  async trackSignal(walletAddress, signal, executed) {
    try {
      if (!this.performanceData[walletAddress]) {
        this.performanceData[walletAddress] = {
          totalSignals: 0,
          executedTrades: 0,
          wins: 0,
          losses: 0,
          totalProfit: 0,
          lastActive: Date.now(),
          added: Date.now()
        };
      }

      const wallet = this.performanceData[walletAddress];
      wallet.totalSignals++;
      wallet.lastActive = Date.now();

      if (executed) {
        wallet.executedTrades++;
      }

      await this.savePerformance();

    } catch (error) {
      logger.error('Failed to track signal:', error);
    }
  }

  /**
   * Track trade result
   */
  async trackTradeResult(walletAddress, profit, profitPercent) {
    try {
      if (!this.performanceData[walletAddress]) return;

      const wallet = this.performanceData[walletAddress];

      if (profitPercent > 0) {
        wallet.wins++;
      } else {
        wallet.losses++;
      }

      wallet.totalProfit += profit;
      wallet.lastActive = Date.now();

      await this.savePerformance();

      logger.info(`📊 Wallet ${walletAddress.slice(0, 8)}: ${wallet.wins}W/${wallet.losses}L`);

    } catch (error) {
      logger.error('Failed to track result:', error);
    }
  }

  /**
   * Get wallet win rate
   */
  getWinRate(walletAddress) {
    const wallet = this.performanceData[walletAddress];
    if (!wallet || wallet.executedTrades === 0) return 0;

    return (wallet.wins / (wallet.wins + wallet.losses)) * 100;
  }

  /**
   * Review and remove underperforming wallets
   */
  async reviewWallets() {
    try {
      logger.info('📊 Reviewing wallet performance...');

      const wallets = await this.loadWallets();
      const walletsToRemove = [];

      for (const wallet of wallets) {
        const performance = this.performanceData[wallet.address];

        if (!performance) continue;

        const totalTrades = performance.wins + performance.losses;
        const winRate = totalTrades > 0 ? (performance.wins / totalTrades) * 100 : 0;
        const daysSinceAdded = (Date.now() - performance.added) / (1000 * 60 * 60 * 24);

        // Remove if:
        // 1. Win rate < 40% after 10+ trades
        // 2. No activity for 7+ days
        // 3. Total profit negative after 20+ trades

        let shouldRemove = false;
        let reason = '';

        if (totalTrades >= 10 && winRate < 40) {
          shouldRemove = true;
          reason = `Low win rate: ${winRate.toFixed(1)}%`;
        }

        if (daysSinceAdded > 7 && performance.totalSignals === 0) {
          shouldRemove = true;
          reason = 'No activity for 7+ days';
        }

        if (totalTrades >= 20 && performance.totalProfit < -0.05) {
          shouldRemove = true;
          reason = `Negative profit: ${performance.totalProfit.toFixed(4)} SOL`;
        }

        if (shouldRemove) {
          walletsToRemove.push({
            address: wallet.address,
            name: wallet.name,
            reason,
            winRate: winRate.toFixed(1),
            trades: totalTrades
          });
        }
      }

      if (walletsToRemove.length > 0) {
        logger.warn(`⚠️  Removing ${walletsToRemove.length} underperforming wallets`);

        for (const wallet of walletsToRemove) {
          logger.info(`🗑️  ${wallet.name}: ${wallet.reason}`);
        }

        await this.removeWallets(walletsToRemove.map(w => w.address));
      } else {
        logger.success('✅ All wallets performing well');
      }

      return walletsToRemove;

    } catch (error) {
      logger.error('Review failed:', error);
      return [];
    }
  }

  /**
   * Add new wallets to config
   */
  async addWallets(newWallets) {
    try {
      const currentWallets = await this.loadWallets();
      const currentAddresses = new Set(currentWallets.map(w => w.address));

      const walletsToAdd = newWallets.filter(w => !currentAddresses.has(w.address));

      if (walletsToAdd.length === 0) {
        logger.info('No new wallets to add');
        return;
      }

      const formatted = walletsToAdd.map(w => ({
        address: w.address,
        name: `Auto-discovered (${w.winRate}% WR)`,
        notes: `Discovered via ${w.discoveredVia || 'scout'}. Win rate: ${w.winRate}%`,
        confidence: w.confidence,
        addedAt: new Date().toISOString()
      }));

      currentWallets.push(...formatted);

      await fs.writeFile(
        this.configPath,
        JSON.stringify(currentWallets, null, 2)
      );

      logger.success(`✅ Added ${walletsToAdd.length} new wallets`);

    } catch (error) {
      logger.error('Failed to add wallets:', error);
    }
  }

  /**
   * Remove wallets from config
   */
  async removeWallets(addresses) {
    try {
      const wallets = await this.loadWallets();
      const filtered = wallets.filter(w => !addresses.includes(w.address));

      await fs.writeFile(
        this.configPath,
        JSON.stringify(filtered, null, 2)
      );

      logger.success(`✅ Removed ${addresses.length} wallets`);

    } catch (error) {
      logger.error('Failed to remove wallets:', error);
    }
  }

  async loadWallets() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async savePerformance() {
    try {
      await fs.writeFile(
        this.performancePath,
        JSON.stringify(this.performanceData, null, 2)
      );
    } catch (error) {
      logger.error('Failed to save performance:', error);
    }
  }

  async loadPerformance() {
    try {
      const data = await fs.readFile(this.performancePath, 'utf-8');
      this.performanceData = JSON.parse(data);
    } catch {
      this.performanceData = {};
    }
  }
}
