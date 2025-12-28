/**
 * Wallet Scout - Automatically finds profitable wallets
 * Analyzes top traders and adds them to tracking list
 */

import axios from 'axios';
import { Logger } from '../utils/logger.js';

const logger = new Logger('WalletScout');

export class WalletScout {
  constructor(solana, gemini) {
    this.solana = solana;
    this.gemini = gemini;
    this.birdeyeApiKey = process.env.BIRDEYE_API_KEY || '';
  }

  /**
   * Find top performing wallets from recent pumped tokens
   */
  async scoutNewWallets() {
    try {
      logger.info('🔍 Scouting for profitable wallets...');

      // 1. Get trending tokens (top gainers last 24h)
      const trendingTokens = await this.getTrendingTokens();

      if (trendingTokens.length === 0) {
        logger.warn('No trending tokens found');
        return [];
      }

      logger.info(`📊 Found ${trendingTokens.length} trending tokens`);

      const profitableWallets = [];

      // 2. For each trending token, find early buyers
      for (const token of trendingTokens.slice(0, 5)) {
        const topTraders = await this.getTopTraders(token.address);

        for (const trader of topTraders) {
          // 3. Analyze wallet performance
          const analysis = await this.analyzeWallet(trader.address);

          if (analysis.isProfitable) {
            profitableWallets.push({
              address: trader.address,
              winRate: analysis.winRate,
              totalProfit: analysis.totalProfit,
              avgHoldTime: analysis.avgHoldTime,
              discoveredVia: token.symbol,
              confidence: analysis.confidence
            });
          }
        }
      }

      logger.success(`✅ Found ${profitableWallets.length} profitable wallets`);

      return profitableWallets.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      logger.error('Scouting failed:', error);
      return [];
    }
  }

  /**
   * Get trending tokens (top gainers)
   */
  async getTrendingTokens() {
    try {
      // Using Birdeye API
      if (this.birdeyeApiKey) {
        const response = await axios.get(
          'https://public-api.birdeye.so/defi/token_trending',
          {
            headers: { 'X-API-KEY': this.birdeyeApiKey },
            params: { 
              sort_by: 'rank',
              sort_type: 'asc',
              offset: 0,
              limit: 10
            }
          }
        );

        return response.data.data.tokens || [];
      }

      // Fallback: Use Helius or manual list
      logger.warn('⚠️  No Birdeye API key, using fallback');
      return [];

    } catch (error) {
      logger.error('Failed to get trending tokens:', error);
      return [];
    }
  }

  /**
   * Get top traders for a specific token
   */
  async getTopTraders(tokenAddress) {
    try {
      // Using Birdeye API
      if (this.birdeyeApiKey) {
        const response = await axios.get(
          `https://public-api.birdeye.so/defi/token_holder`,
          {
            headers: { 'X-API-KEY': this.birdeyeApiKey },
            params: { 
              address: tokenAddress,
              offset: 0,
              limit: 20
            }
          }
        );

        return response.data.data.items || [];
      }

      return [];

    } catch (error) {
      logger.error('Failed to get top traders:', error);
      return [];
    }
  }

  /**
   * Analyze wallet performance
   */
  async analyzeWallet(walletAddress) {
    try {
      // Get wallet transaction history
      const transactions = await this.solana.getRecentTransactions(walletAddress, 50);

      if (transactions.length < 5) {
        return { isProfitable: false, confidence: 0 };
      }

      // Analyze with AI
      const prompt = `Analyze this Solana wallet's trading performance:

Transactions: ${transactions.length}
Recent activity: ${JSON.stringify(transactions.slice(0, 10))}

Calculate:
1. Win rate (% of profitable trades)
2. Average profit per trade
3. Trading frequency
4. Risk level (position sizes)

Return JSON:
{
  "isProfitable": boolean,
  "winRate": number (0-100),
  "totalProfit": number,
  "avgHoldTime": number (hours),
  "riskLevel": "low"|"medium"|"high",
  "confidence": number (0-100),
  "reasoning": string
}`;

      const analysis = await this.gemini.analyze(transactions, prompt);

      logger.info(`📊 Wallet ${walletAddress.slice(0, 8)}: ${analysis.winRate}% win rate`);

      return {
        isProfitable: analysis.winRate > 60,
        winRate: analysis.winRate,
        totalProfit: analysis.totalProfit,
        avgHoldTime: analysis.avgHoldTime,
        confidence: analysis.confidence
      };

    } catch (error) {
      logger.error('Wallet analysis failed:', error);
      return { isProfitable: false, confidence: 0 };
    }
  }
}
