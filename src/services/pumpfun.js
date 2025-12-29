/**
 * Pump.fun Integration - Memecoin Launch Platform
 * Using pumpdotfun-sdk
 */

import { Logger } from "../utils/logger.js";
import axios from "axios";

const logger = new Logger("PumpFun");

export class PumpFunService {
  constructor() {
    this.endpoints = [
      "https://frontend-api.pump.fun",
      "https://api.pump.fun",
      "https://pumpportal.fun/api",
    ];
    this.currentEndpointIndex = 0;
    this.apiUrl = this.endpoints[0];
    this.cache = new Map();
    this.cacheTTL = 3 * 60 * 1000; // 3 min

    logger.success("✅ Pump.fun service initialized");
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

  /**
   * Get trending coins from pump.fun
   */
  async getTrendingCoins(options = {}) {
    try {
      const {
        limit = 50,
        includeNsfw = false,
        sort = "last_trade_timestamp", // last_trade_timestamp, market_cap, creation_timestamp
        order = "DESC",
      } = options;

      // Check cache
      const cacheKey = `trending_${sort}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      logger.info("🔍 Fetching trending coins from Pump.fun...");

      // Try all endpoints
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        for (let i = 0; i < this.endpoints.length; i++) {
          try {
            const endpoint =
              this.endpoints[
                (this.currentEndpointIndex + i) % this.endpoints.length
              ];

            const response = await axios.get(`${endpoint}/coins`, {
              params: { offset: 0, limit, sort, order, includeNsfw },
              timeout: 15000,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "application/json",
              },
            });

            if (!response.data) {
              logger.warn("No coins found on Pump.fun");
              return [];
            }

            const coins = response.data.map((coin) => ({
              address: coin.mint,
              symbol: coin.symbol,
              name: coin.name,
              description: coin.description,
              imageUri: coin.image_uri,
              metadataUri: coin.metadata_uri,
              twitter: coin.twitter,
              telegram: coin.telegram,
              website: coin.website,
              createdAt: new Date(coin.created_timestamp).getTime(),
              marketCap: parseFloat(coin.usd_market_cap || 0),
              replyCount: parseInt(coin.reply_count || 0),
              lastReply: coin.last_reply,
              nsfw: coin.nsfw || false,
              kingOfTheHill: coin.king_of_the_hill_timestamp ? true : false,
              source: "pumpfun",
            }));

            // Success
            if (i > 0) {
              this.currentEndpointIndex =
                (this.currentEndpointIndex + i) % this.endpoints.length;
            }

            this.setCache(cacheKey, coins);
            logger.success(`✅ Found ${coins.length} coins on Pump.fun`);
            return coins;
          } catch (error) {
            lastError = error;
            if (
              error.response?.status === 530 ||
              error.response?.status >= 500
            ) {
              logger.warn(
                `⚠️ Pump.fun endpoint ${i + 1} server error - trying next...`
              );
            }
          }
        }

        // Wait before retry
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }

      logger.error(`❌ All Pump.fun endpoints failed: ${lastError?.message}`);
      return [];
    } catch (error) {
      logger.error("Pump.fun unexpected error:", error.message);
      return [];
    }
  }

  /**
   * Get king of the hill (top trending)
   */
  async getKingOfTheHill() {
    try {
      logger.info("👑 Fetching King of the Hill...");

      const response = await axios.get(`${this.apiUrl}/coins`, {
        params: {
          offset: 0,
          limit: 10,
          sort: "king_of_the_hill_timestamp",
          order: "DESC",
        },
        timeout: 10000,
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const king = response.data[0];

      return {
        address: king.mint,
        symbol: king.symbol,
        name: king.name,
        description: king.description,
        imageUri: king.image_uri,
        marketCap: parseFloat(king.usd_market_cap || 0),
        kingTimestamp: king.king_of_the_hill_timestamp,
        source: "pumpfun-king",
      };
    } catch (error) {
      logger.error("King of the Hill fetch failed:", error.message);
      return null;
    }
  }

  /**
   * Get recently created coins
   */
  async getNewCoins(limit = 20) {
    try {
      logger.info("🆕 Fetching new coins from Pump.fun...");

      const response = await axios.get(`${this.apiUrl}/coins`, {
        params: {
          offset: 0,
          limit,
          sort: "creation_timestamp",
          order: "DESC",
          includeNsfw: false,
        },
        timeout: 10000,
      });

      if (!response.data) {
        return [];
      }

      const coins = response.data.map((coin) => ({
        address: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
        marketCap: parseFloat(coin.usd_market_cap || 0),
        createdAt: new Date(coin.created_timestamp).getTime(),
        age: Math.floor(
          (Date.now() - new Date(coin.created_timestamp).getTime()) / 60000
        ), // minutes
        source: "pumpfun-new",
      }));

      logger.success(`✅ Found ${coins.length} new coins`);

      return coins;
    } catch (error) {
      logger.error("New coins fetch failed:", error.message);
      return [];
    }
  }

  /**
   * Get coin details
   */
  async getCoinDetails(mintAddress) {
    try {
      const response = await axios.get(`${this.apiUrl}/coins/${mintAddress}`, {
        timeout: 10000,
      });

      if (!response.data) {
        return null;
      }

      const coin = response.data;

      return {
        address: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
        description: coin.description,
        imageUri: coin.image_uri,
        twitter: coin.twitter,
        telegram: coin.telegram,
        website: coin.website,
        marketCap: parseFloat(coin.usd_market_cap || 0),
        bondingCurve: coin.bonding_curve,
        associatedBondingCurve: coin.associated_bonding_curve,
        creator: coin.creator,
        createdAt: new Date(coin.created_timestamp).getTime(),
        replyCount: parseInt(coin.reply_count || 0),
        complete: coin.complete || false,
        virtualSolReserves: parseFloat(coin.virtual_sol_reserves || 0),
        virtualTokenReserves: parseFloat(coin.virtual_token_reserves || 0),
        totalSupply: parseFloat(coin.total_supply || 0),
        source: "pumpfun",
      };
    } catch (error) {
      logger.error(
        `Coin details fetch failed for ${mintAddress}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Filter coins by criteria
   */
  filterCoins(coins, filters = {}) {
    const {
      minMarketCap = 0,
      maxMarketCap = Infinity,
      minAge = 0, // minutes
      maxAge = Infinity,
      hasSocial = false,
    } = filters;

    return coins.filter((coin) => {
      if (coin.marketCap < minMarketCap) return false;
      if (coin.marketCap > maxMarketCap) return false;

      if (coin.age !== undefined) {
        if (coin.age < minAge) return false;
        if (coin.age > maxAge) return false;
      }

      if (hasSocial) {
        if (!coin.twitter && !coin.telegram && !coin.website) {
          return false;
        }
      }

      return true;
    });
  }
}
