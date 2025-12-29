import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("Bubblemaps");

/**
 * Bubblemaps API Integration
 * Analyzes token holder distribution, wallet connections, and concentration risks
 * Helps detect rug pulls, wash trading, and unhealthy supply distribution
 */
class BubblemapsService {
  constructor() {
    this.baseUrl = "https://api.bubblemaps.io";
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.initialized = false;
  }

  /**
   * Initialize service and verify API access
   */
  async initialize() {
    try {
      logger.info("Initializing Bubblemaps service...");
      this.initialized = true;
      logger.success("✅ Bubblemaps service initialized");
      return true;
    } catch (error) {
      logger.error("Failed to initialize Bubblemaps:", error.message);
      throw error;
    }
  }

  /**
   * Get token holder analysis
   * @param {string} tokenMint - Token mint address
   * @returns {Object} Holder distribution and risk metrics
   */
  async getTokenHolders(tokenMint) {
    try {
      const cacheKey = `holders_${tokenMint}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Bubblemaps public endpoint for Solana
      const url = `${this.baseUrl}/v1/solana/token/${tokenMint}/holders`;

      logger.info(`Fetching holder data for ${tokenMint.slice(0, 8)}...`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        },
      });

      if (response.data) {
        const analysis = this.analyzeHolderDistribution(response.data);
        this.setCache(cacheKey, analysis);
        return analysis;
      }

      return null;
    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn(
          `Token ${tokenMint.slice(0, 8)}... not found on Bubblemaps`
        );
        return null;
      }
      logger.error(`Bubblemaps holder fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze holder distribution for risk factors
   * @param {Object} holderData - Raw holder data from API
   * @returns {Object} Risk analysis
   */
  analyzeHolderDistribution(holderData) {
    try {
      const holders = holderData.holders || [];
      const totalSupply = holderData.total_supply || 0;

      if (holders.length === 0) {
        return {
          riskLevel: "UNKNOWN",
          riskScore: 50,
          concentration: 0,
          topHoldersCount: 0,
          issues: ["No holder data available"],
        };
      }

      // Calculate concentration metrics
      const top10Supply = holders
        .slice(0, 10)
        .reduce((sum, h) => sum + (h.balance || 0), 0);
      const top10Percentage =
        totalSupply > 0 ? (top10Supply / totalSupply) * 100 : 0;

      const top20Supply = holders
        .slice(0, 20)
        .reduce((sum, h) => sum + (h.balance || 0), 0);
      const top20Percentage =
        totalSupply > 0 ? (top20Supply / totalSupply) * 100 : 0;

      // Detect connected wallets (same patterns, similar balances)
      const connectedGroups = this.detectConnectedWallets(holders);

      // Calculate risk score (0-100, higher = more risky)
      let riskScore = 0;
      const issues = [];

      // Top 10 concentration risk
      if (top10Percentage > 70) {
        riskScore += 40;
        issues.push(
          `Top 10 holders control ${top10Percentage.toFixed(1)}% of supply`
        );
      } else if (top10Percentage > 50) {
        riskScore += 25;
        issues.push(
          `High concentration: ${top10Percentage.toFixed(1)}% in top 10`
        );
      } else if (top10Percentage > 30) {
        riskScore += 10;
      }

      // Connected wallet risk
      if (connectedGroups.length > 0) {
        riskScore += 20;
        issues.push(
          `${connectedGroups.length} groups of potentially connected wallets detected`
        );
      }

      // Low holder count risk
      if (holders.length < 50) {
        riskScore += 15;
        issues.push(`Only ${holders.length} holders - very low distribution`);
      } else if (holders.length < 200) {
        riskScore += 5;
      }

      // Determine risk level
      let riskLevel;
      if (riskScore >= 60) riskLevel = "HIGH";
      else if (riskScore >= 35) riskLevel = "MEDIUM";
      else if (riskScore >= 20) riskLevel = "LOW";
      else riskLevel = "MINIMAL";

      return {
        riskLevel,
        riskScore,
        concentration: {
          top10: top10Percentage.toFixed(2),
          top20: top20Percentage.toFixed(2),
        },
        topHoldersCount: holders.length,
        connectedGroups: connectedGroups.length,
        issues: issues.length > 0 ? issues : ["No major issues detected"],
        rawData: {
          totalHolders: holders.length,
          totalSupply,
          top10Supply,
          top20Supply,
        },
      };
    } catch (error) {
      logger.error("Holder analysis failed:", error.message);
      return {
        riskLevel: "UNKNOWN",
        riskScore: 50,
        issues: ["Analysis failed"],
      };
    }
  }

  /**
   * Detect potentially connected wallets (same owner)
   * @param {Array} holders - List of holders
   * @returns {Array} Groups of connected wallets
   */
  detectConnectedWallets(holders) {
    const groups = [];

    try {
      // Simple heuristic: similar balances within 1% of each other
      for (let i = 0; i < holders.length - 1; i++) {
        const group = [holders[i]];
        const balance = holders[i].balance;

        for (let j = i + 1; j < holders.length; j++) {
          const diff = Math.abs(holders[j].balance - balance) / balance;
          if (diff < 0.01) {
            // Within 1%
            group.push(holders[j]);
          }
        }

        if (group.length >= 3) {
          groups.push({
            count: group.length,
            avgBalance: balance,
            totalShare: balance * group.length,
          });
        }
      }
    } catch (error) {
      logger.error("Connected wallet detection failed:", error.message);
    }

    return groups;
  }

  /**
   * Get supply distribution visualization URL
   * @param {string} tokenMint - Token mint address
   * @returns {string} Bubblemaps visualization URL
   */
  getVisualizationUrl(tokenMint) {
    return `https://app.bubblemaps.io/sol/token/${tokenMint}`;
  }

  /**
   * Check if token is safe based on holder distribution
   * @param {string} tokenMint - Token mint address
   * @returns {Object} Safety assessment
   */
  async assessTokenSafety(tokenMint) {
    try {
      const analysis = await this.getTokenHolders(tokenMint);

      if (!analysis) {
        return {
          safe: false,
          reason: "No holder data available",
          confidence: 0,
        };
      }

      const { riskLevel, riskScore, issues } = analysis;

      // Determine safety
      let safe = false;
      let confidence = 100 - riskScore;

      if (riskLevel === "MINIMAL" || riskLevel === "LOW") {
        safe = true;
      } else if (riskLevel === "MEDIUM") {
        safe = riskScore < 45; // Allow medium-low risk
        confidence = 50;
      }

      return {
        safe,
        riskLevel,
        riskScore,
        confidence,
        reason: issues.join("; "),
        visualizationUrl: this.getVisualizationUrl(tokenMint),
      };
    } catch (error) {
      logger.error(`Safety assessment failed for ${tokenMint}:`, error.message);
      return {
        safe: false,
        reason: "Assessment failed",
        confidence: 0,
      };
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

    // Cleanup old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Simple connectivity check
      return {
        status: "healthy",
        timestamp: Date.now(),
        cacheSize: this.cache.size,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }
}

export default BubblemapsService;
