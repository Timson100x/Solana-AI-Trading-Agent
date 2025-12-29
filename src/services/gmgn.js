/**
 * GMGN.ai Integration - Smart Money Tracking & Token Discovery
 * API: https://gmgn.ai (Free, no key required)
 */

import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("GMGN");

export class GmgnService {
  constructor() {
    this.baseUrl = "https://gmgn.ai/defi/quotation/v1";
    this.solanaChain = "sol";

    logger.success("✅ GMGN.ai service initialized");
  }

  /**
   * Get trending tokens with smart money activity
   */
  async getTrendingTokens(options = {}) {
    try {
      const {
        limit = 20,
        minLiquidity = 20000,
        minVolume = 5000,
        orderBy = "volume_24h_usd", // volume_24h_usd, liquidity_usd, smart_money_amount
      } = options;

      logger.info("🔍 Fetching smart money tokens from GMGN...");

      // Get token list with smart money activity
      const response = await axios.get(
        `${this.baseUrl}/tokens/top_tokens/${this.solanaChain}`,
        {
          params: {
            limit,
            orderby: orderBy,
            direction: "desc",
          },
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.data || !response.data.data.rank) {
        logger.warn("No tokens found on GMGN");
        return [];
      }

      const tokens = response.data.data.rank;

      // Filter and format tokens
      const filtered = tokens
        .filter((token) => {
          const liquidity = parseFloat(token.liquidity || 0);
          const volume = parseFloat(token.volume_24h || 0);

          return liquidity >= minLiquidity && volume >= minVolume;
        })
        .map((token) => ({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          priceUsd: parseFloat(token.price || 0),
          priceChange24h: parseFloat(token.price_change_24h || 0),
          volume24h: parseFloat(token.volume_24h || 0),
          liquidity: parseFloat(token.liquidity || 0),
          marketCap: parseFloat(token.market_cap || 0),
          holders: parseInt(token.holder_count || 0),
          smartMoney: {
            amount: parseFloat(token.smart_money_amount || 0),
            count: parseInt(token.smart_money_count || 0),
          },
          createdAt: token.created_timestamp,
          source: "gmgn",
        }));

      logger.success(`✅ Found ${filtered.length} tokens on GMGN`);

      return filtered;
    } catch (error) {
      logger.error("GMGN fetch failed:", error.message);
      return [];
    }
  }

  /**
   * Get smart money wallets trading a specific token
   */
  async getSmartMoneyWallets(tokenAddress, limit = 20) {
    try {
      logger.info(`🔍 Getting smart money for ${tokenAddress.slice(0, 8)}...`);

      const response = await axios.get(
        `${this.baseUrl}/smartmoney/sol/wallets/${tokenAddress}`,
        {
          params: { limit },
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.data) {
        return [];
      }

      const wallets = response.data.data.map((wallet) => ({
        address: wallet.address,
        pnl: parseFloat(wallet.pnl || 0),
        winRate: parseFloat(wallet.win_rate || 0),
        totalTrades: parseInt(wallet.total_trades || 0),
        totalProfit: parseFloat(wallet.total_profit_usd || 0),
        tags: wallet.tags || [],
        source: "gmgn-smart-money",
      }));

      logger.success(`✅ Found ${wallets.length} smart money wallets`);

      return wallets;
    } catch (error) {
      logger.error("Smart money fetch failed:", error.message);
      return [];
    }
  }

  /**
   * Get new token launches
   */
  async getNewTokens(limit = 20) {
    try {
      logger.info("🔍 Fetching new token launches...");

      const response = await axios.get(
        `${this.baseUrl}/tokens/latest/${this.solanaChain}`,
        {
          params: { limit },
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.data) {
        return [];
      }

      const tokens = response.data.data.map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        priceUsd: parseFloat(token.price || 0),
        liquidity: parseFloat(token.liquidity || 0),
        volume24h: parseFloat(token.volume_24h || 0),
        createdAt: token.created_timestamp,
        age: Math.floor((Date.now() - token.created_timestamp * 1000) / 60000), // minutes
        source: "gmgn-new",
      }));

      logger.success(`✅ Found ${tokens.length} new tokens`);

      return tokens;
    } catch (error) {
      logger.error("New tokens fetch failed:", error.message);
      return [];
    }
  }

  /**
   * Get token details with full data
   */
  async getTokenDetails(tokenAddress) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/tokens/sol/${tokenAddress}`,
        {
          timeout: 10000,
        }
      );

      if (!response.data || !response.data.data) {
        return null;
      }

      const token = response.data.data;

      return {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        priceUsd: parseFloat(token.price || 0),
        priceChange24h: parseFloat(token.price_change_24h || 0),
        volume24h: parseFloat(token.volume_24h || 0),
        liquidity: parseFloat(token.liquidity || 0),
        marketCap: parseFloat(token.market_cap || 0),
        holders: parseInt(token.holder_count || 0),
        rugPullRisk: token.rug_pull_risk || "unknown",
        topHolders: token.top_holders || [],
        smartMoney: {
          amount: parseFloat(token.smart_money_amount || 0),
          count: parseInt(token.smart_money_count || 0),
          wallets: token.smart_money_wallets || [],
        },
        source: "gmgn",
      };
    } catch (error) {
      logger.error(
        `Token details fetch failed for ${tokenAddress}:`,
        error.message
      );
      return null;
    }
  }
}
