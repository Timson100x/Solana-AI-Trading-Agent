/**
 * Upgrade Test Suite
 * Validates system functionality after ElizaOS plugin upgrade
 */

import { Logger } from "../src/utils/logger.js";

const logger = new Logger("UpgradeTest");

export class UpgradeTestSuite {
  constructor(agent) {
    this.agent = agent;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  /**
   * Run all upgrade validation tests
   */
  async runAll() {
    logger.info("🧪 Starting upgrade test suite...\n");

    await this.testWalletService();
    await this.testJupiterService();
    await this.testSolanaConnection();
    await this.testPositionManager();
    await this.testTelegramBot();
    await this.testEventSystem();
    await this.testMetricsSystem();

    this.printSummary();
    return this.results;
  }

  /**
   * Test Wallet Service
   */
  async testWalletService() {
    logger.info("Testing Wallet Service...");

    try {
      // Test: getBalance
      await this.runTest("wallet.getBalance()", async () => {
        const balance = await this.agent.wallet.getBalance();
        return typeof balance === "number" && balance >= 0;
      });

      // Test: getPublicKey
      await this.runTest("wallet.getPublicKey()", async () => {
        const pubkey = this.agent.wallet.getPublicKey();
        return pubkey && pubkey.toBase58().length === 44;
      });

      // Test: healthCheck
      await this.runTest("wallet.healthCheck()", async () => {
        const health = await this.agent.wallet.healthCheck();
        return health.status === "healthy";
      });

      logger.success("✅ Wallet Service: PASS\n");
    } catch (error) {
      logger.error("❌ Wallet Service: FAIL\n", error);
    }
  }

  /**
   * Test Jupiter Service
   */
  async testJupiterService() {
    logger.info("Testing Jupiter Service...");

    try {
      // Test: Jupiter initialized
      await this.runTest("jupiter exists", async () => {
        return this.agent.jupiter !== null;
      });

      // Test: getStats
      await this.runTest("jupiter.getStats()", async () => {
        const stats = this.agent.jupiter.getStats();
        return stats && typeof stats.successRate === "object";
      });

      logger.success("✅ Jupiter Service: PASS\n");
    } catch (error) {
      logger.error("❌ Jupiter Service: FAIL\n", error);
    }
  }

  /**
   * Test Solana Connection
   */
  async testSolanaConnection() {
    logger.info("Testing Solana Connection...");

    try {
      // Test: RPC connection
      await this.runTest("connection.getLatestBlockhash()", async () => {
        const blockhash = await this.agent.connection.getLatestBlockhash(
          "confirmed"
        );
        return blockhash && blockhash.blockhash.length > 0;
      });

      // Test: Get version
      await this.runTest("connection.getVersion()", async () => {
        const version = await this.agent.connection.getVersion();
        return version && version["solana-core"];
      });

      logger.success("✅ Solana Connection: PASS\n");
    } catch (error) {
      logger.error("❌ Solana Connection: FAIL\n", error);
    }
  }

  /**
   * Test Position Manager
   */
  async testPositionManager() {
    logger.info("Testing Position Manager...");

    try {
      // Test: Position manager exists
      await this.runTest("positionManager exists", async () => {
        return this.agent.positionManager !== null;
      });

      // Test: calculatePositionSize
      await this.runTest(
        "positionManager.calculatePositionSize()",
        async () => {
          const size = this.agent.positionManager.calculatePositionSize(80);
          return typeof size === "number" && size > 0;
        }
      );

      logger.success("✅ Position Manager: PASS\n");
    } catch (error) {
      logger.error("❌ Position Manager: FAIL\n", error);
    }
  }

  /**
   * Test Telegram Bot
   */
  async testTelegramBot() {
    logger.info("Testing Telegram Bot...");

    try {
      // Test: Telegram bot exists
      await this.runTest("telegram exists", async () => {
        return this.agent.telegram !== null;
      });

      logger.success("✅ Telegram Bot: PASS\n");
    } catch (error) {
      logger.warn("⚠️ Telegram Bot: SKIP (not configured)\n");
    }
  }

  /**
   * Test Event System
   */
  async testEventSystem() {
    logger.info("Testing Event System...");

    try {
      const { getEventBus, TradingEvents } = await import("./event-bus.js");
      const eventBus = getEventBus();

      // Test: Event emission
      await this.runTest("eventBus.emitTyped()", async () => {
        let received = false;
        eventBus.once(TradingEvents.SYSTEM_HEALTH_CHECK, () => {
          received = true;
        });
        eventBus.emitTyped(TradingEvents.SYSTEM_HEALTH_CHECK, { status: "ok" });
        return received;
      });

      // Test: Get stats
      await this.runTest("eventBus.getStats()", async () => {
        const stats = eventBus.getStats();
        return stats && typeof stats.totalEvents === "number";
      });

      logger.success("✅ Event System: PASS\n");
    } catch (error) {
      logger.error("❌ Event System: FAIL\n", error);
    }
  }

  /**
   * Test Metrics System
   */
  async testMetricsSystem() {
    logger.info("Testing Metrics System...");

    try {
      const { getMetrics } = await import("./metrics.js");
      const metrics = getMetrics();

      // Test: Start/End timer
      await this.runTest("metrics timer", async () => {
        metrics.startTimer("test-op");
        await new Promise((resolve) => setTimeout(resolve, 10));
        const duration = metrics.endTimer("test-op", "transactions");
        return duration >= 10;
      });

      // Test: Get stats
      await this.runTest("metrics.getStats()", async () => {
        const stats = metrics.getStats();
        return stats && typeof stats.uptime === "number";
      });

      logger.success("✅ Metrics System: PASS\n");
    } catch (error) {
      logger.error("❌ Metrics System: FAIL\n", error);
    }
  }

  /**
   * Run individual test
   */
  async runTest(name, testFn) {
    try {
      const result = await testFn();

      if (result) {
        this.results.passed++;
        this.results.tests.push({ name, status: "PASS" });
        logger.info(`  ✅ ${name}: PASS`);
      } else {
        this.results.failed++;
        this.results.tests.push({
          name,
          status: "FAIL",
          reason: "Returned false",
        });
        logger.warn(`  ❌ ${name}: FAIL (returned false)`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: "FAIL", error: error.message });
      logger.error(`  ❌ ${name}: FAIL (${error.message})`);
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    logger.info("\n" + "=".repeat(60));
    logger.info("📊 UPGRADE TEST SUMMARY");
    logger.info("=".repeat(60));
    logger.info(`Total Tests: ${this.results.passed + this.results.failed}`);
    logger.info(`✅ Passed: ${this.results.passed}`);
    logger.info(`❌ Failed: ${this.results.failed}`);
    logger.info(`⚠️ Warnings: ${this.results.warnings}`);

    const successRate = (
      (this.results.passed / (this.results.passed + this.results.failed)) *
      100
    ).toFixed(1);
    logger.info(`Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      logger.success("\n🎉 ALL TESTS PASSED! Upgrade successful!");
    } else {
      logger.warn("\n⚠️ Some tests failed. Review errors above.");
    }

    logger.info("=".repeat(60) + "\n");
  }
}

export default UpgradeTestSuite;
