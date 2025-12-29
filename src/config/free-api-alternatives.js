/**
 * Free API Alternatives Configuration
 * Comprehensive list of free/freemium APIs for Solana trading bots
 * Updated: December 2025
 */

export const FREE_API_ALTERNATIVES = {
  // ============================================================
  // FREE RPC PROVIDERS (No Payment Required)
  // ============================================================
  rpc: {
    helius: {
      url: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
      limit: "1M credits/month",
      rateLimit: "10 req/s",
      features: ["Enhanced APIs", "Webhooks", "Transaction parsing"],
      signup: "https://helius.dev",
      notes: "Best free tier for Solana, enhanced APIs included",
    },
    alchemy: {
      url: "https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY",
      limit: "30M compute units/month",
      rateLimit: "Varies by tier",
      features: ["Webhooks", "NFT API", "Token API"],
      signup: "https://alchemy.com",
      notes: "Very stable, great for production",
    },
    chainstack: {
      url: "https://nd-xxx-xxx-xxx.p2pify.com/YOUR_KEY",
      limit: "3M requests/month",
      rateLimit: "25 req/s",
      features: ["99.9% uptime", "Archive nodes"],
      signup: "https://chainstack.com",
      notes: "High availability focus",
    },
    ankr: {
      url: "https://rpc.ankr.com/solana",
      limit: "200M credits/month",
      rateLimit: "Generous",
      features: ["Multi-chain", "Public endpoint available"],
      signup: "https://ankr.com",
      notes: "Largest free tier for multi-chain",
    },
    quicknode: {
      url: "https://YOUR-ENDPOINT.solana-mainnet.quiknode.pro/YOUR_TOKEN/",
      limit: "10M credits/month",
      rateLimit: "Fast",
      features: ["Add-ons", "Global infrastructure"],
      signup: "https://quicknode.com",
      notes: "Known for speed, great for bots",
    },
    public: [
      "https://api.mainnet-beta.solana.com", // Solana Foundation (slow)
      "https://solana.api.onfinality.io/public", // OnFinality
      "https://solana.api.pocket.network/", // Pocket Network
    ],
  },

  // ============================================================
  // FREE TOKEN & MARKET DATA APIS
  // ============================================================
  marketData: {
    coingecko: {
      url: "https://api.coingecko.com/api/v3",
      limit: "10-50 calls/min (free)",
      cost: "Free (with delays)",
      features: ["13M+ tokens", "240+ chains", "Historical data"],
      signup: "https://coingecko.com/api",
      notes: "Industry standard, best free market data",
    },
    jupiter: {
      url: "https://price.jup.ag/v4/price",
      limit: "Unlimited (no key needed)",
      cost: "Free",
      features: ["Real-time prices", "Token routing", "Swap quotes"],
      signup: "None required",
      notes: "Perfect for Solana swaps, 100% free",
    },
    dexscreener: {
      url: "https://api.dexscreener.com/latest/dex",
      limit: "300 req/min (free)",
      cost: "Free",
      features: ["DEX prices", "Trending tokens", "New pairs"],
      signup: "None required",
      notes: "Great for finding new tokens",
    },
    solanaTracker: {
      url: "https://data.solanatracker.io",
      limit: "Varies",
      cost: "Free tier available",
      features: ["New mints", "Liquidity pools", "Token metadata"],
      signup: "https://solanatracker.io",
      notes: "Specialized for Solana token discovery",
    },
  },

  // ============================================================
  // PAID APIs WITH FREE TIERS (Limited)
  // ============================================================
  paidWithFreeTier: {
    birdeye: {
      url: "https://public-api.birdeye.so",
      freeTier: "Limited (not recommended)",
      paidTier: {
        lite: "$27-39/month (1.5M CUs)",
        business: "$250-699/month",
      },
      features: ["Token security", "OHLCV", "Holder analysis"],
      computeUnits: {
        priceSimple: 15,
        tokenHolders: 50,
        ohlcv: 30,
      },
      rateLimit: "15 RPS (Lite)",
      notes: "Powerful but expensive, consider free alternatives first",
    },
    solscan: {
      url: "https://public-api.solscan.io",
      freeTier: "1,000 req/60s (10M CUs/month)",
      paidTier: {
        pro2: "$129.35/month (150M CUs)",
        pro3: "$259.35/month (500M CUs, 2,000 req/60s)",
      },
      features: ["Blockchain data", "Token holders", "Transactions"],
      apiKey: "Optional for free tier",
      notes: "Generous free tier, good for basic data",
    },
    moralis: {
      url: "https://solana-gateway.moralis.io",
      freeTier: "40,000 CUs/month",
      paidTier: "From $49/month",
      features: ["Web3 APIs", "NFT data", "Token balances"],
      notes: "Good free tier for general Web3 data",
    },
  },

  // ============================================================
  // FREE TELEGRAM SNIPER BOTS (Freemium)
  // ============================================================
  telegramBots: {
    bonkbot: {
      telegram: "@bonkbot_bot",
      cost: "Free (1% trade fee)",
      features: ["Fastest Solana bot", "Memecoin focus", "Simple UI"],
      notes: "Most popular, great for beginners",
      risks: "Standard bot risks apply",
    },
    trojan: {
      telegram: "@solana_trojanbot",
      cost: "Free (1% trade fee)",
      features: ["Feature-rich", "Security tools", "Advanced options"],
      notes: "Professional-grade features",
      risks: "More complex to use",
    },
    photon: {
      url: "https://photon-sol.tinyastro.io",
      cost: "Free (small fees)",
      features: ["Web interface", "Fast sniping", "Token scanner"],
      notes: "Web-based, no Telegram required",
      risks: "Connect wallet required",
    },
    bananaGun: {
      telegram: "@BananaGunSolanaBot",
      cost: "Free (1% trade fee)",
      features: ["Auto-sniping", "Copy trading", "Anti-rug"],
      notes: "Popular for pump.fun",
      risks: "High competition",
    },
  },

  // ============================================================
  // OPEN SOURCE SNIPER BOTS (GitHub)
  // ============================================================
  openSource: {
    solSniperBot: {
      github: "https://github.com/meodien99/sol-sniper-bot",
      language: "JavaScript",
      features: ["Raydium V2 SDK", "Auto-buy on pool creation", "Configurable"],
      notes: "Popular, actively maintained",
      risks: "⚠️ ALWAYS audit code for backdoors",
    },
    pumpFunSniper: {
      github: "https://github.com/1fge/pump-fun-sniper-bot",
      language: "Python/Rust",
      features: ["Pump.fun specific", "Fast execution", "Token filtering"],
      notes: "Specialized for pump.fun launches",
      risks: "⚠️ Check for malicious code",
    },
    solanaTradingBot: {
      github: "https://github.com/warp-id/solana-trading-bot",
      language: "Rust",
      features: ["Strategy automation", "Real-time data", "Risk management"],
      notes: "More complex, production-ready",
      risks: "⚠️ Requires Rust knowledge",
    },
  },

  // ============================================================
  // RECOMMENDED STACK FOR FREE TIER (2025)
  // ============================================================
  recommendedStack: {
    rpc: "Helius (1M credits/month) + Alchemy (30M CUs/month)",
    prices: "Jupiter API (free unlimited) + CoinGecko (free)",
    discovery: "DexScreener API (free) + Solana Tracker",
    trading: "Jupiter Swap API (free) + Helius RPC",
    monitoring: "CoinGecko + DexScreener",
    notes: `
      This stack provides:
      - 31M+ free API calls/month
      - Real-time price data
      - Token discovery
      - Swap execution
      - Zero API costs
      
      Cost: $0/month (only Solana transaction fees)
    `,
  },

  // ============================================================
  // IMPORTANT WARNINGS
  // ============================================================
  warnings: {
    security: [
      "⚠️ Always audit open-source bots for backdoors",
      "⚠️ Never share your private keys with bots",
      "⚠️ Use dedicated wallets for bot trading",
      "⚠️ Test with small amounts first",
    ],
    risks: [
      "🔴 Sniper bots can lead to total loss",
      "🔴 Rug pulls are common in memecoins",
      "🔴 High competition in sniping",
      "🔴 Transaction fees add up quickly",
    ],
    bestPractices: [
      "✅ Use free RPC tiers to start",
      "✅ Combine multiple free APIs",
      "✅ Cache aggressively to save API calls",
      "✅ Monitor your usage carefully",
      "✅ Upgrade to paid tiers only when profitable",
    ],
  },
};

export default FREE_API_ALTERNATIVES;
