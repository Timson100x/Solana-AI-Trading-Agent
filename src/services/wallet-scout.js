/**
 * Wallet Scout - Automatically finds profitable wallets using DEXScreener
 * NO API KEY REQUIRED!
 */

import { Logger } from '../utils/logger.js';

const logger = new Logger('WalletScout');

export class WalletScout {
  constructor(solana, gemini, dexscreener) {
    this.solana = solana;
    this.gemini = gemini;
    this.dexscreener = dexscreener;
  }

  /**
   * Complete auto-discovery workflow
   */
  async scoutNewWallets() {
    try {
      logger.info('🔍 Starting wallet scouting with DEXScreener...');

      // 1. Get trending tokens from DEXScreener
      const trendingTokens = await this.dexscreener.getTrendingTokens({
        minLiquidity: parseFloat(process.env.MIN_TOKEN_LIQUIDITY || 50000),
        minVolume24h: parseFloat(process.env.MIN_TOKEN_VOLUME || 10000),
        minPriceChange: parseFloat(process.env.MIN_PRICE_CHANGE || 50),
        maxPriceChange: parseFloat(process.env.MAX_PRICE_CHANGE || 1000),
        limit: 10
      });

      if (trendingTokens.length === 0) {
        logger.warn('No trending tokens found');
        return [];
      }

      logger.success(`✅ Found ${trendingTokens.length} trending tokens`);

      const profitableWallets = [];

      // 2. For each trending token, find early buyers
      for (const token of trendingTokens) {
        logger.info(`📊 Analyzing ${token.symbol} (+${token.priceChange24h.toFixed(1)}%)`);

        try {
          // Get top holders/early buyers
          const holders = await this.findEarlyBuyers(token);

          // 3. Analyze each holder's trading history
          for (const holder of holders.slice(0, 10)) {
            const analysis = await this.analyzeWallet(holder.address);

            if (analysis.isProfitable) {
              profitableWallets.push({
                address: holder.address,
                winRate: analysis.winRate,
                totalProfit: analysis.totalProfit,
                avgHoldTime: analysis.avgHoldTime,
                discoveredVia: token.symbol,
                confidence: analysis.confidence,
                tokensBought: holder.tokensBought || 0,
                profitFromToken: holder.profit || 0
              });

              logger.success(`💎 Found profitable wallet: ${holder.address.slice(0, 8)}... (${analysis.winRate}% WR)`);
            }
          }
        } catch (error) {
          logger.error(`Failed to analyze ${token.symbol}:`, error.message);
        }
      }

      // 4. Remove duplicates and sort by confidence
      const unique = this.removeDuplicates(profitableWallets);
      const sorted = unique.sort((a, b) => b.confidence - a.confidence);

      logger.success(`🎯 Found ${sorted.length} unique profitable wallets`);

      return sorted;

    } catch (error) {
      logger.error('Scouting failed:', error);
      return [];
    }
  }

  /**
   * Find early buyers of a token
   */
  async findEarlyBuyers(token) {
    try {
      logger.info(`🔍 Finding early buyers of ${token.symbol}...`);

      // Get recent transactions for the token's pair
      // This finds wallets that interacted with the token
      const pairAddress = token.pairAddress;

      if (!pairAddress) {
        logger.warn('No pair address available');
        return [];
      }

      // Get transactions from the pair address
      const transactions = await this.solana.getRecentTransactions(pairAddress, 100);

      // Extract unique wallet addresses from transactions
      const walletAddresses = new Set();

      for (const tx of transactions) {
        // Get all accounts involved in the transaction
        if (tx.accounts && tx.accounts.length > 0) {
          tx.accounts.forEach(account => {
            // Filter out program accounts and system accounts
            if (!account.startsWith('11111') && 
                !account.startsWith('Token') &&
                !account.startsWith('Sysvar')) {
              walletAddresses.add(account);
            }
          });
        }
      }

      const holders = Array.from(walletAddresses).map(address => ({
        address,
        firstSeenBlock: transactions[0]?.slot || 0,
        tokensBought: 0 // Will be calculated if needed
      }));

      logger.info(`📊 Found ${holders.length} potential early buyers`);

      return holders;

    } catch (error) {
      logger.error('Failed to find early buyers:', error);
      return [];
    }
  }

  /**
   * Analyze a wallet's trading performance
   */
  async analyzeWallet(walletAddress) {
    try {
      // Get wallet transaction history
      const transactions = await this.solana.getRecentTransactions(walletAddress, 50);

      if (transactions.length < 5) {
        return { 
          isProfitable: false, 
          confidence: 0,
          reason: 'Not enough trading history'
        };
      }

      logger.info(`📊 Analyzing ${walletAddress.slice(0, 8)}... (${transactions.length} txs)`);

      // Use AI to analyze trading patterns
      const prompt = `Analyze this Solana wallet's trading performance:

Wallet: ${walletAddress}
Recent Transactions: ${transactions.length}
Latest Activity: ${new Date(transactions[0].timestamp).toISOString()}

Transaction Sample:
${JSON.stringify(transactions.slice(0, 10), null, 2)}

Calculate and return JSON:
{
  "isProfitable": boolean,
  "winRate": number (0-100),
  "totalProfit": number (estimated SOL),
  "avgHoldTime": number (hours),
  "tradingFrequency": "high"|"medium"|"low",
  "riskLevel": "low"|"medium"|"high",
  "confidence": number (0-100),
  "reasoning": string (brief explanation)
}

Focus on:
- Frequency of profitable trades
- Speed of entries (early or late?)
- Token selection (quality projects?)
- Risk management (position sizes)`;

      const analysis = await this.gemini.analyze(transactions, prompt);

      const minWinRate = parseInt(process.env.MIN_WALLET_WIN_RATE || 60);

      const isProfitable = analysis.winRate >= minWinRate && 
                          analysis.confidence >= 60;

      logger.info(`📊 ${walletAddress.slice(0, 8)}: ${analysis.winRate}% WR, ${analysis.confidence}% confidence`);

      return {
        isProfitable,
        winRate: analysis.winRate || 0,
        totalProfit: analysis.totalProfit || 0,
        avgHoldTime: analysis.avgHoldTime || 0,
        confidence: analysis.confidence || 0,
        reasoning: analysis.reasoning || 'No reasoning provided'
      };

    } catch (error) {
      logger.error(`Wallet analysis failed for ${walletAddress}:`, error.message);
      return { 
        isProfitable: false, 
        confidence: 0,
        reason: error.message
      };
    }
  }

  /**
   * Remove duplicate wallets
   */
  removeDuplicates(wallets) {
    const seen = new Set();
    return wallets.filter(wallet => {
      if (seen.has(wallet.address)) {
        return false;
      }
      seen.add(wallet.address);
      return true;
    });
  }

  /**
   * Quick scout - just get trending tokens
   */
  async getTrendingTokensOnly() {
    return await this.dexscreener.getTrendingTokens({
      minLiquidity: 50000,
      minVolume24h: 10000,
      minPriceChange: 50,
      limit: 20
    });
  }
}
