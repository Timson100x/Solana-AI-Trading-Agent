/**
 * Typed Event Bus System - ElizaOS v1.7.0 Inspired
 * Generic event type support with validation and logging
 */

import EventEmitter from "eventemitter3";
import { Logger } from "../utils/logger.js";

const logger = new Logger("EventBus");

/**
 * Typed Event Bus with validation and logging
 * Inspired by ElizaOS v1.7.0 generic event types
 */
export class TypedEventBus extends EventEmitter {
  constructor() {
    super();
    this.eventLog = [];
    this.maxLogSize = 1000;
    this.validators = new Map();
    this.eventCount = new Map();
  }

  /**
   * Register event validator
   */
  registerValidator(eventType, validator) {
    this.validators.set(eventType, validator);
    logger.info(`Registered validator for ${eventType}`);
  }

  /**
   * Emit typed event with validation
   */
  emitTyped(eventType, payload) {
    // Validate payload if validator exists
    if (!this.validatePayload(eventType, payload)) {
      const error = new Error(`Invalid payload for event ${eventType}`);
      logger.error(error.message, payload);
      throw error;
    }

    // Log event
    const logEntry = {
      type: eventType,
      timestamp: Date.now(),
      payload: this.sanitizePayload(payload),
    };

    this.eventLog.push(logEntry);

    // Trim log if too large
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Track event count
    this.eventCount.set(eventType, (this.eventCount.get(eventType) || 0) + 1);

    // Emit event
    this.emit(eventType, payload);

    logger.debug(`Event emitted: ${eventType}`);
  }

  /**
   * Validate event payload
   */
  validatePayload(type, payload) {
    // Basic validation
    if (payload === null || payload === undefined) {
      return false;
    }

    // Custom validator if registered
    const validator = this.validators.get(type);
    if (validator) {
      try {
        return validator(payload);
      } catch (error) {
        logger.error(`Validator error for ${type}:`, error);
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   */
  sanitizePayload(payload) {
    if (typeof payload !== "object") return payload;

    const sanitized = { ...payload };
    const sensitiveKeys = ["privateKey", "secret", "password", "token"];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Get event logs
   */
  getLogs(eventType = null, limit = 100) {
    let logs = this.eventLog;

    if (eventType) {
      logs = logs.filter((log) => log.type === eventType);
    }

    return logs.slice(-limit);
  }

  /**
   * Get event statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.eventLog.length,
      eventTypes: this.eventCount.size,
      breakdown: Object.fromEntries(this.eventCount),
    };

    return stats;
  }

  /**
   * Clear event log
   */
  clearLogs() {
    this.eventLog = [];
    this.eventCount.clear();
    logger.info("Event logs cleared");
  }
}

/**
 * Trading Event Types - Typed constants
 */
export const TradingEvents = {
  // Signal Events
  SIGNAL_DETECTED: "signal:detected",
  SIGNAL_ANALYZED: "signal:analyzed",
  SIGNAL_FILTERED: "signal:filtered",

  // Trade Execution Events
  TRADE_INITIATED: "trade:initiated",
  TRADE_QUOTE_RECEIVED: "trade:quote:received",
  TRADE_EXECUTED: "trade:executed",
  TRADE_FAILED: "trade:failed",

  // Position Events
  POSITION_OPENED: "position:opened",
  POSITION_UPDATED: "position:updated",
  POSITION_CLOSED: "position:closed",
  POSITION_STOP_LOSS: "position:stop:loss",
  POSITION_TAKE_PROFIT: "position:take:profit",

  // Wallet Events
  WALLET_BALANCE_UPDATED: "wallet:balance:updated",
  WALLET_WRAPPED_SOL: "wallet:wrapped:sol",
  WALLET_UNWRAPPED_SOL: "wallet:unwrapped:sol",

  // System Events
  SYSTEM_STARTED: "system:started",
  SYSTEM_STOPPED: "system:stopped",
  SYSTEM_ERROR: "system:error",
  SYSTEM_HEALTH_CHECK: "system:health:check",

  // AI Events
  AI_ANALYSIS_STARTED: "ai:analysis:started",
  AI_ANALYSIS_COMPLETED: "ai:analysis:completed",
  AI_ANALYSIS_FAILED: "ai:analysis:failed",

  // Alert Events
  ALERT_SENT: "alert:sent",
  ALERT_FAILED: "alert:failed",
};

/**
 * Event Payload Validators
 */
export const EventValidators = {
  [TradingEvents.SIGNAL_DETECTED]: (payload) => {
    return (
      payload &&
      typeof payload.symbol === "string" &&
      typeof payload.address === "string"
    );
  },

  [TradingEvents.TRADE_EXECUTED]: (payload) => {
    return (
      payload &&
      typeof payload.signature === "string" &&
      typeof payload.amount === "number"
    );
  },

  [TradingEvents.POSITION_OPENED]: (payload) => {
    return (
      payload &&
      typeof payload.tokenMint === "string" &&
      typeof payload.entryPrice === "number" &&
      typeof payload.amount === "number"
    );
  },

  [TradingEvents.WALLET_BALANCE_UPDATED]: (payload) => {
    return payload && typeof payload.balance === "number";
  },

  [TradingEvents.SYSTEM_ERROR]: (payload) => {
    return payload && typeof payload.error === "string";
  },
};

/**
 * Create global event bus instance
 */
let globalEventBus = null;

export function getEventBus() {
  if (!globalEventBus) {
    globalEventBus = new TypedEventBus();

    // Register all validators
    for (const [event, validator] of Object.entries(EventValidators)) {
      globalEventBus.registerValidator(event, validator);
    }

    logger.success("Global EventBus initialized");
  }

  return globalEventBus;
}

export default TypedEventBus;
