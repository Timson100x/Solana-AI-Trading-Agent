/**
 * Test Hybrid Provider (Birdeye Discovery + Moralis Prices)
 * Tests 40K/month optimization: 720 scans/day × 20 tokens = 36% usage
 */

import "dotenv/config";
import { HybridProvider } from "../src/providers/hybrid-provider.js";
import { Logger } from "../src/utils/logger.js";
import { tradingConfig } from "../src/config/trading-config.js";

const logger = new Logger("HybridTest");

async function testHybridProvider() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 TESTING HYBRID PROVIDER (Birdeye + Moralis)");
  console.log("=".repeat(70) + "\n");

  const provider = new HybridProvider();

  try {
    // Step 1: Initialize
    logger.info("📍 Step 1: Initialize Hybrid Provider...\n");
    await provider.initialize();

    // Step 2: Test Discovery (Birdeye)
    logger.info("\n📍 Step 2: Test Token Discovery (Birdeye)...\n");
    const tokens = await provider.getTokenList({
      sortBy: tradingConfig.birdeye.sortBy,
      limit: 5, // Test with 5 tokens
      minLiquidity: tradingConfig.birdeye.minLiquidity,
      maxLiquidity: tradingConfig.birdeye.maxLiquidity,
    });

    if (tokens.length === 0) {
      logger.warn("⚠️ No tokens found (Birdeye might be rate limited)");
      logger.info("   Testing Moralis directly...\n");
    } else {
      logger.success(`✅ Found ${tokens.length} tokens\n`);

      // Step 3: Test Pricing (Moralis)
      logger.info("📍 Step 3: Test Token Pricing (Moralis)...\n");

      for (const token of tokens.slice(0, 3)) {
        // Test first 3
        const price = await provider.getTokenPrice(token.address);
        logger.info(
          `   ${token.symbol || token.address.slice(0, 8)}: $${price.toFixed(
            6
          )}`
        );
      }
    }

    // Step 4: Test SOL price directly
    logger.info("\n📍 Step 4: Test SOL Price (Moralis)...\n");
    const solPrice = await provider.getTokenPrice(
      "So11111111111111111111111111111111111111112"
    );
    logger.success(`✅ SOL Price: $${solPrice.toFixed(2)}\n`);

    // Step 5: Test cache (should hit cache on second call)
    logger.info("📍 Step 5: Test Price Cache...\n");
    const cachedPrice = await provider.getTokenPrice(
      "So11111111111111111111111111111111111111112"
    );
    logger.success(`✅ SOL Price (cached): $${cachedPrice.toFixed(2)}\n`);

    // Step 6: Statistics
    logger.info("📍 Step 6: Provider Statistics...\n");
    provider.printStats();

    // Step 7: Health Check
    logger.info("📍 Step 7: Health Check...\n");
    const health = await provider.healthCheck();
    logger.info(`   Status: ${health.status}`);
    logger.info(`   Birdeye: ${health.birdeye}`);
    logger.info(`   Moralis: ${health.moralis}\n`);

    // Step 8: Calculate 24h Projection
    logger.info("📍 Step 8: 24h Projection (40K Limit)...\n");
    const intervalMinutes = tradingConfig.scan.intervalMinutes;
    const scansPerDay = (24 * 60) / intervalMinutes; // Correct: 24h / interval
    const tokensPerScan = tradingConfig.birdeye.limit;
    const callsPerDay = scansPerDay * tokensPerScan;
    const monthlyUsage = callsPerDay * 30;
    const percentOfLimit = ((monthlyUsage / 40000) * 100).toFixed(1);

    logger.info(
      `   Scan Interval: ${tradingConfig.scan.intervalMinutes} minutes`
    );
    logger.info(`   Scans per Day: ${scansPerDay}`);
    logger.info(`   Tokens per Scan: ${tokensPerScan}`);
    logger.info(`   API Calls per Day: ${callsPerDay.toLocaleString()}`);
    logger.info(`   API Calls per Month: ${monthlyUsage.toLocaleString()}`);
    logger.info(`   40K Limit Usage: ${percentOfLimit}%`);

    if (percentOfLimit < 80) {
      logger.success(`   ✅ SAFE: ${percentOfLimit}% usage is optimal!\n`);
    } else {
      logger.warn(`   ⚠️ HIGH: ${percentOfLimit}% usage might hit limit!\n`);
    }

    console.log("=".repeat(70));
    console.log("✅ HYBRID PROVIDER TEST COMPLETE");
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    logger.error("❌ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testHybridProvider();
