/**
 * Trade History Logger - Logs all trades for analysis
 */

import fs from 'fs/promises';
import { Logger } from '../utils/logger.js';

const logger = new Logger('TradeLogger');

export class TradeLogger {
  constructor() {
    this.logPath = './logs/trade-history.json';
    this.dailyLogPath = './logs/daily-summary.json';
    this.trades = [];

    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir('./logs', { recursive: true });
      await this.loadTrades();
    } catch (error) {
      logger.error('Failed to create log directory:', error);
    }
  }

  async logTrade(trade) {
    try {
      const logEntry = {
        id: trade.id || Date.now(),
        timestamp: new Date().toISOString(),
        type: trade.type, // 'open' or 'close'
        token: trade.token,
        amount: trade.amount,
        solAmount: trade.solAmount,
        price: trade.price,
        signal: trade.signal,
        position: trade.position,
        pnl: trade.pnl || 0,
        pnlPercent: trade.pnlPercent || 0,
        reason: trade.reason || '',
        wallet: trade.wallet || 'unknown'
      };

      this.trades.push(logEntry);
      await this.saveTrades();

      logger.info(`📝 Trade logged: ${trade.type} ${trade.token?.slice(0, 8)}...`);

    } catch (error) {
      logger.error('Failed to log trade:', error);
    }
  }

  async saveTrades() {
    try {
      await fs.writeFile(
        this.logPath,
        JSON.stringify(this.trades, null, 2)
      );
    } catch (error) {
      logger.error('Failed to save trades:', error);
    }
  }

  async loadTrades() {
    try {
      const data = await fs.readFile(this.logPath, 'utf-8');
      this.trades = JSON.parse(data);
      logger.success(`✅ Loaded ${this.trades.length} historical trades`);
    } catch {
      this.trades = [];
      logger.info('No trade history found, starting fresh');
    }
  }

  async getDailySummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = this.trades.filter(t => 
      t.timestamp.startsWith(today)
    );

    const opened = todayTrades.filter(t => t.type === 'open').length;
    const closed = todayTrades.filter(t => t.type === 'close');
    const wins = closed.filter(t => t.pnl > 0).length;
    const losses = closed.filter(t => t.pnl < 0).length;
    const totalPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return {
      date: today,
      tradesOpened: opened,
      tradesClosed: closed.length,
      wins,
      losses,
      winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
      totalPnL,
      avgPnL: closed.length > 0 ? totalPnL / closed.length : 0
    };
  }

  async getStats(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentTrades = this.trades.filter(t => 
      new Date(t.timestamp) > cutoff
    );

    const closed = recentTrades.filter(t => t.type === 'close');
    const wins = closed.filter(t => t.pnl > 0);
    const losses = closed.filter(t => t.pnl < 0);

    return {
      period: `${days} days`,
      totalTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalPnL: closed.reduce((sum, t) => sum + (t.pnl || 0), 0),
      avgWin: wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0,
      bestTrade: closed.length > 0 ? Math.max(...closed.map(t => t.pnl)) : 0,
      worstTrade: closed.length > 0 ? Math.min(...closed.map(t => t.pnl)) : 0
    };
  }

  async exportCSV() {
    try {
      const csv = [
        'Timestamp,Type,Token,Amount,SOL,Price,P&L,P&L%,Reason,Wallet',
        ...this.trades.map(t => 
          `${t.timestamp},${t.type},${t.token},${t.amount},${t.solAmount},${t.price},${t.pnl},${t.pnlPercent},${t.reason},${t.wallet}`
        )
      ].join('\n');

      await fs.writeFile('./logs/trade-history.csv', csv);
      logger.success('✅ Exported trades to CSV');

      return './logs/trade-history.csv';
    } catch (error) {
      logger.error('CSV export failed:', error);
      return null;
    }
  }
}
