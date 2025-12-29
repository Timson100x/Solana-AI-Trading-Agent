/**
 * Hybrid Provider - Best of Both Worlds!
 * - Birdeye: Token Discovery (trending, new tokens)
 * - Moralis: Token Prices (40K/month = 1.333/day)
 *
 * 🚀 OPTIMAL: 720 scans/day × 20 tokens = 14.4K calls/month = 36% of 40K limit
 */

import { BirdeyeProvider } from "./birdeye-provider.js";
import { MoralisService } from "../services/moralis.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("HybridProvider");

export class HybridProvider {
  constructor() {
    this.birdeye = new BirdeyeProvider();
    this.moralis = new MoralisService();
    this.initialized = false;
    this.stats = {
      birdeyeCalls: 0,
      moralisCalls: 0,
      birdeyeErrors: 0,
      moralisErrors: 0,
      cacheHits: 0,
    };

    // Simple price cache (10s TTL to reduce Moralis calls)
    this.priceCache = new Map();
    this.cacheTTL = 10000; // 10 seconds
  }

  /**
   * Initialize both providers
   */
  async initialize() {
    try {
      logger.info("🔄 Initializing Hybrid Provider...");

      // Test Moralis (critical for pricing)
      await this.moralis.initialize();

      // Birdeye is optional (fallback to Moralis for discovery)
      logger.success(
        "✅ Hybrid Provider ready (Birdeye Discovery + Moralis Prices)"
      );
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error("❌ Hybrid Provider initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Get trending tokens (Birdeye Discovery)
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Token list
   */
  async getTokenList(options = {}) {
    try {
      logger.info(
        `🔍 Discovering tokens with Birdeye (limit: ${options.limit || 20})...`
      );

      const result = await this.birdeye.getTokenList(options);
      this.stats.birdeyeCalls++;

      const tokens = result?.data?.tokens || [];
      logger.success(`✅ Birdeye Discovery: ${tokens.length} tokens found`);

      return tokens;
    } catch (error) {
      this.stats.birdeyeErrors++;
      logger.error("❌ Birdeye Discovery failed:", error.message);

      // If Birdeye fails, we can't discover tokens
      // Return empty array and let caller handle it
      return [];
    }
  }

  /**
   * Get token price (Moralis - 40K/month limit safe!)
   * @param {string} tokenAddress - Token mint address
   * @returns {Promise<number>} Price in USD
   */
  async getTokenPrice(tokenAddress) {
    try {
      // Check cache first (reduce API calls)
      const cached = this.priceCache.get(tokenAddress);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        this.stats.cacheHits++;
        return cached.price;
      }

      // Fetch from Moralis (fast & reliable)
      const result = await this.moralis.getTokenPrice(tokenAddress);
      this.stats.moralisCalls++;

      const price = result?.usdPrice || 0;

      // Cache the result
      this.priceCache.set(tokenAddress, {
        price,
        timestamp: Date.now(),
      });

      return price;
    } catch (error) {
      this.stats.moralisErrors++;
      logger.warn(
        `⚠️ Moralis price failed for ${tokenAddress.slice(
          0,
          8
        )}, trying Birdeye fallback...`
      );

      // Fallback to Birdeye if Moralis fails
      try {
        const birdeyeResult = await this.birdeye.getTokenPrice(tokenAddress);
        this.stats.birdeyeCalls++;
        return birdeyeResult?.data?.value || 0;
      } catch (fallbackError) {
        this.stats.birdeyeErrors++;
        logger.error(
          `❌ Both price sources failed for ${tokenAddress.slice(0, 8)}`
        );
        return 0;
      }
    }
  }

  /**
   * Get enriched token data (Discovery + Price)
   * @param {string} tokenAddress - Token mint address
   * @returns {Promise<Object>} Complete token data
   */
  async getTokenData(tokenAddress) {
    try {
      // Get metadata from Moralis
      const data = await this.moralis.getTokenData(tokenAddress);
      this.stats.moralisCalls++;

      return data;
    } catch (error) {
      logger.error(
        `❌ Token data fetch failed for ${tokenAddress.slice(0, 8)}:`,
        error.message
      );

      // Fallback to Birdeye
      try {
        const price = await this.birdeye.getTokenPrice(tokenAddress);
        this.stats.birdeyeCalls++;

        return {
          address: tokenAddress,
          price: price?.data?.value || 0,
          liquidity: price?.data?.liquidity || 0,
          volume24h: 0,
          priceChange24h: 0,
          source: "birdeye-fallback",
        };
      } catch (fallbackError) {
        this.stats.birdeyeErrors++;
        throw fallbackError;
      }
    }
  }

  /**
   * Get statistics (monitor API usage)
   * @returns {Object} Usage stats
   */
  getStats() {
    const total = this.stats.birdeyeCalls + this.stats.moralisCalls;
    const errors = this.stats.birdeyeErrors + this.stats.moralisErrors;

    return {
      ...this.stats,
      total,
      errors,
      successRate:
        total > 0 ? (((total - errors) / total) * 100).toFixed(1) : 0,
      cacheHitRate:
        total + this.stats.cacheHits > 0
          ? (
              (this.stats.cacheHits / (total + this.stats.cacheHits)) *
              100
            ).toFixed(1)
          : 0,
    };
  }

  /**
   * Print usage statistics
   */
  printStats() {
    const stats = this.getStats();

    logger.info("\n📊 Hybrid Provider Statistics:");
    logger.info(
      `   Birdeye Calls: ${stats.birdeyeCalls} (Errors: ${stats.birdeyeErrors})`
    );
    logger.info(
      `   Moralis Calls: ${stats.moralisCalls} (Errors: ${stats.moralisErrors})`
    );
    logger.info(
      `   Cache Hits: ${stats.cacheHits} (${stats.cacheHitRate}% hit rate)`
    );
    logger.info(`   Success Rate: ${stats.successRate}%`);
    logger.info(`   Total API Calls: ${stats.total}\n`);
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      birdeyeCalls: 0,
      moralisCalls: 0,
      birdeyeErrors: 0,
      moralisErrors: 0,
      cacheHits: 0,
    };
    logger.info("📊 Stats reset");
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const [birdeyeHealth, moralisHealth] = await Promise.allSettled([
        this.birdeye.getTokenList({ limit: 1 }),
        this.moralis.healthCheck(),
      ]);

      const birdeye = birdeyeHealth.status === "fulfilled";
      const moralis =
        moralisHealth.status === "fulfilled" &&
        moralisHealth.value?.status === "healthy";

      return {
        status: moralis ? "healthy" : "degraded", // Moralis is critical
        birdeye: birdeye ? "ok" : "error",
        moralis: moralis ? "ok" : "error",
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }
}

export default HybridProvider;
