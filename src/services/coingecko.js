import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("CoinGecko");

/**
 * CoinGecko API - Free tier, reliable trending tokens
 * NO API KEY REQUIRED for basic endpoints
 */
export class CoinGeckoService {
  constructor() {
    this.baseUrl = "https://api.coingecko.com/api/v3";
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes (reduce API hits)
    this.lastRequest = 0;
    this.minDelay = 1500; // Rate limit: 1.5s between requests
  }

  /**
   * Rate limiting helper
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      );
    }
    this.lastRequest = Date.now();
  }

  /**
   * Get trending coins (includes Solana tokens)
   * @returns {Array} Trending tokens
   */
  async getTrendingCoins() {
    try {
      const cacheKey = "trending";
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      logger.info("🦎 Fetching trending coins...");

      const response = await axios.get(`${this.baseUrl}/search/trending`, {
        timeout: 10000,
      });

      if (response.data?.coins) {
        const trending = response.data.coins
          .map((item) => item.item)
          .filter((coin) => {
            // Filter for Solana ecosystem tokens
            const isSolana =
              coin.symbol?.toLowerCase().includes("sol") ||
              coin.name?.toLowerCase().includes("solana") ||
              coin.platforms?.solana;
            return isSolana;
          })
          .map((coin) => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            marketCapRank: coin.market_cap_rank,
            thumb: coin.thumb,
            priceChange24h: coin.price_change_percentage_24h?.usd || 0,
            score: coin.score || 0,
            source: "coingecko",
          }));

        this.setCache(cacheKey, trending);
        logger.success(`✅ Found ${trending.length} trending Solana tokens`);
        return trending;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn("⚠️ CoinGecko rate limit - waiting...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute
        return [];
      }
      logger.error("CoinGecko trending failed:", error.message);
      return [];
    }
  }

  /**
   * Get Solana ecosystem tokens by market cap
   * @param {Object} options - Query options
   * @returns {Array} Token list
   */
  async getSolanaTokens(options = {}) {
    try {
      const { limit = 20, order = "market_cap_desc" } = options;

      const cacheKey = `solana_${order}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      logger.info("🦎 Fetching Solana ecosystem tokens...");

      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: "usd",
          category: "solana-ecosystem",
          order,
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: "24h",
        },
        timeout: 15000,
      });

      if (response.data && Array.isArray(response.data)) {
        const tokens = response.data
          .map((coin) => ({
            id: coin.id,
            symbol: coin.symbol?.toUpperCase(),
            name: coin.name,
            address: coin.platforms?.solana || null,
            priceUsd: coin.current_price,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            priceChange24h: coin.price_change_percentage_24h || 0,
            marketCapRank: coin.market_cap_rank,
            source: "coingecko",
          }))
          .filter((t) => t.address); // Only tokens with Solana addresses

        this.setCache(cacheKey, tokens);
        logger.success(`✅ Found ${tokens.length} Solana tokens`);
        return tokens;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn("⚠️ CoinGecko rate limit");
        return [];
      }
      logger.error("CoinGecko markets failed:", error.message);
      return [];
    }
  }

  /**
   * Search for specific token by contract address
   * @param {string} address - Solana token address
   * @returns {Object|null} Token data
   */
  async getTokenByAddress(address) {
    try {
      const cacheKey = `token_${address}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();

      const response = await axios.get(
        `${this.baseUrl}/coins/solana/contract/${address}`,
        {
          timeout: 10000,
        }
      );

      if (response.data) {
        const data = response.data;
        const token = {
          address,
          symbol: data.symbol?.toUpperCase(),
          name: data.name,
          priceUsd: data.market_data?.current_price?.usd || 0,
          marketCap: data.market_data?.market_cap?.usd || 0,
          volume24h: data.market_data?.total_volume?.usd || 0,
          priceChange24h: data.market_data?.price_change_percentage_24h || 0,
          liquidity: data.market_data?.total_value_locked?.usd || 0,
          source: "coingecko",
        };

        this.setCache(cacheKey, token);
        return token;
      }

      return null;
    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn(`Token ${address.slice(0, 8)}... not found on CoinGecko`);
        return null;
      }
      logger.error("CoinGecko token lookup failed:", error.message);
      return null;
    }
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.cacheTTL) {
      return item.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Cleanup old entries
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}
