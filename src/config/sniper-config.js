/**
 * 🎯 TOKEN SNIPER CONFIG - Optimale Einstellungen
 *
 * Die BESTEN Sniper Settings basierend auf Erfahrung
 */

export const SNIPER_CONFIG = {
  // 🎯 ENTRY KRITERIEN
  entry: {
    // Minimum Liquidity (USD)
    minLiquidityUsd: 5000, // Weniger = mehr Risk
    maxLiquidityUsd: 500000, // Mehr = weniger Upside

    // Token Alter
    maxAgeMinutes: 30, // Je neuer, desto riskanter aber mehr Potential
    minAgeMinutes: 1, // Zu früh = noch kein Preisfindung

    // Holder
    minHolders: 10, // Mindestens 10 Holder
    maxTopHolderPercent: 50, // Top Holder max 50%

    // Market Cap
    minMarketCapUsd: 10000,
    maxMarketCapUsd: 5000000,

    // Volume
    minVolume24hUsd: 1000,
  },

  // 💰 POSITION SIZING
  position: {
    // Fix Amount pro Trade
    defaultAmountSol: 0.02, // Standard: 0.02 SOL

    // Oder % des Portfolios
    maxPortfolioPercent: 5, // Max 5% pro Trade

    // Maximum SOL pro Trade
    maxAmountSol: 0.1, // Nie mehr als 0.1 SOL

    // Minimum für Trade
    minAmountSol: 0.005, // Minimum 0.005 SOL
  },

  // 🛡️ RISK MANAGEMENT
  risk: {
    // Stop Loss
    stopLossPercent: 20, // Verkaufe bei -20%

    // Take Profit Levels
    takeProfitLevels: [
      { percent: 50, sellPercent: 25 }, // Bei +50% → Verkaufe 25%
      { percent: 100, sellPercent: 25 }, // Bei +100% → Verkaufe 25%
      { percent: 200, sellPercent: 25 }, // Bei +200% → Verkaufe 25%
      { percent: 500, sellPercent: 25 }, // Bei +500% → Verkaufe Rest
    ],

    // Trailing Stop
    enableTrailingStop: true,
    trailingStopPercent: 15, // 15% unter Peak

    // Time-based Exit
    maxHoldTimeHours: 24, // Verkaufe nach 24h
  },

  // ⚡ EXECUTION
  execution: {
    // Slippage
    slippageBps: 150, // 1.5% Slippage
    maxSlippageBps: 500, // Max 5%

    // Priority Fee
    priorityFeeLevel: "high", // low, medium, high, urgent, snipe

    // Retries
    maxRetries: 3,
    retryDelayMs: 1000,

    // Use Jito
    useJitoBundles: true,
    jitoTipLamports: 50000, // 0.00005 SOL
  },

  // 🔍 FILTERS
  filters: {
    // Sicherheit
    requireMintAuthorityDisabled: true,
    requireFreezeAuthorityDisabled: true,
    requireLPLocked: false, // Nice to have, aber nicht required

    // Blacklist
    blacklistedTokens: [
      // Bekannte Scams hier eintragen
    ],

    // Blacklisted Wallets (bekannte Rugger)
    blacklistedWallets: [
      // Bekannte Scam-Deployer hier
    ],
  },

  // 📊 AI INTEGRATION
  ai: {
    // Minimum AI Confidence für Auto-Buy
    minConfidencePercent: 70,

    // AI Provider
    provider: "groq", // groq, gemini, openai
    model: "llama-3.1-8b-instant",

    // Analyse Tiefe
    analysisDepth: "standard", // quick, standard, deep
  },

  // 🐋 WHALE TRACKING
  whaleTracking: {
    enabled: true,

    // Auto-Copy wenn Whale kauft
    autoCopyTrades: false, // Vorsicht! Erstmal false

    // Minimum Whale Trade Size
    minWhaleTradeSol: 1,

    // Wallets zum Tracken
    trackedWallets: [
      // Füge profitable Wallets hier ein
    ],
  },

  // 📱 ALERTS
  alerts: {
    // Telegram Notifications
    telegramEnabled: true,

    // Alert Types
    alertOnNewPool: true,
    alertOnVolumeSpike: true,
    alertOnWhaleMove: true,
    alertOnStopLoss: true,
    alertOnTakeProfit: true,
  },
};

// 🎮 PRESET CONFIGS
export const PRESETS = {
  // Konservativ - Für Anfänger
  conservative: {
    ...SNIPER_CONFIG,
    entry: {
      ...SNIPER_CONFIG.entry,
      minLiquidityUsd: 20000,
      minHolders: 50,
    },
    position: {
      ...SNIPER_CONFIG.position,
      defaultAmountSol: 0.01,
      maxAmountSol: 0.03,
    },
    risk: {
      ...SNIPER_CONFIG.risk,
      stopLossPercent: 15,
    },
    ai: {
      ...SNIPER_CONFIG.ai,
      minConfidencePercent: 80,
    },
  },

  // Aggressiv - Für erfahrene Trader
  aggressive: {
    ...SNIPER_CONFIG,
    entry: {
      ...SNIPER_CONFIG.entry,
      minLiquidityUsd: 2000,
      maxAgeMinutes: 10,
      minHolders: 5,
    },
    position: {
      ...SNIPER_CONFIG.position,
      defaultAmountSol: 0.05,
      maxAmountSol: 0.2,
    },
    risk: {
      ...SNIPER_CONFIG.risk,
      stopLossPercent: 30,
    },
    ai: {
      ...SNIPER_CONFIG.ai,
      minConfidencePercent: 60,
    },
  },

  // Sniper - Für Pool Sniping
  sniper: {
    ...SNIPER_CONFIG,
    entry: {
      ...SNIPER_CONFIG.entry,
      minLiquidityUsd: 1000,
      maxAgeMinutes: 5,
      minHolders: 1,
    },
    position: {
      ...SNIPER_CONFIG.position,
      defaultAmountSol: 0.02,
    },
    execution: {
      ...SNIPER_CONFIG.execution,
      priorityFeeLevel: "snipe",
      useJitoBundles: true,
      jitoTipLamports: 100000,
    },
    ai: {
      ...SNIPER_CONFIG.ai,
      minConfidencePercent: 50,
      analysisDepth: "quick",
    },
  },
};

export default SNIPER_CONFIG;
