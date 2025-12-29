import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("SolScan");

/**
 * SolScan API - Public endpoints for Solana token data
 * NO API KEY REQUIRED for public tier
 */
export class SolScanService {
  constructor() {
    this.baseUrl = "https://public-api.solscan.io";
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.lastRequest = 0;
    this.minDelay = 1000; // 1s between requests
  }

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
   * Get trending tokens from SolScan
   * @param {Object} options - Query options
   * @returns {Array} Token list
   */
  async getTrendingTokens(options = {}) {
    try {
      const { limit = 20, sortBy = "volume", order = "desc" } = options;

      const cacheKey = `trending_${sortBy}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      logger.info("🔍 Fetching trending tokens from SolScan...");

      const response = await axios.get(`${this.baseUrl}/token/trending`, {
        params: {
          limit,
          offset: 0,
        },
        timeout: 10000,
      });

      if (response.data?.data) {
        const tokens = response.data.data
          .map((token) => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            priceUsd: parseFloat(token.price || 0),
            volume24h: parseFloat(token.volume24h || 0),
            priceChange24h: parseFloat(token.priceChange24h || 0),
            marketCap: parseFloat(token.marketCap || 0),
            holders: token.holder || 0,
            source: "solscan",
          }))
          .filter((t) => t.volume24h > 0); // Filter out low activity

        this.setCache(cacheKey, tokens);
        logger.success(`✅ Found ${tokens.length} trending tokens`);
        return tokens;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn("⚠️ SolScan rate limit");
        return [];
      }
      logger.error("SolScan trending failed:", error.message);
      return [];
    }
  }

  /**
   * Get token metadata
   * @param {string} address - Token mint address
   * @returns {Object|null} Token info
   */
  async getTokenInfo(address) {
    try {
      const cacheKey = `token_${address}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();

      const response = await axios.get(`${this.baseUrl}/token/meta`, {
        params: { tokenAddress: address },
        timeout: 10000,
      });

      if (response.data) {
        const data = response.data;
        const token = {
          address,
          symbol: data.symbol,
          name: data.name,
          decimals: data.decimals,
          supply: data.supply,
          holders: data.holder,
          icon: data.icon,
          source: "solscan",
        };

        this.setCache(cacheKey, token);
        return token;
      }

      return null;
    } catch (error) {
      logger.error(
        `SolScan token info failed for ${address.slice(0, 8)}...:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Get token holders
   * @param {string} address - Token mint address
   * @param {number} limit - Max holders to return
   * @returns {Array} Holder list
   */
  async getTokenHolders(address, limit = 50) {
    try {
      const cacheKey = `holders_${address}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();

      const response = await axios.get(`${this.baseUrl}/token/holders`, {
        params: {
          tokenAddress: address,
          limit,
          offset: 0,
        },
        timeout: 15000,
      });

      if (response.data?.data) {
        const holders = response.data.data.map((h) => ({
          owner: h.owner,
          amount: parseFloat(h.amount || 0),
          decimals: h.decimals,
          rank: h.rank,
        }));

        this.setCache(cacheKey, holders);
        return holders;
      }

      return [];
    } catch (error) {
      logger.error("SolScan holders failed:", error.message);
      return [];
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

    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}
