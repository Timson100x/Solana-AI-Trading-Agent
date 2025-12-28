/**
 * Multi-Platform Integration Manager
 * Discord, Twitter, TikTok, Telegram, Email
 */

import { Logger } from '../utils/logger.js';
import { DiscordService } from './platforms/discord.js';
import { TwitterService } from './platforms/twitter.js';
import { TikTokService } from './platforms/tiktok.js';
import { EmailService } from './platforms/email.js';
import TelegramBot from 'node-telegram-bot-api';

const logger = new Logger('MultiPlatform');

export class MultiPlatformManager {
  constructor(tradingAgent) {
    this.agent = tradingAgent;
    this.platforms = {};

    this.initializePlatforms();
  }

  async initializePlatforms() {
    try {
      // Discord
      if (process.env.DISCORD_WEBHOOK_URL) {
        this.platforms.discord = new DiscordService();
        await this.platforms.discord.initialize();
        logger.success('✅ Discord integrated');
      }

      // Twitter/X
      if (process.env.TWITTER_API_KEY) {
        this.platforms.twitter = new TwitterService();
        await this.platforms.twitter.initialize();
        logger.success('✅ Twitter/X integrated');
      }

      // TikTok (for content posting)
      if (process.env.TIKTOK_ACCESS_TOKEN) {
        this.platforms.tiktok = new TikTokService();
        await this.platforms.tiktok.initialize();
        logger.success('✅ TikTok integrated');
      }

      // Email
      if (process.env.EMAIL_SERVICE) {
        this.platforms.email = new EmailService();
        await this.platforms.email.initialize();
        logger.success('✅ Email integrated');
      }

      // Telegram (already exists)
      if (process.env.TELEGRAM_BOT_TOKEN) {
        logger.success('✅ Telegram already integrated');
      }

      logger.info(\`📱 \${Object.keys(this.platforms).length} platforms active\`);
    } catch (error) {
      logger.error('Platform initialization error:', error);
    }
  }

  async broadcastAlert(alert) {
    const promises = [];

    // Discord
    if (this.platforms.discord) {
      promises.push(this.platforms.discord.sendAlert(alert));
    }

    // Twitter
    if (this.platforms.twitter && alert.priority === 'high') {
      promises.push(this.platforms.twitter.tweet(alert));
    }

    // Email
    if (this.platforms.email && alert.priority === 'critical') {
      promises.push(this.platforms.email.send(alert));
    }

    // TikTok (for major wins)
    if (this.platforms.tiktok && alert.type === 'major_win') {
      promises.push(this.platforms.tiktok.createContent(alert));
    }

    await Promise.allSettled(promises);
  }

  async shareTradeResult(trade) {
    if (trade.profit <= 0) return; // Only share wins

    const message = this.formatTradeMessage(trade);

    const promises = [];

    // Discord - Always share
    if (this.platforms.discord) {
      promises.push(this.platforms.discord.sendTrade(message, trade));
    }

    // Twitter - Only big wins (>20%)
    if (this.platforms.twitter && trade.profitPercent > 20) {
      promises.push(this.platforms.twitter.tweetTrade(message, trade));
    }

    // TikTok - Only massive wins (>50%)
    if (this.platforms.tiktok && trade.profitPercent > 50) {
      promises.push(this.platforms.tiktok.createTradeVideo(trade));
    }

    await Promise.allSettled(promises);
  }

  formatTradeMessage(trade) {
    const emoji = trade.profit > 0 ? '🚀💰' : '📉';
    const percent = trade.profitPercent?.toFixed(2) || '0.00';

    return \`\${emoji} Trade Alert!

Token: \${trade.token?.slice(0, 8)}...
Type: \${trade.type}
Amount: \${trade.amount?.toFixed(4)} SOL
Profit: \${percent}% (\${trade.profit?.toFixed(4)} SOL)
Time: \${new Date(trade.timestamp).toLocaleTimeString()}

#SolanaTrading #CryptoBot #DeFi\`;
  }

  async sendDailyReport() {
    const stats = this.agent.getDailyStats();
    const report = this.formatDailyReport(stats);

    // Send to all platforms
    const promises = [];

    if (this.platforms.discord) {
      promises.push(this.platforms.discord.sendReport(report));
    }

    if (this.platforms.twitter) {
      promises.push(this.platforms.twitter.tweetReport(report));
    }

    if (this.platforms.email) {
      promises.push(this.platforms.email.sendReport(report));
    }

    await Promise.allSettled(promises);
  }

  formatDailyReport(stats) {
    return \`📊 Daily Trading Report

💰 Profit: \${stats.totalProfit?.toFixed(4)} SOL (\${stats.profitPercent?.toFixed(2)}%)
📈 Trades: \${stats.totalTrades} (\${stats.successRate}% success)
✅ Wins: \${stats.wins}
❌ Losses: \${stats.losses}
⏱️ Uptime: \${stats.uptime}

🎯 Best Trade: +\${stats.bestTrade}%
💎 Total Value: \${stats.totalValue} SOL

#SolanaBot #DailyReport #CryptoTrading\`;
  }

  async getEngagementStats() {
    const stats = {};

    if (this.platforms.discord) {
      stats.discord = await this.platforms.discord.getStats();
    }

    if (this.platforms.twitter) {
      stats.twitter = await this.platforms.twitter.getStats();
    }

    if (this.platforms.tiktok) {
      stats.tiktok = await this.platforms.tiktok.getStats();
    }

    return stats;
  }
}
