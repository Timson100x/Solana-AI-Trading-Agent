import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("SolScan");

/**
 * SolScan API - Public endpoints for Solana token data
 * NO API KEY REQUIRED for public tier
 */
export class SolScanService {
  constructor() {
    // Pro-API für bessere Limits (benötigt Key für volle Features)
    this.baseUrl = "https://pro-api.solscan.io/v1.0";
    this.publicUrl = "https://public-api.solscan.io";
    this.apiKey = process.env.SOLSCAN_API_KEY || null;
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.lastRequest = 0;
    this.minDelay = 1000; // 1s between requests
    this.requestWindow = 60000; // 60s window
    this.maxRequests = 20; // Conservative: 20 per minute
    this.requestCount = 0;
    this.windowStart = Date.now();

    logger.info(
      this.apiKey
        ? "✅ SolScan Pro API Key detected"
        : "ℹ️  SolScan using public endpoints (limited)"
    );
  }

  async rateLimit() {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStart > this.requestWindow) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if at limit
    if (this.requestCount >= this.maxRequests) {
      const waitTime = this.requestWindow - (now - this.windowStart);
      logger.warn(
        `⚠️  SolScan rate limit reached, waiting ${Math.ceil(
          waitTime / 1000
        )}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    // Minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      );
    }

    this.requestCount++;
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

      // SolScan trending endpoint temporarily unavailable (404 error)
      // Fallback: return empty array (other sources like Pump.fun, CoinGecko work)
      logger.warn(
        "⚠️  SolScan trending temporarily disabled (waiting for API fix)"
      );
      return [];

      /* TODO: Re-enable when SolScan fixes trending endpoint
       * Tested endpoints that don't work:
       * - /token/trending (404)
       * - /market/token/trending (404)
       *
       * Other endpoints like /token/meta still work fine
       */
    } catch (error) {
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
