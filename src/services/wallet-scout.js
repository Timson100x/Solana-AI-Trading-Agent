/**
 * Wallet Scout - Automatically finds profitable wallets using DEXScreener
 * NO API KEY REQUIRED!
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("WalletScout");

export class WalletScout {
  constructor(
    solana,
    gemini,
    dexscreener,
    gmgn,
    pumpfun,
    tokenDiscovery,
    bubblemaps,
    coingecko,
    solscan
  ) {
    this.solana = solana;
    this.gemini = gemini;
    this.dexscreener = dexscreener;
    this.gmgn = gmgn;
    this.pumpfun = pumpfun;
    this.tokenDiscovery = tokenDiscovery;
    this.bubblemaps = bubblemaps;
    this.coingecko = coingecko;
    this.solscan = solscan;
  }

  /**
   * Complete auto-discovery workflow
   */
  async scoutNewWallets() {
    try {
      logger.info("🔍 Starting wallet scouting with multiple sources...");

      let allTokens = [];

      // 1. CoinGecko - Most reliable (NO rate limits on basic endpoints)
      if (this.coingecko) {
        try {
          // Trending coins first
          const geckoTrending = await this.coingecko.getTrendingCoins();
          allTokens.push(...geckoTrending);
          logger.info(`🦎 CoinGecko Trending: ${geckoTrending.length} tokens`);

          // Ecosystem tokens sorted by volume
          const geckoTokens = await this.coingecko.getSolanaTokens({
            limit: 100,
            order: "volume_desc",
          });
          allTokens.push(...geckoTokens);
          logger.info(`🦎 CoinGecko Ecosystem: ${geckoTokens.length} tokens`);
        } catch (error) {
          logger.warn("CoinGecko failed:", error.message);
        }
      }

      // 2. SolScan - Public API
      if (this.solscan) {
        try {
          const solscanTokens = await this.solscan.getTrendingTokens({
            limit: 20,
          });
          allTokens.push(...solscanTokens);
          logger.info(`🔍 SolScan: ${solscanTokens.length} tokens`);
        } catch (error) {
          logger.warn("SolScan failed:", error.message);
        }
      }

      // 3. Get trending tokens from DEXScreener
      try {
        const dexTokens = await this.dexscreener.getTrendingTokens({
          minLiquidity: parseFloat(process.env.MIN_TOKEN_LIQUIDITY || 20000),
          minVolume24h: parseFloat(process.env.MIN_TOKEN_VOLUME || 5000),
          minPriceChange: parseFloat(process.env.MIN_PRICE_CHANGE || 20),
          maxPriceChange: parseFloat(process.env.MAX_PRICE_CHANGE || 800),
          limit: 6,
        });
        allTokens.push(...dexTokens);
        logger.info(`📊 DEXScreener: ${dexTokens.length} tokens`);
      } catch (error) {
        logger.warn("DEXScreener failed:", error.message);
      }

      // 4. Get tokens from GMGN.ai (smart money) - often blocked
      try {
        const gmgnTokens = await this.gmgn.getTrendingTokens({
          limit: 10,
          minLiquidity: parseFloat(process.env.MIN_TOKEN_LIQUIDITY || 20000),
          minVolume: parseFloat(process.env.MIN_TOKEN_VOLUME || 5000),
        });
        allTokens.push(...gmgnTokens);
        logger.info(`💎 GMGN: ${gmgnTokens.length} tokens`);
      } catch (error) {
        logger.warn("GMGN failed:", error.message);
      }

      // 5. Get trending coins from Pump.fun - often down
      try {
        const pumpCoins = await this.pumpfun.getTrendingCoins({
          limit: 15,
          includeNsfw: false,
        });

        // Filter pump.fun coins
        const filtered = this.pumpfun.filterCoins(pumpCoins, {
          minMarketCap: 10000,
          minAge: 5, // at least 5 minutes old
          maxAge: 1440, // max 24 hours
          hasSocial: true, // must have social links
        });

        allTokens.push(...filtered);
        logger.info(`🚀 Pump.fun: ${filtered.length} coins`);
      } catch (error) {
        logger.warn("Pump.fun failed:", error.message);
      }

      // 6. Aggregated discovery (Birdeye, DEX search, Jupiter)
      if (this.tokenDiscovery) {
        try {
          const discovered = await this.tokenDiscovery.discoverTokens(
            this.solana.connection,
            {
              minVolume24h: 300,
            }
          );
          allTokens.push(...discovered);
          logger.info(`🌐 Aggregated discovery: ${discovered.length} tokens`);
        } catch (error) {
          logger.warn("TokenDiscovery failed:", error.message);
        }
      }

      // Deduplicate by address/id
      const seen = new Set();
      allTokens = allTokens.filter((token) => {
        const key =
          token.address || token.pairAddress || token.id || token.symbol;
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (allTokens.length === 0) {
        logger.warn("No trending tokens found from any source");
        return [];
      }

      logger.success(`✅ Found ${allTokens.length} tokens from all sources`);

      const profitableWallets = [];

      // 4. For each token, find early buyers/smart money
      for (const token of allTokens.slice(0, 12)) {
        // Skip native SOL to avoid useless analysis
        if (
          token.address === "So11111111111111111111111111111111111111112" ||
          token.symbol === "SOL"
        ) {
          continue;
        }

        logger.info(
          `📊 Analyzing ${token.symbol || token.address} from ${token.source}`
        );

        try {
          let holders = [];
          let tokenInfo = { ...token };

          // If no pairAddress, try to fetch via DEXScreener
          if (!tokenInfo.pairAddress && tokenInfo.address && this.dexscreener) {
            const details = await this.dexscreener.getTokenDetails(
              tokenInfo.address
            );
            if (details?.pairAddress) {
              tokenInfo = {
                ...tokenInfo,
                pairAddress: details.pairAddress,
                symbol: tokenInfo.symbol || details.symbol,
                name: tokenInfo.name || details.name,
              };
            }
          }

          // Get holders based on source
          if (tokenInfo.source === "gmgn" || tokenInfo.source === "gmgn-new") {
            // Get smart money wallets from GMGN
            holders = await this.gmgn.getSmartMoneyWallets(
              tokenInfo.address,
              10
            );
          } else {
            // Get early buyers from on-chain data
            holders = await this.findEarlyBuyers(tokenInfo);
          }

          // 5. Analyze each holder's trading history
          for (const holder of holders.slice(0, 10)) {
            const analysis = await this.analyzeWallet(holder.address);

            if (analysis.isProfitable) {
              profitableWallets.push({
                address: holder.address,
                winRate: analysis.winRate,
                totalProfit: analysis.totalProfit,
                avgHoldTime: analysis.avgHoldTime,
                discoveredVia: `${token.symbol} (${token.source})`,
                confidence: analysis.confidence,
                tokensBought: holder.tokensBought || 0,
                profitFromToken: holder.profit || holder.pnl || 0,
              });

              logger.success(
                `💎 Found profitable wallet: ${holder.address.slice(
                  0,
                  8
                )}... (${analysis.winRate}% WR)`
              );
            }
          }
        } catch (error) {
          logger.error(`Failed to analyze ${token.symbol}:`, error.message);
        }
      }

      // 6. Remove duplicates and sort by confidence
      const unique = this.removeDuplicates(profitableWallets);
      const sorted = unique.sort((a, b) => b.confidence - a.confidence);

      logger.success(`🎯 Found ${sorted.length} unique profitable wallets`);

      return sorted;
    } catch (error) {
      logger.error("Scouting failed:", error);
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
        logger.warn("No pair address available");
        return [];
      }

      // Get transactions from the pair address
      const transactions = await this.solana.getRecentTransactions(
        pairAddress,
        25
      );

      // Extract unique wallet addresses from transactions
      const walletAddresses = new Set();

      for (const tx of transactions) {
        // Get all accounts involved in the transaction
        if (tx.accounts && tx.accounts.length > 0) {
          tx.accounts.forEach((account) => {
            // Filter out program accounts and system accounts
            if (
              !account.startsWith("11111") &&
              !account.startsWith("Token") &&
              !account.startsWith("Sysvar")
            ) {
              walletAddresses.add(account);
            }
          });
        }
      }

      const holders = Array.from(walletAddresses).map((address) => ({
        address,
        firstSeenBlock: transactions[0]?.slot || 0,
        tokensBought: 0, // Will be calculated if needed
      }));

      logger.info(`📊 Found ${holders.length} potential early buyers`);

      return holders;
    } catch (error) {
      logger.error("Failed to find early buyers:", error);
      return [];
    }
  }

  /**
   * Analyze a wallet's trading performance
   */
  async analyzeWallet(walletAddress) {
    try {
      // Get wallet transaction history
      const transactions = await this.solana.getRecentTransactions(
        walletAddress,
        30
      );

      if (transactions.length < 5) {
        return {
          isProfitable: false,
          confidence: 0,
          reason: "Not enough trading history",
        };
      }

      logger.info(
        `📊 Analyzing ${walletAddress.slice(0, 8)}... (${
          transactions.length
        } txs)`
      );

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

      const isProfitable =
        analysis.winRate >= minWinRate && analysis.confidence >= 60;

      logger.info(
        `📊 ${walletAddress.slice(0, 8)}: ${analysis.winRate}% WR, ${
          analysis.confidence
        }% confidence`
      );

      return {
        isProfitable,
        winRate: analysis.winRate || 0,
        totalProfit: analysis.totalProfit || 0,
        avgHoldTime: analysis.avgHoldTime || 0,
        confidence: analysis.confidence || 0,
        reasoning: analysis.reasoning || "No reasoning provided",
      };
    } catch (error) {
      logger.error(
        `Wallet analysis failed for ${walletAddress}:`,
        error.message
      );
      return {
        isProfitable: false,
        confidence: 0,
        reason: error.message,
      };
    }
  }

  /**
   * Remove duplicate wallets
   */
  removeDuplicates(wallets) {
    const seen = new Set();
    return wallets.filter((wallet) => {
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
      limit: 20,
    });
  }
}
