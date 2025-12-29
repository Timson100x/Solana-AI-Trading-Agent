/**
 * 🔥 TRICK #10: HONEYPOT DETECTOR
 * Tests if token can actually be sold before buying
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("HoneypotDetector");

export class HoneypotDetector {
  constructor(jupiter) {
    this.jupiter = jupiter;
    this.SOL = "So11111111111111111111111111111111111111112";
  }

  /**
   * Test if token is sellable (not a honeypot)
   * Tries to get a quote for selling small amount
   */
  async testSellability(tokenAddress) {
    try {
      logger.info(`🍯 Testing sellability: ${tokenAddress.slice(0, 8)}...`);

      // Try to get sell quote for tiny amount
      const testAmount = 1000; // Very small amount
      const quote = await this.jupiter.getQuote(
        tokenAddress,
        this.SOL,
        testAmount
      );

      if (quote && quote.outAmount > 0) {
        logger.success(
          `✅ Token is sellable (quote: ${quote.outAmount} lamports)`
        );
        return {
          sellable: true,
          quoteAmount: quote.outAmount,
          slippage: quote.priceImpactPct,
        };
      }

      logger.warn("⚠️ No quote available - potential honeypot");
      return { sellable: false, reason: "No sell quote" };
    } catch (error) {
      logger.warn("⚠️ Honeypot test failed:", error.message);

      // Check error message for honeypot indicators
      const errorStr = error.message.toLowerCase();
      if (
        errorStr.includes("transfer") ||
        errorStr.includes("sell") ||
        errorStr.includes("forbidden")
      ) {
        return {
          sellable: false,
          reason: "Honeypot detected",
          error: errorStr,
        };
      }

      // Unknown error - fail safe
      return { sellable: false, reason: "Test error", error: error.message };
    }
  }

  /**
   * Quick honeypot check with timeout
   */
  async quickCheck(tokenAddress, timeoutMs = 5000) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeoutMs)
      );

      const result = await Promise.race([
        this.testSellability(tokenAddress),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      logger.warn("Quick honeypot check timeout");
      return { sellable: false, reason: "Timeout" };
    }
  }
}

export default HoneypotDetector;
