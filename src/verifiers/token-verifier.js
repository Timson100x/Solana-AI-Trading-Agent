/**
 * Token Verifier - Safety checks before trading
 * Uses DEXScreener + Bubblemaps for risk assessment
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("TokenVerifier");

export class TokenVerifier {
  constructor(dexscreener, bubblemaps) {
    this.dexscreener = dexscreener;
    this.bubblemaps = bubblemaps;
  }

  async verify(tokenAddress, signal = {}) {
    try {
      logger.info(`🔍 Verifying token: ${tokenAddress.slice(0, 8)}...`);

      const checks = await Promise.allSettled([
        this.checkDEXScreener(tokenAddress),
        this.checkBubblemaps(tokenAddress),
      ]);

      const dexCheck =
        checks[0].status === "fulfilled" ? checks[0].value : null;
      const holderCheck =
        checks[1].status === "fulfilled" ? checks[1].value : null;

      // Calculate risk score (0-100, lower is better) - ENHANCED RUG DETECTION
      let riskScore = 30; // Lower baseline for better tokens
      const redFlags = [];

      // 🔥 TRICK #4: ADVANCED RUG DETECTOR
      // Top holder concentration check
      if (holderCheck && holderCheck.topHolderPercent > 25) {
        riskScore += 40;
        redFlags.push(`Whale concentration: ${holderCheck.topHolderPercent}%`);
      }

      // Buy/Sell pressure analysis
      if (dexCheck && dexCheck.txns) {
        const buyPressure =
          dexCheck.txns.h6?.buys / Math.max(dexCheck.txns.h6?.sells, 1);
        if (buyPressure < 2) {
          riskScore += 25;
          redFlags.push("Low buy pressure");
        }
      }

      // Token age sweet spot (15-60 minutes)
      if (dexCheck && dexCheck.pairCreatedAt) {
        const ageMinutes = (Date.now() - dexCheck.pairCreatedAt) / 60000;
        if (ageMinutes < 15) {
          riskScore += 20;
          redFlags.push("Too new (< 15min)");
        } else if (ageMinutes > 60) {
          riskScore += 15;
          redFlags.push("Too old (> 60min)");
        }
      }

      // DEXScreener checks
      if (dexCheck) {
        if (dexCheck.liquidity < 1000) {
          riskScore += 20;
          redFlags.push("Very low liquidity");
        } else if (dexCheck.liquidity < 5000) {
          riskScore += 10;
          redFlags.push("Low liquidity");
        }

        if (dexCheck.volume24h < 5000) {
          riskScore += 15;
          redFlags.push("Low volume");
        }

        if (!dexCheck.hasPair) {
          riskScore += 30;
          redFlags.push("No DEX pair found");
        }

        // Price change checks
        if (Math.abs(dexCheck.priceChange24h) > 500) {
          riskScore += 25;
          redFlags.push("Extreme price volatility");
        }
      } else {
        riskScore += 20;
        redFlags.push("DEXScreener verification failed");
      }

      // Bubblemaps holder risk
      if (holderCheck && !holderCheck.safe) {
        riskScore += holderCheck.riskScore || 30;
        redFlags.push(`Holder risk: ${holderCheck.reason}`);
      }

      // Cap risk score at 100
      riskScore = Math.min(100, riskScore);

      const verified = riskScore < 70 && redFlags.length < 3;

      const result = {
        verified,
        riskScore,
        redFlags,
        liquidity: dexCheck?.liquidity || 0,
        volume24h: dexCheck?.volume24h || 0,
        holderSafe: holderCheck?.safe || false,
        timestamp: Date.now(),
      };

      if (verified) {
        logger.success(`✅ Token verified (risk: ${riskScore})`);
      } else {
        logger.warn(
          `⚠️ Token risky (risk: ${riskScore}, flags: ${redFlags.length})`
        );
      }

      return result;
    } catch (error) {
      logger.error("Verification failed:", error.message);
      return {
        verified: false,
        riskScore: 100,
        redFlags: ["Verification error: " + error.message],
        timestamp: Date.now(),
      };
    }
  }

  async checkDEXScreener(tokenAddress) {
    try {
      const details = await this.dexscreener.getTokenDetails(tokenAddress);

      if (!details) {
        return { hasPair: false, liquidity: 0, volume24h: 0 };
      }

      return {
        hasPair: true,
        liquidity: parseFloat(details.liquidity?.usd || 0),
        volume24h: parseFloat(details.volume?.h24 || 0),
        priceChange24h: parseFloat(details.priceChange?.h24 || 0),
        pairAddress: details.pairAddress,
      };
    } catch (error) {
      logger.warn("DEXScreener check failed:", error.message);
      return null;
    }
  }

  async checkBubblemaps(tokenAddress) {
    try {
      const safety = await this.bubblemaps.assessTokenSafety(tokenAddress);
      return safety;
    } catch (error) {
      logger.warn("Bubblemaps check failed:", error.message);
      return { safe: true, riskScore: 0, reason: "Check unavailable" };
    }
  }
}

export default TokenVerifier;
