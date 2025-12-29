/**
 * Birdeye API Provider
 * Handles token list and price data fetching
 */

import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("BirdeyeProvider");

export class BirdeyeProvider {
  constructor() {
    this.baseURL = "https://public-api.birdeye.so/defi";
    this.apiKey = process.env.BIRDEYE_API_KEY;

    if (!this.apiKey) {
      logger.warn("⚠️ BIRDEYE_API_KEY not set");
    } else {
      logger.success("✅ Birdeye Provider initialized");
    }
  }

  async getTokenList(options = {}) {
    try {
      const params = {
        sort_by: options.sortBy || "v24hUSD",
        sort_type: options.sortType || "desc",
        offset: options.offset || 0,
        limit: Math.min(options.limit || 50, 50),
        min_liquidity: options.minLiquidity || 100,
      };

      const response = await axios.get(`${this.baseURL}/tokenlist`, {
        params,
        headers: {
          "X-API-KEY": this.apiKey,
          accept: "application/json",
          "x-chain": "solana",
        },
        timeout: 10000,
      });

      // Filter by max liquidity if specified (Birdeye API doesn't support this param)
      let tokens = response.data?.data?.tokens || [];

      if (options.maxLiquidity && tokens.length > 0) {
        tokens = tokens.filter((t) => {
          const liq = t.liquidity || 0;
          return liq <= options.maxLiquidity;
        });
      }

      return {
        ...response.data,
        data: {
          ...response.data?.data,
          tokens: tokens,
        },
      };
    } catch (error) {
      logger.error(
        "Birdeye tokenlist error:",
        error.response?.status,
        error.message
      );
      throw error;
    }
  }

  async getTokenPrice(tokenAddress, checkLiquidity = 100) {
    try {
      const params = {
        address: tokenAddress,
        check_liquidity: checkLiquidity,
        include_liquidity: "true",
      };

      const response = await axios.get(`${this.baseURL}/price`, {
        params,
        headers: {
          "X-API-KEY": this.apiKey,
          accept: "application/json",
          "x-chain": "solana",
        },
        timeout: 10000,
      });

      return response.data.data;
    } catch (error) {
      logger.warn(`Price error for ${tokenAddress.slice(0, 8)}...`);
      return null;
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new BirdeyeProvider();
