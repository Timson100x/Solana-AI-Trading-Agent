/**
 * 🔥 PHASE 2 INTEGRATION
 * Honeypot + Enhanced Position Monitoring
 */

import { Logger } from "../utils/logger.js";
import HoneypotDetector from "../verifiers/honeypot-detector.js";

const logger = new Logger("Phase2Integration");

/**
 * Enhanced signal processor with honeypot check
 */
export async function processSignalWithHoneypot(
  signal,
  jupiter,
  autoTrader,
  tradingEnabled
) {
  try {
    // 🔥 HONEYPOT CHECK before trading
    logger.info(`🍯 Honeypot check: ${signal.address.slice(0, 8)}...`);

    const honeypotDetector = new HoneypotDetector(jupiter);
    const sellability = await honeypotDetector.quickCheck(signal.address);

    if (!sellability.sellable) {
      logger.warn(`⚠️ Token failed honeypot check: ${sellability.reason}`);
      return {
        executed: false,
        reason: "Honeypot detected",
        signal,
      };
    }

    logger.success(`✅ Honeypot check passed`);

    // Execute trade if enabled
    if (tradingEnabled && autoTrader) {
      logger.info(`🤖 Executing auto-trade...`);
      const result = await autoTrader.execute({
        ...signal,
        honeypotChecked: true,
      });

      return result;
    }

    return {
      executed: false,
      reason: "Trading disabled",
      signal,
    };
  } catch (error) {
    logger.error("Signal processing error:", error.message);
    return {
      executed: false,
      reason: error.message,
      signal,
    };
  }
}

/**
 * Batch process signals with honeypot checks
 */
export async function processBuySignals(
  buySignals,
  jupiter,
  autoTrader,
  tradingEnabled
) {
  const results = [];

  for (const signal of buySignals) {
    const result = await processSignalWithHoneypot(
      signal,
      jupiter,
      autoTrader,
      tradingEnabled
    );

    results.push(result);

    // Small delay between trades
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

export default {
  processSignalWithHoneypot,
  processBuySignals,
};
