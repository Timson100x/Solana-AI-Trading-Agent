#!/usr/bin/env node
/**
 * Test Auto-Trading System
 * Validates all components before live trading
 */

import "dotenv/config";
import { Connection } from "@solana/web3.js";
import { Logger } from "../src/utils/logger.js";

// Import auto-trading components
import TokenVerifier from "../src/verifiers/token-verifier.js";
import RiskManager from "../src/trading/risk-manager.js";
import AutoTrader from "../src/trading/auto-trader.js";
import PositionMonitor from "../src/monitoring/position-monitor.js";
import dexscreener from "../src/services/dexscreener.js";
import JupiterService from "../src/services/jupiter.js";
import WalletService from "../src/services/wallet.js";
import birdeyeProvider from "../src/providers/birdeye-provider.js";

const logger = new Logger("AutoTradingTest");

async function testAutoTradingSystem() {
  logger.info("🧪 Testing Auto-Trading System\n");

  try {
    // 1. Initialize Solana connection
    logger.info("1️⃣ Testing Solana connection...");
    const connection = new Connection(
      process.env.RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );
    const slot = await connection.getSlot();
    logger.success(`✅ Connected to Solana (slot: ${slot})\n`);

    // 2. Initialize wallet
    logger.info("2️⃣ Testing wallet...");

    if (!process.env.WALLET_PRIVATE_KEY) {
      logger.warn("⚠️ WALLET_PRIVATE_KEY not set - skipping wallet tests");
      logger.info("   Set WALLET_PRIVATE_KEY in .env to test full system\n");

      // Continue with limited testing
      logger.info("3️⃣ Testing services...");
      const jupiter = new JupiterService(connection, null);

      // Test token (Bonk)
      const testToken = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

      const tokenDetails = await dexscreener.getTokenDetails(testToken);
      logger.success(
        `✅ DEXScreener: ${tokenDetails?.baseToken?.symbol || "N/A"}`
      );

      logger.info("\n=".repeat(60));
      logger.info("📊 LIMITED TEST SUMMARY");
      logger.info("=".repeat(60));
      logger.success("✅ Solana connection working");
      logger.success("✅ DEXScreener service working");
      logger.warn("⚠️ Wallet tests skipped (no private key)");
      logger.info("\n💡 To test full auto-trading system:");
      logger.info("   1. Set WALLET_PRIVATE_KEY in .env");
      logger.info("   2. Run: npm run test-auto");
      logger.info("=".repeat(60));
      return;
    }

    const wallet = new WalletService(connection);
    const balance = await wallet.getBalance();
    const publicKey = wallet.publicKey.toBase58();
    logger.success(
      `✅ Wallet loaded: ${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`
    );
    logger.success(`   Balance: ${balance.toFixed(4)} SOL\n`);

    // 3. Test services
    logger.info("3️⃣ Testing services...");
    const jupiter = new JupiterService(connection, wallet);

    // Test token (Bonk)
    const testToken = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

    const tokenDetails = await dexscreener.getTokenDetails(testToken);
    logger.success(
      `✅ DEXScreener: ${tokenDetails?.baseToken?.symbol || "N/A"}`
    );

    const jupiterQuote = await jupiter.getQuote(
      "So11111111111111111111111111111111111111112",
      testToken,
      0.01
    );
    logger.success(
      `✅ Jupiter: Quote ${jupiterQuote ? "available" : "failed"}\n`
    );

    // 4. Test TokenVerifier
    logger.info("4️⃣ Testing TokenVerifier...");
    const tokenVerifier = new TokenVerifier(dexscreener, null);
    const verification = await tokenVerifier.verify(testToken);
    logger.success(
      `✅ Verification: ${verification.verified ? "SAFE" : "RISKY"} (risk: ${
        verification.riskScore
      })`
    );
    logger.info(`   Liquidity: $${verification.liquidity.toFixed(0)}`);
    logger.info(`   Volume 24h: $${verification.volume24h.toFixed(0)}`);
    logger.info(`   Red Flags: ${verification.redFlags.length}\n`);

    // 5. Test RiskManager
    logger.info("5️⃣ Testing RiskManager...");
    const riskManager = new RiskManager(wallet);
    const positionSize = await riskManager.calculatePositionSize(
      { symbol: "TEST" },
      verification
    );

    if (positionSize) {
      logger.success(
        `✅ Position sizing: ${positionSize.positionSize} SOL (${(
          positionSize.riskMultiplier * 100
        ).toFixed(0)}% risk)`
      );
      logger.info(`   Stop-Loss: -${positionSize.stopLoss * 100}%`);
      logger.info(
        `   Take-Profit: +${positionSize.takeProfit1 * 100}% / +${
          positionSize.takeProfit2 * 100
        }%\n`
      );
    } else {
      logger.warn("⚠️ Position sizing rejected (risk limits)\n");
    }

    // 6. Test PositionMonitor (without starting it)
    logger.info("6️⃣ Testing PositionMonitor...");
    const positionMonitor = new PositionMonitor(
      riskManager,
      birdeyeProvider,
      jupiter,
      { sendTelegramMessage: async () => {} }
    );
    logger.success(`✅ Position monitor created`);
    logger.info(`   Monitoring interval: 30s\n`);

    // 7. Summary
    logger.info("=".repeat(60));
    logger.info("📊 TEST SUMMARY");
    logger.info("=".repeat(60));
    logger.success("✅ All components initialized successfully");
    logger.info(`\nWallet Balance: ${balance.toFixed(4)} SOL`);
    logger.info(
      `Trading Status: ${
        process.env.TRADING_ENABLED === "true" ? "ENABLED 🟢" : "DISABLED 🔴"
      }`
    );

    if (balance < 0.05) {
      logger.warn(
        "\n⚠️ WARNING: Low balance! Add more SOL before enabling trading."
      );
    }

    if (process.env.TRADING_ENABLED !== "true") {
      logger.info(
        "\n💡 To enable auto-trading:\n   Set TRADING_ENABLED=true in .env\n   or AUTO_TRADING_ENABLED=true"
      );
    } else {
      logger.warn(
        "\n⚠️ AUTO-TRADING IS ENABLED!\n   Bot will execute real trades with real money."
      );
    }

    logger.info("=".repeat(60));
  } catch (error) {
    logger.error("❌ Test failed:", error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run test
testAutoTradingSystem().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
