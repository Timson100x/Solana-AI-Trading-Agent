/**
 * Multi-RPC Service - Automatic Failover & Load Balancing
 * Solana AI Trading Agent Pro - ElizaOS V2
 *
 * Features:
 * - Auto-failover between multiple RPC endpoints
 * - Latency tracking & fastest endpoint selection
 * - Health checks & automatic recovery
 * - Rate limit handling
 */

import { Connection } from "@solana/web3.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("MultiRPC");

export class MultiRPCService {
  constructor() {
    this.endpoints = [
      {
        name: "Helius",
        url: process.env.RPC_ENDPOINT || process.env.HELIUS_RPC_URL,
        priority: 1,
        maxRetries: 3,
      },
      {
        name: "QuickNode",
        url: process.env.QUICKNODE_RPC_URL,
        priority: 2,
        maxRetries: 3,
      },
      {
        name: "Alchemy",
        url: process.env.ALCHEMY_RPC_URL,
        priority: 3,
        maxRetries: 3,
      },
    ].filter((endpoint) => endpoint.url); // Only configured endpoints

    if (this.endpoints.length === 0) {
      throw new Error("No RPC endpoints configured");
    }

    // Performance tracking
    this.stats = new Map();
    this.endpoints.forEach((endpoint) => {
      this.stats.set(endpoint.name, {
        requests: 0,
        failures: 0,
        totalLatency: 0,
        lastSuccess: Date.now(),
        isHealthy: true,
      });
    });

    this.currentEndpoint = this.endpoints[0];
    this.connection = new Connection(this.currentEndpoint.url, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });

