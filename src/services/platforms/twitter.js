/**
 * Twitter/X Integration Service
 * Post trades, updates, automated content
 */

import axios from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('Twitter');

export class TwitterService {
  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessSecret = process.env.TWITTER_ACCESS_SECRET;

    this.baseUrl = 'https://api.twitter.com/2';

    this.oauth = OAuth({
      consumer: {
        key: this.apiKey,
        secret: this.apiSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function: (base_string, key) => {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });
  }

  async initialize() {
    if (!this.apiKey || !this.accessToken) {
      throw new Error('Twitter credentials not configured');
    }

    logger.success('Twitter service initialized');
  }

  async tweet(alert) {
    try {
      const text = this.formatAlertTweet(alert);
      await this.postTweet(text);
      logger.info('Tweet posted:', text.slice(0, 50) + '...');
    } catch (error) {
      logger.error('Tweet error:', error.message);
    }
  }

  async tweetTrade(message, trade) {
    try {
      const text = this.formatTradeTweet(trade);
      await this.postTweet(text);
      logger.info('Trade tweet posted');
    } catch (error) {
      logger.error('Trade tweet error:', error.message);
    }
  }

  async tweetReport(report) {
    try {
      // Split report into thread if needed
      const tweets = this.splitIntoTweets(report);

      let previousTweetId = null;
      for (const tweet of tweets) {
        const response = await this.postTweet(tweet, previousTweetId);
        previousTweetId = response.data?.id;
      }

      logger.info('Report thread posted');
    } catch (error) {
      logger.error('Report tweet error:', error.message);
    }
  }

  async postTweet(text, replyToId = null) {
    const url = \`\${this.baseUrl}/tweets\`;

    const data = { text };
    if (replyToId) {
      data.reply = { in_reply_to_tweet_id: replyToId };
    }

    const token = {
      key: this.accessToken,
      secret: this.accessSecret
    };

    const authHeader = this.oauth.toHeader(
      this.oauth.authorize({ url, method: 'POST' }, token)
    );

    const response = await axios.post(url, data, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  formatAlertTweet(alert) {
    const emoji = alert.priority === 'high' ? '🚨' : '📢';
    return \`\${emoji} \${alert.title}

\${alert.message}

#Solana #CryptoTrading #DeFi\`;
  }

  formatTradeTweet(trade) {
    const profit = trade.profitPercent?.toFixed(2) || '0.00';
    const emoji = parseFloat(profit) > 20 ? '🚀' : '💰';

    return \`\${emoji} Trade Alert!

Profit: +\${profit}% (+\${trade.profit?.toFixed(4)} SOL)
Amount: \${trade.amount?.toFixed(4)} SOL
Time: \${new Date(trade.timestamp).toLocaleTimeString()}

Another win for the algo! 📈

#SolanaTrading #CryptoBot #DeFi $SOL\`;
  }

  splitIntoTweets(text, maxLength = 280) {
    const tweets = [];
    const lines = text.split('\n');
    let current = '';

    for (const line of lines) {
      if (current.length + line.length + 1 > maxLength) {
        tweets.push(current.trim());
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }

    if (current) {
      tweets.push(current.trim());
    }

    return tweets;
  }

  async getStats() {
    try {
      // Get user info
      const url = \`\${this.baseUrl}/users/me?user.fields=public_metrics\`;

      const token = {
        key: this.accessToken,
        secret: this.accessSecret
      };

      const authHeader = this.oauth.toHeader(
        this.oauth.authorize({ url, method: 'GET' }, token)
      );

      const response = await axios.get(url, {
        headers: authHeader
      });

      return {
        platform: 'twitter',
        followers: response.data?.data?.public_metrics?.followers_count || 0,
        tweets: response.data?.data?.public_metrics?.tweet_count || 0
      };
    } catch (error) {
      logger.error('Get stats error:', error.message);
      return { platform: 'twitter', error: error.message };
    }
  }
}
