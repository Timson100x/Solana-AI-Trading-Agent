import fetch from "node-fetch";
import { Logger } from "../utils/logger.js";

const logger = new Logger();

/**
 * Moralis API Service - Alternative zu Birdeye für Token Data
 * Dokumentation: https://docs.moralis.io/web3-data-api/solana/reference
 */
export class MoralisService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.MORALIS_API_KEY;
    this.baseUrl = "https://solana-gateway.moralis.io";
    this.initialized = false;
  }

  /**
   * Initialize service and test API
   */
  async initialize() {
    try {
      logger.info("🔄 Initializing Moralis API...");

      if (!this.apiKey) {
        throw new Error("MORALIS_API_KEY not configured");
      }

      // Test API with SOL token
      const testResult = await this.getTokenPrice(
        "So11111111111111111111111111111111111111112"
      );

      if (testResult && testResult.usdPrice) {
        logger.success(
          `✅ Moralis API initialized - SOL: $${testResult.usdPrice}`
        );
        this.initialized = true;
        return true;
      }

      throw new Error("API test failed");
    } catch (error) {
      logger.error("❌ Moralis initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Get token price in USD
   * @param {string} tokenMint - Token mint address
   * @returns {Promise<{usdPrice: number, timestamp: number}>}
   */
  async getTokenPrice(tokenMint) {
    try {
      const response = await fetch(
        `${this.baseUrl}/token/mainnet/${tokenMint}/price`,
        {
          headers: {
            "X-API-Key": this.apiKey,
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        usdPrice: parseFloat(data.usdPrice || 0),
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(
        `❌ Moralis price fetch failed for ${tokenMint.slice(0, 8)}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get token metadata (name, symbol, decimals, etc.)
   * @param {string} tokenMint - Token mint address
   * @returns {Promise<Object>}
   */
  async getTokenMetadata(tokenMint) {
    try {
      const response = await fetch(
        `${this.baseUrl}/token/mainnet/${tokenMint}/metadata`,
        {
          headers: {
            "X-API-Key": this.apiKey,
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        mint: data.mint,
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        logoURI: data.logo,
        updateAuthority: data.updateAuthority,
      };
    } catch (error) {
      logger.error(
        `❌ Moralis metadata fetch failed for ${tokenMint.slice(0, 8)}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get wallet token balances
   * @param {string} walletAddress - Wallet public key
   * @returns {Promise<Array>}
   */
  async getWalletTokens(walletAddress) {
    try {
      const response = await fetch(
        `${this.baseUrl}/account/mainnet/${walletAddress}/portfolio`,
        {
          headers: {
            "X-API-Key": this.apiKey,
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return data.tokens || [];
    } catch (error) {
      logger.error(
        `❌ Moralis portfolio fetch failed for ${walletAddress.slice(0, 8)}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get trending tokens (new tokens with trading activity)
   * @param {number} limit - Number of tokens to return
   * @returns {Promise<Array>}
   */
  async getTrendingTokens(limit = 50) {
    try {
      // Moralis doesn't have a direct "trending" endpoint
      // But we can use their NFT/Token endpoints to find active tokens
      logger.warn(
        "⚠️ Moralis getTrendingTokens not fully implemented - using fallback"
      );
      return [];
    } catch (error) {
      logger.error("❌ Moralis trending tokens fetch failed:", error.message);
      throw error;
    }
  }

  /**
   * Get token holders count
   * @param {string} tokenMint - Token mint address
   * @returns {Promise<number>}
   */
  async getHoldersCount(tokenMint) {
    try {
      // This would require additional API calls or websocket subscriptions
      logger.warn("⚠️ Moralis getHoldersCount not implemented yet");
      return 0;
    } catch (error) {
      logger.error("❌ Moralis holders count failed:", error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive token data (combines multiple API calls)
   * @param {string} tokenMint - Token mint address
   * @returns {Promise<Object>}
   */
  async getTokenData(tokenMint) {
    try {
      const [metadata, price] = await Promise.all([
        this.getTokenMetadata(tokenMint).catch(() => null),
        this.getTokenPrice(tokenMint).catch(() => null),
      ]);

      if (!metadata) {
        throw new Error("Failed to fetch token metadata");
      }

      return {
        address: tokenMint,
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        logoURI: metadata.logoURI,
        price: price?.usdPrice || 0,
        // These would need additional API endpoints
        liquidity: 0,
        volume24h: 0,
        priceChange24h: 0,
        marketCap: 0,
        holders: 0,
        source: "moralis",
      };
    } catch (error) {
      logger.error(
        `❌ Moralis token data fetch failed for ${tokenMint.slice(0, 8)}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const testResult = await this.getTokenPrice(
        "So11111111111111111111111111111111111111112"
      );
      return {
        status: "healthy",
        service: "moralis",
        price: testResult?.usdPrice || 0,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        service: "moralis",
        error: error.message,
      };
    }
  }
}

export default MoralisService;