    // Health check interval (every 30 seconds)
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      30000
    );

    logger.success(
      `✅ Multi-RPC initialized with ${this.endpoints.length} endpoints`
    );
    this.endpoints.forEach((ep) =>
      logger.info(`  - ${ep.name} (Priority ${ep.priority})`)
    );
  }

  /**
   * Get current active connection
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Execute RPC call with automatic failover
   */
  async executeWithFailover(operation, operationName = "RPC call") {
    const maxAttempts = this.endpoints.length * 2; // Try each endpoint twice
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const endpoint = this.selectBestEndpoint();
      const stats = this.stats.get(endpoint.name);

      try {
        const startTime = Date.now();
        stats.requests++;

        // Execute operation
        const result = await operation(this.connection);

        // Track success
        const latency = Date.now() - startTime;
        stats.totalLatency += latency;
        stats.lastSuccess = Date.now();
        stats.isHealthy = true;

        if (latency > 2000) {
          logger.warn(
            `⚠️ Slow ${operationName} on ${endpoint.name}: ${latency}ms`
          );
        }

        return result;
      } catch (error) {
        stats.failures++;
        lastError = error;

        // Check if we should mark endpoint as unhealthy
        const failureRate = stats.failures / stats.requests;
        if (failureRate > 0.3 && stats.requests > 10) {
          stats.isHealthy = false;
          logger.warn(
            `❌ ${endpoint.name} marked unhealthy (${(
              failureRate * 100
            ).toFixed(1)}% failure rate)`
          );
        }

        // Rate limit errors - wait before retry
        if (
          error.message?.includes("429") ||
          error.message?.includes("rate limit")
        ) {
          logger.warn(`⚠️ Rate limit on ${endpoint.name}, switching endpoint`);
          await this.switchToNextEndpoint();
          await this.sleep(1000); // Wait 1s
          continue;
        }

        // Network errors - try next endpoint immediately
        if (
          error.code === "ECONNREFUSED" ||
          error.code === "ETIMEDOUT" ||
          error.code === "ENOTFOUND"
        ) {
          logger.warn(`⚠️ Network error on ${endpoint.name}: ${error.code}`);
          await this.switchToNextEndpoint();
          continue;
        }

        // Other errors - retry with exponential backoff
        if (attempt < maxAttempts - 1) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
          logger.warn(
            `⚠️ ${operationName} failed on ${endpoint.name}, retry in ${backoff}ms`
          );
          await this.sleep(backoff);
          continue;
        }
      }
    }

    // All attempts failed
    logger.error(
      `❌ ${operationName} failed on all endpoints after ${maxAttempts} attempts`
    );
    throw lastError || new Error("All RPC endpoints failed");
  }

  /**
   * Select best available endpoint based on health & latency
   */
  selectBestEndpoint() {
    // Filter healthy endpoints
    const healthyEndpoints = this.endpoints.filter((ep) => {
      const stats = this.stats.get(ep.name);
      return stats.isHealthy;
    });

    if (healthyEndpoints.length === 0) {
      // All unhealthy - reset and try primary
      logger.warn("⚠️ All endpoints unhealthy, resetting health status");
      this.endpoints.forEach((ep) => {
        this.stats.get(ep.name).isHealthy = true;
      });
      return this.endpoints[0];
    }

    // Sort by priority, then by average latency
    healthyEndpoints.sort((a, b) => {
      const statsA = this.stats.get(a.name);
      const statsB = this.stats.get(b.name);

      // Priority first
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Then by average latency
      const avgLatencyA =
        statsA.requests > 0 ? statsA.totalLatency / statsA.requests : 999999;
      const avgLatencyB =
        statsB.requests > 0 ? statsB.totalLatency / statsB.requests : 999999;

      return avgLatencyA - avgLatencyB;
    });

    return healthyEndpoints[0];
  }

  /**
   * Switch to next healthy endpoint
   */
  async switchToNextEndpoint() {
    const nextEndpoint = this.selectBestEndpoint();

    if (nextEndpoint.name === this.currentEndpoint.name) {
      return; // Already on best endpoint
    }

    logger.info(
      `🔄 Switching RPC: ${this.currentEndpoint.name} → ${nextEndpoint.name}`
    );

    this.currentEndpoint = nextEndpoint;
    this.connection = new Connection(nextEndpoint.url, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });
  }

  /**
   * Perform health checks on all endpoints
   */
  async performHealthChecks() {
    for (const endpoint of this.endpoints) {
      try {
        const connection = new Connection(endpoint.url, {
          commitment: "confirmed",
        });
        const startTime = Date.now();

        await connection.getLatestBlockhash("confirmed");

        const latency = Date.now() - startTime;
        const stats = this.stats.get(endpoint.name);

        // Mark as healthy if it responds
        if (!stats.isHealthy && latency < 3000) {
          stats.isHealthy = true;
          logger.info(`✅ ${endpoint.name} recovered (${latency}ms)`);
        }
      } catch (error) {
        const stats = this.stats.get(endpoint.name);
        if (stats.isHealthy) {
          logger.warn(
            `⚠️ ${endpoint.name} health check failed: ${error.message}`
          );
        }
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = {};

    this.endpoints.forEach((endpoint) => {
      const endpointStats = this.stats.get(endpoint.name);
      const avgLatency =
        endpointStats.requests > 0
          ? Math.round(endpointStats.totalLatency / endpointStats.requests)
          : 0;

      stats[endpoint.name] = {
        requests: endpointStats.requests,
        failures: endpointStats.failures,
        successRate:
          endpointStats.requests > 0
            ? (
                ((endpointStats.requests - endpointStats.failures) /
                  endpointStats.requests) *
                100
              ).toFixed(1) + "%"
            : "0%",
        avgLatency: avgLatency + "ms",
        isHealthy: endpointStats.isHealthy,
        lastSuccess: new Date(endpointStats.lastSuccess).toISOString(),
        isCurrent: endpoint.name === this.currentEndpoint.name,
      };
    });

    return stats;
  }

  /**
   * Get current active endpoint name
   */
  getCurrentEndpoint() {
    return this.currentEndpoint.name;
  }

  /**
   * Force switch to specific endpoint
   */
  async switchToEndpoint(endpointName) {
    const endpoint = this.endpoints.find((ep) => ep.name === endpointName);

    if (!endpoint) {
      throw new Error(`Endpoint ${endpointName} not found`);
    }

    logger.info(`🔄 Manual switch to ${endpointName}`);

    this.currentEndpoint = endpoint;
    this.connection = new Connection(endpoint.url, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    logger.info("Multi-RPC service shutdown");
  }

  // Helper
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
