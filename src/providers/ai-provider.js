/**
 * AI Provider with Groq primary + fallback support
 * ESM module for existing agent architecture
 *
 * 🎯 TOKEN OPTIMIZER: Spart 50-70% Tokens durch JSON Kompression
 */

import Groq from "groq-sdk";
import axios from "axios";
import { Logger } from "../utils/logger.js";
import tokenOptimizer from "../utils/token-optimizer.js";

const logger = new Logger("AIProvider");

export class AIProvider {
  constructor() {
    this.groq = process.env.GROQ_API_KEY
      ? new Groq({ apiKey: process.env.GROQ_API_KEY })
      : null;

    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterBase = "https://openrouter.ai/api/v1";

    // 🔥 TRICK #5: GROQ ULTRA FAST SETTINGS
    this.groqModel = "llama-3.1-8b-instant"; // 4x faster than 70b
    this.groqTemperature = 0.1; // More deterministic
    this.groqMaxTokens = 30; // Minimal response for speed

    // 🎯 Token Optimizer
    this.tokenOptimizer = tokenOptimizer;
    this.tokensSaved = 0;

    this.requestCounts = {
      groq: { count: 0, resetTime: Date.now() + 60000 },
      openrouter: { count: 0, resetTime: Date.now() + 60000 },
    };

    const primaryProvider = this.groq
      ? "groq (ultra-fast)"
      : this.openrouterKey
      ? "openrouter"
      : "none";
    logger.success(`✅ AI Provider initialized (primary: ${primaryProvider})`);
  }

  async chat(messages, options = {}) {
    const providers = [
      {
        name: "groq",
        enabled: !!this.groq,
        fn: () => this._groqChat(messages, options),
      },
      {
        name: "openrouter",
        enabled: !!this.openrouterKey,
        fn: () => this._openrouterChat(messages, options),
      },
    ];

    for (const provider of providers) {
      if (!provider.enabled) continue;

      try {
        if (this.isRateLimited(provider.name)) {
          await this.waitForReset(provider.name);
        }

        const response = await provider.fn();
        this.trackRequest(provider.name);
        return response;
      } catch (error) {
        logger.warn(`${provider.name} failed:`, error.message);
        continue;
      }
    }

    throw new Error("All AI providers failed");
  }

  async _groqChat(messages, options = {}) {
    const response = await this.groq.chat.completions.create({
      messages,
      model: options.model || this.groqModel, // Ultra-fast model
      temperature: options.temperature || this.groqTemperature, // Deterministic
      max_tokens: options.maxTokens || this.groqMaxTokens, // Minimal for speed
      top_p: options.topP || 1,
      stream: options.stream || false, // Can enable for real-time
    });

    return {
      content: response.choices[0].message.content,
      model: response.model,
      usage: response.usage,
      provider: "groq",
    };
  }

  async _openrouterChat(messages, options = {}) {
    const response = await axios.post(
      `${this.openrouterBase}/chat/completions`,
      {
        model: options.model || "meta-llama/llama-3.1-70b-instruct:free",
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1024,
        top_p: options.topP || 1,
      },
      {
        headers: {
          Authorization: `Bearer ${this.openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            "https://github.com/Timson100x/Solana-AI-Trading-Agent",
          "X-Title": "Solana AI Trading Agent",
        },
        timeout: 12000,
      }
    );

    return {
      content: response.data.choices[0].message.content,
      model: response.data.model,
      usage: response.data.usage,
      provider: "openrouter",
    };
  }

  isRateLimited(provider) {
    const limits = { groq: 30, openrouter: 20 };
    const tracker = this.requestCounts[provider];

    if (Date.now() > tracker.resetTime) {
      tracker.count = 0;
      tracker.resetTime = Date.now() + 60000;
      return false;
    }

    return tracker.count >= limits[provider];
  }

  async waitForReset(provider) {
    const waitTime = this.requestCounts[provider].resetTime - Date.now();
    logger.info(
      `Rate limited (${provider}). Waiting ${Math.ceil(waitTime / 1000)}s...`
    );
    await new Promise((resolve) => setTimeout(resolve, waitTime + 100));
  }

  trackRequest(provider) {
    this.requestCounts[provider].count++;
  }

  /**
   * 🎯 OPTIMIZED ANALYSIS - Spart 50-70% Tokens!
   * Nutzt komprimiertes JSON Format
   */
  async analyzeTokenOptimized(tokenData) {
    // Komprimiere Token Data
    const compact = this.tokenOptimizer.tokenToCompact(tokenData);
    const savings = this.tokenOptimizer.estimateSavings(tokenData);
    this.tokensSaved += savings.saved;

    // Ultra-kurzer Prompt
    const prompt = `Token:${compact}
Analyze.Reply:BUY/SELL/HOLD|confidence0-100|reason(10words)`;

    const response = await this.chat([{ role: "user", content: prompt }], {
      maxTokens: 50, // Kurze Antwort
    });

    // Parse Antwort
    const parts = response.content.split("|");
    return {
      action: parts[0]?.trim() || "HOLD",
      confidence: parseInt(parts[1]) || 50,
      reason: parts[2]?.trim() || "No reason",
      tokensSaved: savings.saved,
      provider: response.provider,
    };
  }

  /**
   * 📊 Token Savings Stats
   */
  getTokenStats() {
    return {
      totalTokensSaved: this.tokensSaved,
      estimatedCostSaved: `$${(this.tokensSaved * 0.00001).toFixed(4)}`,
    };
  }
}

// Export singleton instance
export default new AIProvider();
