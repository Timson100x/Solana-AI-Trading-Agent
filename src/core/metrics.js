/**
 * Metrics Collector - Performance Monitoring
 * ElizaOS-Inspired monitoring system
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("Metrics");

export class MetricsCollector {
  constructor() {
    this.metrics = {
      transactions: {
        total: 0,
        successful: 0,
        failed: 0,
        avgTime: 0,
        totalTime: 0,
      },
      swaps: {
        total: 0,
        successful: 0,
        failed: 0,
        avgSlippage: 0,
        avgTime: 0,
        totalTime: 0,
      },
      ai: {
        totalRequests: 0,
        avgResponseTime: 0,
        cacheHits: 0,
        totalTime: 0,
      },
      signals: {
        total: 0,
        buy: 0,
        hold: 0,
        skip: 0,
      },
    };

    this.timers = new Map();
    this.startTime = Date.now();
  }

  /**
   * Start operation timer
   */
  startTimer(operationId) {
    this.timers.set(operationId, Date.now());
  }

  /**
   * End operation timer and record duration
   */
  endTimer(operationId, category) {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      logger.warn(`No timer found for ${operationId}`);
      return null;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);

    // Update metrics
    const metric = this.metrics[category];
    if (metric) {
      metric.total++;
      metric.totalTime = (metric.totalTime || 0) + duration;
      metric.avgTime = metric.totalTime / metric.total;
    }

    return duration;
  }

  /**
   * Record successful operation
   */
  recordSuccess(category, metadata = {}) {
    const metric = this.metrics[category];
    if (metric) {
      metric.successful++;

      // Record additional metadata
      if (category === "swaps" && metadata.slippage !== undefined) {
        const total = metric.avgSlippage * (metric.successful - 1);
        metric.avgSlippage = (total + metadata.slippage) / metric.successful;
      }
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(category, error = null) {
    const metric = this.metrics[category];
    if (metric) {
      metric.failed++;

      if (error) {
        logger.error(`${category} failure:`, error.message);
      }
    }
  }

  /**
   * Record signal verdict
   */
  recordSignal(verdict) {
    this.metrics.signals.total++;
    const verdictLower = verdict.toLowerCase();

    if (verdictLower === "buy") {
      this.metrics.signals.buy++;
    } else if (verdictLower === "hold") {
      this.metrics.signals.hold++;
    } else {
      this.metrics.signals.skip++;
    }
  }

  /**
   * Record AI cache hit
   */
  recordCacheHit(category = "ai") {
    const metric = this.metrics[category];
    if (metric) {
      metric.cacheHits++;
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const uptime = Date.now() - this.startTime;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      ...this.metrics,
      successRates: {
        transactions: this.calculateSuccessRate("transactions"),
        swaps: this.calculateSuccessRate("swaps"),
      },
      cacheHitRate: {
        ai: this.calculateCacheHitRate("ai"),
      },
    };
  }

  /**
   * Calculate success rate for category
   */
  calculateSuccessRate(category) {
    const metric = this.metrics[category];
    if (!metric || metric.total === 0) return 0;

    const rate = (metric.successful / metric.total) * 100;
    return parseFloat(rate.toFixed(2));
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate(category) {
    const metric = this.metrics[category];
    if (!metric || metric.totalRequests === 0) return 0;

    const rate = (metric.cacheHits / metric.totalRequests) * 100;
    return parseFloat(rate.toFixed(2));
  }

  /**
   * Get category stats
   */
  getCategoryStats(category) {
    return this.metrics[category] || null;
  }

  /**
   * Reset all metrics
   */
  reset() {
    Object.keys(this.metrics).forEach((key) => {
      const metric = this.metrics[key];
      Object.keys(metric).forEach((prop) => {
        metric[prop] = 0;
      });
    });

    this.timers.clear();
    this.startTime = Date.now();

    logger.info("Metrics reset");
  }

  /**
   * Get formatted summary
   */
  getSummary() {
    const stats = this.getStats();

    return {
      uptime: `${Math.floor(stats.uptime / 60)}m ${stats.uptime % 60}s`,
      transactions: {
        total: stats.transactions.total,
        successRate: `${stats.successRates.transactions}%`,
        avgTime: `${Math.round(stats.transactions.avgTime)}ms`,
      },
      swaps: {
        total: stats.swaps.total,
        successRate: `${stats.successRates.swaps}%`,
        avgSlippage: `${(stats.swaps.avgSlippage * 100).toFixed(2)}%`,
        avgTime: `${Math.round(stats.swaps.avgTime)}ms`,
      },
      ai: {
        requests: stats.ai.totalRequests,
        cacheHitRate: `${stats.cacheHitRate.ai}%`,
        avgTime: `${Math.round(stats.ai.avgResponseTime)}ms`,
      },
      signals: {
        total: stats.signals.total,
        buy: `${stats.signals.buy} (${this.percentage(
          stats.signals.buy,
          stats.signals.total
        )}%)`,
        hold: `${stats.signals.hold} (${this.percentage(
          stats.signals.hold,
          stats.signals.total
        )}%)`,
        skip: `${stats.signals.skip} (${this.percentage(
          stats.signals.skip,
          stats.signals.total
        )}%)`,
      },
    };
  }

  /**
   * Calculate percentage
   */
  percentage(part, total) {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(1);
  }
}

/**
 * Global metrics instance
 */
let globalMetrics = null;

export function getMetrics() {
  if (!globalMetrics) {
    globalMetrics = new MetricsCollector();
    logger.success("Global Metrics initialized");
  }
  return globalMetrics;
}

export default MetricsCollector;
