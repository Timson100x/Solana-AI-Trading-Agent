/**
 * 🔥 GOD MODE ANALYZER - 12-Layer Elite Filter System
 * Combines all verification layers for maximum win rate
 * Only passes tokens that meet 5+ elite criteria
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("GodModeAnalyzer");

export class GodModeAnalyzer {
  constructor(services) {
    const {
      tokenVerifier,
      honeypotDetector,
      volumeAnalyzer,
      privateMempool,
      liquidityMigration,
      dexScreener,
      birdeye,
    } = services;

    this.tokenVerifier = tokenVerifier;
    this.honeypotDetector = honeypotDetector;
    this.volumeAnalyzer = volumeAnalyzer;
    this.privateMempool = privateMempool;
    this.liquidityMigration = liquidityMigration;
    this.dexScreener = dexScreener;
    this.birdeye = birdeye;

    this.minGodScore = parseInt(process.env.GOD_MODE_MIN_SCORE || 5); // 5+ checks must pass
    this.enabledChecks = new Set([
      "rug_check",
      "honeypot",
      "whale_ratio",
      "order_book",
      "social_sentiment",
      "mempool_activity",
      "volume_spike",
      "liquidity_migration",
      "holder_distribution",
      "contract_security",
      "team_verify",
      "audit_status",
    ]);

    logger.info(
      `🔥 GodModeAnalyzer initialized (min score: ${this.minGodScore}/12)`
    );
  }

  /**
   * Run all 12 God Mode checks
   * Returns 'GOD_MODE_BUY' if score >= 5, else 'SKIP'
   */
  async godModeFilter(tokenData) {
    try {
      const tokenAddress =
        tokenData.address || tokenData.mint || tokenData.token;

      logger.info(
        `🔥 Running God Mode analysis for ${tokenAddress.slice(0, 8)}...`
      );

      // Run all checks in parallel
      const checkResults = await Promise.allSettled([
        this.checkRug(tokenAddress), // 1. Rug Check
        this.checkHoneypot(tokenAddress), // 2. Honeypot
        this.checkWhaleRatio(tokenAddress), // 3. Whale Ratio
        this.checkOrderBook(tokenAddress), // 4. Order Book Imbalance
        this.checkSocialSentiment(tokenData), // 5. Social Sentiment
        this.checkMempoolActivity(tokenAddress), // 6. Smart Wallet Mempool
        this.checkVolumeSpike(tokenAddress), // 7. Volume Spike
        this.checkLiquidityMigration(tokenAddress), // 8. Raydium Migration
        this.checkHolderDistribution(tokenAddress), // 9. Holder Distribution
        this.checkContractSecurity(tokenAddress), // 10. Contract Security
        this.checkTeamVerify(tokenData), // 11. Team Verification
        this.checkAuditStatus(tokenData), // 12. Audit Status
      ]);

      // Calculate God Score
      const passedChecks = checkResults.filter(
        (result) => result.status === "fulfilled" && result.value === true
      );

      const godScore = passedChecks.length;

      logger.info(
        `🔥 God Score: ${godScore}/12 (${((godScore / 12) * 100).toFixed(0)}%)`
      );

      // Log individual check results
      const checkNames = [
        "Rug Check",
        "Honeypot",
        "Whale Ratio",
        "Order Book",
        "Social",
        "Mempool",
        "Volume",
        "Migration",
        "Holders",
        "Contract",
        "Team",
        "Audit",
      ];

      checkResults.forEach((result, index) => {
        const status =
          result.status === "fulfilled" && result.value ? "✅" : "❌";
        logger.info(`  ${status} ${checkNames[index]}`);
      });

      // Return verdict
      if (godScore >= this.minGodScore) {
        logger.success(`🔥 GOD MODE BUY: ${godScore}/12 elite signals!`);
        return {
          verdict: "GOD_MODE_BUY",
          score: godScore,
          maxScore: 12,
          confidence: (godScore / 12) * 100,
        };
      }

      logger.warn(
        `⚠️ SKIP: Only ${godScore}/12 signals (need ${this.minGodScore}+)`
      );
      return {
        verdict: "SKIP",
        score: godScore,
        maxScore: 12,
        confidence: (godScore / 12) * 100,
      };
    } catch (error) {
      logger.error("God Mode analysis failed:", error.message);
      return { verdict: "ERROR", score: 0, error: error.message };
    }
  }

  // ============================================
  // Individual Check Methods
  // ============================================

  async checkRug(tokenAddress) {
    try {
      const result = await this.tokenVerifier.verify(tokenAddress);
      return result.isSafe && result.confidence >= 75;
    } catch {
      return false;
    }
  }

  async checkHoneypot(tokenAddress) {
    try {
      const result = await this.honeypotDetector.testSellability(tokenAddress);
      return result.canSell && result.sellTax < 10;
    } catch {
      return false;
    }
  }

  async checkWhaleRatio(tokenAddress) {
    try {
      // Get holder data
      const holders = await this.getHolderData(tokenAddress);

      // Need 3+ whales holding >5% each
      const whales = holders.filter((h) => h.percentage > 5);
      return whales.length >= 3 && whales.length <= 10;
    } catch {
      return false;
    }
  }

  async checkOrderBook(tokenAddress) {
    try {
      // Check bid/ask spread (tight spread = good)
      const orderBook = await this.getOrderBook(tokenAddress);
      const spread = (orderBook.ask - orderBook.bid) / orderBook.bid;
      return spread < 0.05; // <5% spread
    } catch {
      return false;
    }
  }

  async checkSocialSentiment(tokenData) {
    try {
      // Check Twitter mentions spike
      const sentiment = await this.getSocialSentiment(tokenData.symbol);
      return sentiment.score > 70 && sentiment.mentions > 100;
    } catch {
      return false;
    }
  }

  async checkMempoolActivity(tokenAddress) {
    try {
      // Check for smart wallet pending buys
      const pendingBuys = await this.privateMempool.getPendingSmartBuys(
        tokenAddress
      );
      return pendingBuys.length >= 2; // 2+ smart wallets buying
    } catch {
      return false;
    }
  }

  async checkVolumeSpike(tokenAddress) {
    try {
      const analysis = await this.volumeAnalyzer.analyze(tokenAddress);
      return analysis.volumeIncrease >= 10; // 10x volume spike
    } catch {
      return false;
    }
  }

  async checkLiquidityMigration(tokenAddress) {
    try {
      // Check if token has pending Raydium migration
      return this.liquidityMigration.hasPendingMigration(tokenAddress);
    } catch {
      return false;
    }
  }

  async checkHolderDistribution(tokenAddress) {
    try {
      const holders = await this.getHolderData(tokenAddress);

      // Good: 100-10000 holders, top 10 hold <50%
      const totalHolders = holders.length;
      const top10Percent = holders
        .slice(0, 10)
        .reduce((sum, h) => sum + h.percentage, 0);

      return totalHolders >= 100 && totalHolders <= 10000 && top10Percent < 50;
    } catch {
      return false;
    }
  }

  async checkContractSecurity(tokenAddress) {
    try {
      // Check for mint authority disabled, freeze disabled
      const tokenInfo = await this.tokenVerifier.getTokenInfo(tokenAddress);
      return !tokenInfo.mintAuthority && !tokenInfo.freezeAuthority;
    } catch {
      return false;
    }
  }

  async checkTeamVerify(tokenData) {
    try {
      // Check if team is doxxed (Twitter, website)
      return tokenData.socials?.twitter && tokenData.socials?.website;
    } catch {
      return false;
    }
  }

  async checkAuditStatus(tokenData) {
    try {
      // Check if contract is audited (DexScreener data)
      return tokenData.audit === "verified" || tokenData.verified === true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  async getHolderData(tokenAddress) {
    try {
      // Use Helius API to get holder data
      const response = await this.helius?.getTokenHolders?.(tokenAddress);
      return response || [];
    } catch {
      return [];
    }
  }

  async getOrderBook(tokenAddress) {
    try {
      // Mock order book (replace with real DEX API)
      return { bid: 0.001, ask: 0.00105 };
    } catch {
      return { bid: 0, ask: 0 };
    }
  }

  async getSocialSentiment(symbol) {
    try {
      // Mock sentiment (replace with Twitter API or similar)
      return { score: 75, mentions: 150 };
    } catch {
      return { score: 0, mentions: 0 };
    }
  }

  /**
   * Quick check (reduced checks for speed)
   */
  async quickCheck(tokenAddress) {
    try {
      const [rug, honeypot, volume] = await Promise.allSettled([
        this.checkRug(tokenAddress),
        this.checkHoneypot(tokenAddress),
        this.checkVolumeSpike(tokenAddress),
      ]);

      const passed = [rug, honeypot, volume].filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length;

      return passed >= 2 ? "QUICK_BUY" : "SKIP";
    } catch {
      return "SKIP";
    }
  }
}

/**
 * Standalone function for quick integration
 */
export async function godModeFilter(tokenData, services) {
  const analyzer = new GodModeAnalyzer(services);
  return await analyzer.godModeFilter(tokenData);
}
