/**
 * DEXScreener Integration - Auto-discover trending tokens & top traders
 * Free API - No key required!
 */

import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("DEXScreener");

export class DexScreenerService {
  constructor() {
    this.baseUrl = "https://api.dexscreener.com/latest";
    this.solanaChainId = "solana";
    this.cache = new Map();
    this.cacheTTL = 2 * 60 * 1000; // 2 min (DEXScreener updates fast)
    this.lastRequest = 0;
    this.minDelay = 1000; // 1s between requests

    logger.success("✅ DEXScreener service initialized");
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise((r) =>
        setTimeout(r, this.minDelay - timeSinceLastRequest)
      );
    }
    this.lastRequest = Date.now();
  }

  /**
   * Get top trending tokens on Solana
   */
  async getTrendingTokens(options = {}) {
    try {
      const {
        minLiquidity = 50000, // Min $50k liquidity
        minVolume24h = 10000, // Min $10k 24h volume
        minPriceChange = 50, // Min +50% price change
        maxPriceChange = 1000, // Max +1000% (avoid scams)
        limit = 10,
      } = options;

      const cacheKey = `trending_${limit}_${minLiquidity}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      logger.info("🔍 Fetching trending Solana tokens...");

      // Get boosted tokens (trending)
      const response = await axios.get(`${this.baseUrl}/dex/tokens/boosted`, {
        timeout: 15000,
        headers: { Accept: "application/json" },
      });

      if (!response.data || !response.data.tokens) {
        logger.warn("No trending tokens found");
        return [];
      }

      // Filter Solana tokens
      const solanaTokens = response.data.tokens.filter(
        (token) => token.chainId === this.solanaChainId
      );

      // Get detailed info for each token
      const detailedTokens = [];

      for (const token of solanaTokens.slice(0, 20)) {
        try {
          const details = await this.getTokenDetails(token.tokenAddress);

          if (
            details &&
            this.meetsFilter(details, {
              minLiquidity,
              minVolume24h,
              minPriceChange,
              maxPriceChange,
            })
          ) {
            detailedTokens.push(details);
          }
        } catch (error) {
          logger.warn(`Failed to get details for ${token.tokenAddress}`);
        }
      }

      const sorted = detailedTokens
        .sort((a, b) => b.priceChange24h - a.priceChange24h)
        .slice(0, limit);

      this.setCache(cacheKey, sorted);
      logger.success(`✅ Found ${sorted.length} trending tokens`);

      return sorted;
    } catch (error) {
      logger.error("Failed to get trending tokens:", error);
      return [];
    }
  }

  /**
   * Get detailed token information
   */
  async getTokenDetails(tokenAddress) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/dex/tokens/${tokenAddress}`
      );

      if (
        !response.data ||
        !response.data.pairs ||
        response.data.pairs.length === 0
      ) {
        return null;
      }

      // Get the most liquid pair
      const pairs = response.data.pairs
        .filter((p) => p.chainId === this.solanaChainId)
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

      if (pairs.length === 0) return null;

      const mainPair = pairs[0];

      return {
        address: tokenAddress,
        symbol: mainPair.baseToken.symbol,
        name: mainPair.baseToken.name,
        pairAddress: mainPair.pairAddress,
        dex: mainPair.dexId,
        priceUsd: parseFloat(mainPair.priceUsd || 0),
        priceChange24h: parseFloat(mainPair.priceChange?.h24 || 0),
        volume24h: parseFloat(mainPair.volume?.h24 || 0),
        liquidity: parseFloat(mainPair.liquidity?.usd || 0),
        marketCap: parseFloat(mainPair.fdv || 0),
        txns24h: mainPair.txns?.h24 || {},
        createdAt: mainPair.pairCreatedAt,
        url: mainPair.url,
        // Additional useful data
        priceChange1h: parseFloat(mainPair.priceChange?.h1 || 0),
        priceChange6h: parseFloat(mainPair.priceChange?.h6 || 0),
        buys24h: mainPair.txns?.h24?.buys || 0,
        sells24h: mainPair.txns?.h24?.sells || 0,
      };
    } catch (error) {
      logger.error(
        `Failed to get token details for ${tokenAddress}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Check if token meets filter criteria
   */
  meetsFilter(token, filters) {
    const { minLiquidity, minVolume24h, minPriceChange, maxPriceChange } =
      filters;

    // Basic checks
    if (token.liquidity < minLiquidity) {
      logger.info(
        `${token.symbol}: Liquidity too low ($${token.liquidity.toFixed(0)})`
      );
      return false;
    }

    if (token.volume24h < minVolume24h) {
      logger.info(
        `${token.symbol}: Volume too low ($${token.volume24h.toFixed(0)})`
      );
      return false;
    }

    if (token.priceChange24h < minPriceChange) {
      logger.info(
        `${token.symbol}: Price change too low (${token.priceChange24h.toFixed(
          1
        )}%)`
      );
      return false;
    }

    if (token.priceChange24h > maxPriceChange) {
      logger.warn(
        `${
          token.symbol
        }: Price change suspiciously high (${token.priceChange24h.toFixed(1)}%)`
      );
      return false;
    }

    // Safety checks
    if (token.buys24h > 0 && token.sells24h > 0) {
      const buyToSellRatio = token.buys24h / token.sells24h;

      // Too many sells compared to buys = dump
      if (buyToSellRatio < 0.5) {
        logger.warn(
          `${token.symbol}: Too many sellers (ratio: ${buyToSellRatio.toFixed(
            2
          )})`
        );
        return false;
      }
    }

    logger.success(`${token.symbol}: Passed all filters ✅`);
    return true;
  }

  /**
   * Get top token holders (early buyers)
   */
  async getTopHolders(tokenAddress, limit = 20) {
    try {
      // DEXScreener doesn't provide holder info directly
      // But we can infer early buyers from the pair's transaction history

      logger.info(`🔍 Analyzing ${tokenAddress} for early buyers...`);

      const details = await this.getTokenDetails(tokenAddress);

      if (!details) {
        return [];
      }

      // Get pair address for on-chain analysis
      return {
        tokenAddress,
        pairAddress: details.pairAddress,
        dex: details.dex,
        symbol: details.symbol,
        createdAt: details.createdAt,
        // These will be filled by Solana service
        topHolders: [],
      };
    } catch (error) {
      logger.error("Failed to get top holders:", error);
      return null;
    }
  }

  /**
   * Search tokens by various criteria
   */
  async searchTokens(query) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/dex/search?q=${encodeURIComponent(query)}`
      );

      if (!response.data || !response.data.pairs) {
        return [];
      }

      return response.data.pairs
        .filter((p) => p.chainId === this.solanaChainId)
        .map((p) => ({
          address: p.baseToken.address,
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          priceUsd: parseFloat(p.priceUsd || 0),
          liquidity: parseFloat(p.liquidity?.usd || 0),
        }));
    } catch (error) {
      logger.error("Search failed:", error);
      return [];
    }
  }

  /**
   * Get token profile with social links
   */
  async getTokenProfile(tokenAddress) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/dex/tokens/${tokenAddress}`
      );

      if (
        !response.data ||
        !response.data.pairs ||
        response.data.pairs.length === 0
      ) {
        return null;
      }

      const pair = response.data.pairs[0];
      const info = pair.info || {};

      return {
        address: tokenAddress,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        description: info.description,
        websites: info.websites || [],
        socials: info.socials || [],
        imageUrl: info.imageUrl,
        header: info.header,
      };
    } catch (error) {
      logger.error("Failed to get profile:", error);
      return null;
    }
  }
}

// Export default instance
export default new DexScreenerService();
