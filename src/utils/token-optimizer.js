/**
 * 🎯 TOKEN OPTIMIZER - Spare 50-70% AI Tokens
 *
 * JSON ist Token-Verschwendung!
 * - "liquidity_usd": 50000 = 8 Tokens
 * - l:50000 = 3 Tokens
 *
 * Spart Geld bei Groq/Gemini/OpenAI
 */

class TokenOptimizer {
  constructor() {
    // Mapping für häufige Keys
    this.keyMap = {
      // Token Data
      token_name: "n",
      name: "n",
      token_symbol: "s",
      symbol: "s",
      token_address: "a",
      address: "a",
      mint: "a",
      price: "p",
      price_usd: "p",
      priceUsd: "p",

      // Liquidity
      liquidity: "l",
      liquidity_usd: "l",
      liquidityUsd: "l",

      // Volume
      volume: "v",
      volume_24h: "v24",
      volume24h: "v24",

      // Market Cap
      market_cap: "mc",
      marketCap: "mc",
      fdv: "fdv",

      // Holders
      holders: "h",
      holder_count: "h",
      holderCount: "h",

      // Changes
      price_change: "pc",
      priceChange: "pc",
      price_change_24h: "pc24",
      change_1h: "c1",
      change_24h: "c24",

      // Transactions
      transactions: "tx",
      buys: "b",
      sells: "sl",
      buy_count: "bc",
      sell_count: "sc",

      // Time
      timestamp: "t",
      created_at: "ct",
      age: "age",

      // Risk
      risk_score: "rs",
      confidence: "cf",
      score: "sc",

      // Social
      twitter: "tw",
      telegram: "tg",
      website: "web",
      description: "desc",
    };

    // Reverse mapping für Decode
    this.reverseMap = {};
    for (const [long, short] of Object.entries(this.keyMap)) {
      this.reverseMap[short] = long;
    }
  }

  /**
   * 🗜️ COMPRESS JSON für AI
   * Reduziert Tokens um 50-70%
   */
  compress(data) {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.compress(item));
    }

    const compressed = {};
    for (const [key, value] of Object.entries(data)) {
      const shortKey =
        this.keyMap[key] || this.keyMap[key.toLowerCase()] || key;
      compressed[shortKey] = this.compress(value);
    }
    return compressed;
  }

  /**
   * 📖 DECOMPRESS zurück zu normalem JSON
   */
  decompress(data) {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.decompress(item));
    }

    const decompressed = {};
    for (const [key, value] of Object.entries(data)) {
      const longKey = this.reverseMap[key] || key;
      decompressed[longKey] = this.decompress(value);
    }
    return decompressed;
  }

  /**
   * 📊 TOKEN DATA zu kompaktem String
   * Noch kompakter als JSON!
   */
  tokenToCompact(tokenData) {
    // Format: NAME|SYMBOL|PRICE|LIQUIDITY|MCAP|HOLDERS|CHANGE24
    const parts = [
      tokenData.name || tokenData.token_name || "?",
      tokenData.symbol || tokenData.token_symbol || "?",
      this.formatNumber(tokenData.price || tokenData.priceUsd || 0),
      this.formatNumber(tokenData.liquidity || tokenData.liquidityUsd || 0),
      this.formatNumber(tokenData.marketCap || tokenData.market_cap || 0),
      tokenData.holders || tokenData.holderCount || 0,
      (tokenData.priceChange?.h24 || tokenData.change_24h || 0) + "%",
    ];
    return parts.join("|");
  }

  /**
   * 📄 Kompakter String zurück zu Object
   */
  compactToToken(compact) {
    const parts = compact.split("|");
    return {
      name: parts[0],
      symbol: parts[1],
      price: parseFloat(parts[2]) || 0,
      liquidity: parseFloat(parts[3]) || 0,
      marketCap: parseFloat(parts[4]) || 0,
      holders: parseInt(parts[5]) || 0,
      change24h: parseFloat(parts[6]) || 0,
    };
  }

  /**
   * 🔢 Formatiere Zahlen kompakt
   */
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    if (num < 0.0001) return num.toExponential(2);
    return num.toString();
  }

  /**
   * 🎯 OPTIMIZE PROMPT für AI
   * Komprimiert den gesamten Prompt
   */
  optimizePrompt(prompt, tokenData) {
    // Komprimiere Token Data
    const compactData = this.tokenToCompact(tokenData);

    // Kurze Prompt Version
    const shortPrompt = `
Token: ${compactData}
Analyze. Return: BUY/SELL/HOLD, confidence 0-100, reason (max 20 words)
Format: ACTION|CONFIDENCE|REASON
`.trim();

    return shortPrompt;
  }

  /**
   * 📊 BATCH COMPRESS - Mehrere Tokens
   */
  compressTokenList(tokens) {
    // Header: n|s|p|l|mc|h|c24
    const lines = ["n|s|p|l|mc|h|c24"];
    for (const token of tokens) {
      lines.push(this.tokenToCompact(token));
    }
    return lines.join("\n");
  }

  /**
   * 📈 Zähle gesparte Tokens (Schätzung)
   */
  estimateSavings(originalJson) {
    const originalStr = JSON.stringify(originalJson);
    const compressed = this.compress(originalJson);
    const compressedStr = JSON.stringify(compressed);

    // Grobe Token-Schätzung (4 chars ≈ 1 token)
    const originalTokens = Math.ceil(originalStr.length / 4);
    const compressedTokens = Math.ceil(compressedStr.length / 4);
    const saved = originalTokens - compressedTokens;
    const percent = Math.round((saved / originalTokens) * 100);

    return {
      original: originalTokens,
      compressed: compressedTokens,
      saved,
      percent: `${percent}%`,
    };
  }

  /**
   * 🧪 Demo
   */
  demo() {
    const example = {
      token_name: "Bonk",
      token_symbol: "BONK",
      price_usd: 0.00001234,
      liquidity_usd: 5000000,
      market_cap: 50000000,
      holders: 150000,
      volume_24h: 10000000,
      price_change_24h: 15.5,
      transactions: {
        buys: 5000,
        sells: 3000,
      },
    };

    console.log("=== TOKEN OPTIMIZER DEMO ===\n");

    console.log("Original JSON:");
    console.log(JSON.stringify(example, null, 2));
    console.log(`Length: ${JSON.stringify(example).length} chars\n`);

    const compressed = this.compress(example);
    console.log("Compressed JSON:");
    console.log(JSON.stringify(compressed));
    console.log(`Length: ${JSON.stringify(compressed).length} chars\n`);

    const compact = this.tokenToCompact(example);
    console.log("Ultra-Compact:");
    console.log(compact);
    console.log(`Length: ${compact.length} chars\n`);

    const savings = this.estimateSavings(example);
    console.log("Savings:");
    console.log(`  Original: ~${savings.original} tokens`);
    console.log(`  Compressed: ~${savings.compressed} tokens`);
    console.log(`  Saved: ${savings.saved} tokens (${savings.percent})`);
  }
}

// Singleton Export
const tokenOptimizer = new TokenOptimizer();
export default tokenOptimizer;
export { TokenOptimizer };
