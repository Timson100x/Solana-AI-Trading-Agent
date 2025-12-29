/**
 * Pump.fun Integration - Memecoin Launch Platform
 * Using pumpdotfun-sdk
 */

import { Logger } from "../utils/logger.js";
import axios from "axios";

const logger = new Logger("PumpFun");

export class PumpFunService {
  constructor() {
    this.apiUrl = "https://frontend-api.pump.fun";

    logger.success("✅ Pump.fun service initialized");
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

      logger.info("🔍 Fetching trending coins from Pump.fun...");

      const response = await axios.get(`${this.apiUrl}/coins`, {
        params: {
          offset: 0,
          limit,
          sort,
          order,
          includeNsfw,
        },
        timeout: 10000,
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

      logger.success(`✅ Found ${coins.length} coins on Pump.fun`);

      return coins;
    } catch (error) {
      logger.error("Pump.fun fetch failed:", error.message);
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
