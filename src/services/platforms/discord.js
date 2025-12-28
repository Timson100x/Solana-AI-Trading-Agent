/**
 * Discord Integration Service
 * Webhooks, Embeds, Server Management
 */

import axios from 'axios';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('Discord');

export class DiscordService {
  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    this.devWebhookUrl = process.env.DISCORD_DEV_WEBHOOK_URL;
    this.colors = {
      success: 0x10b981,
      error: 0xef4444,
      warning: 0xf59e0b,
      info: 0x3b82f6
    };
  }

  async initialize() {
    if (!this.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    // Test webhook
    await this.send({
      embeds: [{
        title: '🚀 Bot Started',
        description: 'Solana AI Trading Agent is now online!',
        color: this.colors.success,
        timestamp: new Date().toISOString()
      }]
    });

    logger.success('Discord service initialized');
  }

  async send(data) {
    try {
      await axios.post(this.webhookUrl, data);
    } catch (error) {
      logger.error('Discord send error:', error.message);
    }
  }

  async sendAlert(alert) {
    const embed = {
      title: \`\${this.getAlertEmoji(alert.type)} \${alert.title}\`,
      description: alert.message,
      color: this.getAlertColor(alert.priority),
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Solana AI Trading Bot'
      }
    };

    if (alert.token) {
      embed.fields.push({
        name: '🪙 Token',
        value: \`[\${alert.token.slice(0, 8)}...](https://solscan.io/token/\${alert.token})\`,
        inline: true
      });
    }

    if (alert.confidence) {
      embed.fields.push({
        name: '🎯 Confidence',
        value: \`\${alert.confidence}%\`,
        inline: true
      });
    }

    await this.send({ embeds: [embed] });
  }

  async sendTrade(message, trade) {
    const isWin = trade.profit > 0;
    const color = isWin ? this.colors.success : this.colors.error;

    const embed = {
      title: isWin ? '💰 Profitable Trade!' : '📉 Trade Closed',
      description: message,
      color: color,
      fields: [
        {
          name: '💵 Amount',
          value: \`\${trade.amount?.toFixed(4)} SOL\`,
          inline: true
        },
        {
          name: '📊 P/L',
          value: \`\${trade.profit > 0 ? '+' : ''}\${trade.profit?.toFixed(4)} SOL\`,
          inline: true
        },
        {
          name: '📈 Percent',
          value: \`\${trade.profitPercent?.toFixed(2)}%\`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Solana Trading Bot'
      }
    };

    if (trade.signature) {
      embed.fields.push({
        name: '🔗 Transaction',
        value: \`[View on Solscan](https://solscan.io/tx/\${trade.signature})\`,
        inline: false
      });
    }

    await this.send({ embeds: [embed] });
  }

  async sendReport(report) {
    const embed = {
      title: '📊 Daily Trading Report',
      description: report,
      color: this.colors.info,
      timestamp: new Date().toISOString(),
      footer: {
        text: \`Report generated on \${new Date().toLocaleDateString()}\`
      }
    };

    await this.send({ embeds: [embed] });
  }

  async sendDevAlert(message) {
    if (!this.devWebhookUrl) return;

    try {
      await axios.post(this.devWebhookUrl, {
        content: \`🔧 **Dev Alert**

\${message}\`,
        username: 'Dev Bot'
      });
    } catch (error) {
      logger.error('Dev webhook error:', error.message);
    }
  }

  async getStats() {
    // Discord doesn't provide stats via webhooks
    // Would need bot token for full API access
    return {
      platform: 'discord',
      status: 'active',
      webhook: true
    };
  }

  getAlertEmoji(type) {
    const emojis = {
      opportunity: '🎯',
      trade: '💰',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
      major_win: '🚀'
    };
    return emojis[type] || '📢';
  }

  getAlertColor(priority) {
    const colors = {
      low: this.colors.info,
      medium: this.colors.warning,
      high: this.colors.warning,
      critical: this.colors.error
    };
    return colors[priority] || this.colors.info;
  }
}
