/**
 * Trading Configuration
 * Centralized settings for Birdeye, AI, and trading strategies
 */

export const tradingConfig = {
  // Birdeye Settings
  birdeye: {
    minLiquidity: 50, // 🚀 ULTRA WIDE: 50$ minimum
    maxLiquidity: 50000, // 🚀 ULTRA WIDE: 50000$ maximum
    minVolume24h: 100, // 🚀 Lower threshold for more candidates
    sortBy: "v24hChangePercent", // 🔥 Explosive Movers
    limit: 3, // 🚀 3 TOKENS: Safe for both Birdeye (60/h) + Moralis Fallback (40K/month)
  },

  // Trading Strategies
  strategies: {
    aggressive: {
      minLiquidity: 100,
      maxLiquidity: 2000,
      minPriceChange: 50,
      maxPriceChange: 300,
    },
    conservative: {
      minLiquidity: 1000,
      maxLiquidity: 10000,
      minPriceChange: 20,
      maxPriceChange: 150,
    },
    // 🔥 TRICK #3: ULTRA EARLY SNIPER MODE (50-350$ LIQUIDITY)
    sniper: {
      name: "Ultra Early Sniper",
      minLiquidity: 50, // Ultra früh (50$ statt 100$)
      maxLiquidity: 350, // Vor Pump (350$ statt 50000$)
      minVolumeRatio: 20, // Volume/Liquidity >20x (höher!)
      minPriceChange: 50, // +50% minimum
      maxPriceChange: 300, // +300% max (nicht überhitzt)
      minSmartBuys: 2, // Min smart wallet buys
      maxAgeMinutes: 20, // <20min alt (frischer!)
      sortBy: "v24hChangePercent", // Explosive movers
      limit: 100, // Mehr Tokens scannen
    },
  },

  // AI Settings
  ai: {
    model: "llama-3.1-8b-instant", // 🔥 Ultra-fast model
    temperature: 0.1, // 🔥 Deterministic
    maxTokens: 30, // 🔥 Minimal for speed
    batchDelay: 1000, // 🔥 Faster batch processing
    stream: true, // 🔥 Real-time responses
  },

  // Rate Limits
  rateLimits: {
    birdeye: 100, // ms between calls
    groq: 800, // 🔥 Even faster with 8b model
  },

  // Scan Settings
  scan: {
    tokensToAnalyze: parseInt(process.env.SCAN_TOKEN_LIMIT || 3), // 🚀 3 TOKENS: Safe for 40K Moralis (32% usage)
    intervalMinutes: parseInt(process.env.SCOUT_INTERVAL_MINUTES || 10), // 🚀 10 MIN: 144 scans/day = 432 calls/day
  },

  // Auto-Trading Settings
  autoTrading: {
    enabled:
      process.env.TRADING_ENABLED === "true" ||
      process.env.AUTO_TRADING_ENABLED === "true",
    sniperMode: process.env.SNIPER_MODE === "true", // 🔥 Sniper mode toggle
    priorityFeeMultiplier: parseInt(process.env.PRIORITY_FEE_MULTIPLIER || 4), // 🔥 4x fastest
    maxPortfolioExposure: parseFloat(process.env.MAX_PORTFOLIO_EXPOSURE || 0.3),
    maxSinglePosition: 0.05,
    minPositionSize: 0.01,
    riskScoreThreshold: 70,
    positionMonitorInterval: 30000,
    honeypotCheck: process.env.HONEYPOT_CHECK === "true", // 🔥 Honeypot detection
    mepsAvoidance: true, // 🔥 MEPS timing
  },
};

export default tradingConfig;
