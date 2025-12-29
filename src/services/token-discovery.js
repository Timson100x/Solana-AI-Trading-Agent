/**
 * Token Discovery Aggregator - Multi-source token finder
 * Combines: DEXScreener, GMGN, Pump.fun, Birdeye, Jupiter
 */

import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("TokenDiscovery");

export class TokenDiscoveryService {
  constructor(bubblemaps = null, coingecko = null, solscan = null) {
    this.sources = {
      birdeye: "https://public-api.birdeye.so",
      dexscreener: "https://api.dexscreener.com/latest",
      jupiter: "https://cache.jup.ag/tokens", // ✅ CDN endpoint (faster & more reliable)
    };
    this.bubblemaps = bubblemaps;
    this.coingecko = coingecko;
    this.solscan = solscan;
    
    // Rate limiting
    this.lastBirdeyeRequest = 0;
    this.birdeyeMinDelay = 2000; // 2s between requests
    this.birdeyeRequestCount = 0;
    this.birdeyeResetTime = Date.now() + 60000; // Reset every minute
    
    // Caching
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 min

    logger.success("✅ Token Discovery initialized");
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

  async rateLimitBirdeye() {
    // Reset counter every minute
    if (Date.now() > this.birdeyeResetTime) {
      this.birdeyeRequestCount = 0;
      this.birdeyeResetTime = Date.now() + 60000;
    }
    
    // Max 30 requests per minute
    if (this.birdeyeRequestCount >= 30) {
      const waitTime = this.birdeyeResetTime - Date.now();
      logger.warn(`⚠️ Birdeye rate limit - waiting ${Math.ceil(waitTime/1000)}s`);
      await new Promise(r => setTimeout(r, waitTime));
      this.birdeyeRequestCount = 0;
      this.birdeyeResetTime = Date.now() + 60000;
    }
    
    // Delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastBirdeyeRequest;
    if (timeSinceLastRequest < this.birdeyeMinDelay) {
      await new Promise(r => setTimeout(r, this.birdeyeMinDelay - timeSinceLastRequest));
    }
    
    this.lastBirdeyeRequest = Date.now();
    this.birdeyeRequestCount++;
  }

  async birdeyeRequest(path, params = {}) {
    await this.rateLimitBirdeye();
    
    try {
      const response = await axios.get(`${this.sources.birdeye}${path}`, {
        params,
        headers: {
          "X-API-KEY": process.env.BIRDEYE_API_KEY || "public",
          accept: "application/json",
          "x-chain": "solana",
        },
        timeout: 15000, // Increased timeout
      });

      if (!response.data) {
        throw new Error("Empty Birdeye response");
      }

      if (response.data.success === false) {
        throw new Error(response.data.message || "Birdeye request failed");
      }

      return response.data;
    } catch (error) {
      const status = error.response?.status;

      if (status === 404) {
        logger.warn(`Birdeye endpoint not found: ${path}`);
      } else if (status === 400) {
        const msg = error.response?.data?.message || error.message;
        logger.warn(`Birdeye bad request: ${msg}`);
      } else {
        logger.warn("Birdeye request failed:", error.message);
      }

      throw error;
    }
  }

  /**
   * Get trending tokens from Birdeye (more reliable than GMGN)
   */
  async getBirdeyeTrending(options = {}) {
    try {
      const {
        limit = 20,
        sortBy = "v24hUSD", // v24hUSD, liquidity, v24hChangePercent
        sortType = "desc",
        minLiquidity = 100,
        offset = 0,
      } = options;

      logger.info("🦅 Fetching from Birdeye...");

      const data = await this.birdeyeRequest("/defi/tokenlist", {
        sortBy: sortBy, // ✅ Correct parameter name (was sort_by)
        sortType: sortType, // ✅ Correct parameter name (was sort_type)
        offset,
        limit: Math.min(limit, 50),
        minLiquidity: minLiquidity, // ✅ Correct parameter name
      });

      const tokens = data.data?.tokens || data.data?.items || [];

      return tokens.map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        priceUsd: parseFloat(token.price || 0),
        priceChange24h: parseFloat(
          token.priceChange24h ||
            token.price_change_24h_percent ||
            token.v24hChangePercent ||
            0
        ),
        volume24h: parseFloat(token.volume24hUSD || token.v24hUSD || 0),
        liquidity: parseFloat(token.liquidity || token.liquidityUsd || 0),
        marketCap: parseFloat(token.mc || token.market_cap || 0),
        source: "birdeye",
      }));
    } catch (error) {
      logger.warn("Birdeye fetch failed:", error.message);
      return [];
    }
  }

  async getBirdeyeTokenPrice(address, { checkLiquidity = 100 } = {}) {
    try {
      const data = await this.birdeyeRequest("/defi/price", {
        address,
        check_liquidity: checkLiquidity,
        include_liquidity: true,
        ui_amount_mode: "raw",
      });

      const price = data.data || {};

      return {
        address,
        priceUsd: parseFloat(price.value ?? 0),
        liquidity: parseFloat(price.liquidity ?? 0),
        priceChange24h: parseFloat(
          price.priceChange24h ?? price.priceChange24hPercent ?? 0
        ),
        updateUnixTime: price.updateUnixTime,
      };
    } catch (error) {
      logger.warn("Birdeye price fetch failed:", error.message);
      return null;
    }
  }

  /**
   * Get all verified tokens from Jupiter
   */
  async getJupiterTokens() {
    try {
      const cacheKey = 'jupiter_tokens';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      logger.info("🪐 Fetching from Jupiter...");

      // Try multiple CDN endpoints
      const endpoints = [
        `${this.sources.jupiter}/strict`,
        `${this.sources.jupiter}`,
        "https://token.jup.ag/strict",
        "https://tokens.jup.ag/tokens?tags=verified",
      ];
      
      let lastError;
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
            },
          });

      if (!response.data) {
        return [];
      }

      // Return only tokens with high liquidity
      return response.data
        .filter((token) => token.tags && token.tags.includes("verified"))
        .map((token) => ({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          source: "jupiter-verified",
        }));
    } catch (error) {
      logger.warn("Jupiter fetch failed:", error.message);
      return [];
    }
  }

  /**
   * Scan recent token creations on Solana
   */
  async getRecentTokenCreations(connection, limit = 50) {
    try {
      logger.info("🔍 Scanning blockchain for new tokens...");

      // Get recent program logs for token creation
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Token Program
        { limit }
      );

      const recentTokens = [];

      for (const sig of signatures.slice(0, 20)) {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) continue;

          // Look for token creation
          const instructions = tx.transaction.message.instructions;

          for (const ix of instructions) {
            if (
              ix.program === "spl-token" &&
              ix.parsed?.type === "initializeMint"
            ) {
              const mint = ix.parsed.info.mint;

              recentTokens.push({
                address: mint,
                signature: sig.signature,
                blockTime: sig.blockTime,
                source: "onchain-new",
              });
            }
          }
        } catch (err) {
          // Skip failed transactions
          continue;
        }
      }

      logger.success(`✅ Found ${recentTokens.length} recent token creations`);

      return recentTokens;
    } catch (error) {
      logger.error("Blockchain scan failed:", error.message);
      return [];
    }
  }

  /**
   * Aggregate tokens from all available sources
   */
  async discoverTokens(connection, options = {}) {
    try {
      logger.info("🔍 Starting multi-source token discovery...");

      const allTokens = [];

      // 1. CoinGecko - Most reliable free API
      if (this.coingecko) {
        try {
          // Trending list
          const geckoTrending = await this.coingecko.getTrendingCoins();
          allTokens.push(...geckoTrending);
          logger.info(`🦎 CoinGecko Trending: ${geckoTrending.length} tokens`);

          // Ecosystem tokens sorted by volume
          const geckoTokens = await this.coingecko.getSolanaTokens({
            limit: 50,
            order: "volume_desc",
          });
          allTokens.push(...geckoTokens);
          logger.info(`🦎 CoinGecko Ecosystem: ${geckoTokens.length} tokens`);
        } catch (error) {
          logger.warn("CoinGecko failed");
        }
      }

      // 2. SolScan - Public API
      if (this.solscan) {
        try {
          const solscanTokens = await this.solscan.getTrendingTokens({
            limit: 10,
          });
          allTokens.push(...solscanTokens);
          logger.info(`🔍 SolScan: ${solscanTokens.length} tokens`);
        } catch (error) {
          logger.warn("SolScan failed");
        }
      }

      // 3. Birdeye (fallback)
      try {
        const birdeyeTokens = await this.getBirdeyeTrending({
          limit: 20,
          sortBy: "volume24hUSD",
        });
        allTokens.push(...birdeyeTokens);
        logger.info(`🦅 Birdeye: ${birdeyeTokens.length} tokens`);
      } catch (error) {
        logger.warn("Birdeye failed");
      }

      // 4. DEXScreener search for high volume
      try {
        const response = await axios.get(
          `${this.sources.dexscreener}/dex/search`,
          {
            params: {
              q: "solana",
            },
            timeout: 10000,
          }
        );

        if (response.data && response.data.pairs) {
          const solanaPairs = response.data.pairs
            .filter(
              (p) =>
                p.chainId === "solana" &&
                p.baseToken?.address !==
                  "So11111111111111111111111111111111111111112" &&
                p.baseToken?.symbol !== "SOL" &&
                parseFloat(p.volume?.h24 || 0) > 500
            )
            .slice(0, 20);

          const dexTokens = solanaPairs.map((p) => ({
            address: p.baseToken.address,
            symbol: p.baseToken.symbol,
            name: p.baseToken.name,
            priceUsd: parseFloat(p.priceUsd || 0),
            volume24h: parseFloat(p.volume?.h24 || 0),
            liquidity: parseFloat(p.liquidity?.usd || 0),
            pairAddress: p.pairAddress,
            source: "dexscreener-search",
          }));

          allTokens.push(...dexTokens);
          logger.info(`📊 DEXScreener: ${dexTokens.length} tokens`);
        }
      } catch (error) {
        logger.warn("DEXScreener search failed");
      }

      // 5. DEXScreener pairs fallback (top volume on Solana)
      try {
        const pairsResp = await axios.get(
          `${this.sources.dexscreener}/dex/pairs/solana`,
          { timeout: 10000 }
        );

        const pairs = pairsResp.data?.pairs || [];
        const topPairs = pairs
          .filter(
            (p) =>
              p.baseToken?.address !==
                "So11111111111111111111111111111111111111112" &&
              parseFloat(p.volume?.h24 || 0) > 200
          )
          .sort(
            (a, b) =>
              parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
          )
          .slice(0, 10);

        const pairTokens = topPairs.map((p) => ({
          address: p.baseToken.address,
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          priceUsd: parseFloat(p.priceUsd || 0),
          volume24h: parseFloat(p.volume?.h24 || 0),
          liquidity: parseFloat(p.liquidity?.usd || 0),
          pairAddress: p.pairAddress,
          source: "dexscreener-pairs",
        }));

        allTokens.push(...pairTokens);
        logger.info(`📊 DEXScreener Pairs: ${pairTokens.length} tokens`);
      } catch (error) {
        logger.warn("DEXScreener pairs failed");
      }

      // Get Jupiter verified tokens (baseline)
      try {
        const jupiterTokens = await this.getJupiterTokens();
        logger.info(
          `🪐 Jupiter: ${jupiterTokens.length} verified tokens (baseline)`
        );
      } catch (error) {
        logger.warn("Jupiter failed");
      }

      // Remove duplicates
      const uniqueTokens = [];
      const seen = new Set();

      for (const token of allTokens) {
        if (!seen.has(token.address)) {
          seen.add(token.address);
          uniqueTokens.push(token);
        }
      }

      logger.success(`✅ Discovered ${uniqueTokens.length} unique tokens`);

      return uniqueTokens;
    } catch (error) {
      logger.error("Token discovery failed:", error);
      return [];
    }
  }

  /**
   * Filter tokens by quality criteria with Bubblemaps holder safety check
   */
  async filterQuality(tokens, criteria = {}) {
    const {
      minLiquidity = 20000,
      minVolume24h = 5000,
      minPriceChange = 20,
      maxPriceChange = 800,
      checkBubblemaps = true,
    } = criteria;

    const filtered = [];

    for (const token of tokens) {
      // Basic criteria
      if (token.liquidity && token.liquidity < minLiquidity) continue;
      if (token.volume24h && token.volume24h < minVolume24h) continue;

      if (token.priceChange24h) {
        if (token.priceChange24h < minPriceChange) continue;
        if (token.priceChange24h > maxPriceChange) continue;
      }

      // Bubblemaps holder risk check
      if (checkBubblemaps && this.bubblemaps) {
        try {
          const safety = await this.bubblemaps.assessTokenSafety(token.address);

          if (!safety.safe) {
            logger.warn(
              `🚫 ${
                token.symbol || token.address.slice(0, 8)
              }... failed Bubblemaps: ${safety.reason}`
            );
            continue;
          }

          // Add risk data to token
          token.holderRisk = safety.riskLevel;
          token.holderRiskScore = safety.riskScore;
          token.bubblemapsUrl = safety.visualizationUrl;

          logger.info(
            `✅ ${
              token.symbol || token.address.slice(0, 8)
            }... passed Bubblemaps: ${safety.riskLevel} risk`
          );
        } catch (error) {
          logger.warn(
            `Bubblemaps check failed for ${token.address.slice(0, 8)}...`
          );
          // Don't reject token if Bubblemaps fails, just continue
        }
      }

      filtered.push(token);
    }

    return filtered;
  }
}
