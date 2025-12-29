/**
 * Trading Analyzer - AI-powered token analysis
 * Uses Groq for fast memecoin evaluation
 */

import aiProvider from "../providers/ai-provider.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("TradingAnalyzer");

export class TradingAnalyzer {
  async analyzeToken(tokenData) {
    const prompt = `Analysiere diesen Solana Memecoin:

Token: ${tokenData.symbol}
Preis: $${tokenData.price || "N/A"}
Liquidität: $${tokenData.liquidity || 0}
24h Volumen: $${tokenData.volume24h || 0}
24h Änderung: ${tokenData.priceChange24h || 0}%

Trading Regeln (LOCKERE KRITERIEN):
- Liquidität $50-$50000 = BULLISH (ultra-wide range)
- Volumen >$1K = BULLISH (niedriger threshold)
- Preisänderung +10% bis +500% = BULLISH (sehr tolerant)
- Nur bei -50% oder <$50 liquidity = SKIP

Antworte NUR mit: BUY, HOLD oder SKIP + kurze Begründung (max 50 Wörter).`;

    try {
      const response = await aiProvider.chat(
        [
          {
            role: "system",
            content:
              "Du bist ein Solana Memecoin Trading Experte. Sei präzise und kurz.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          maxTokens: 150,
        }
      );

      return this.parseResponse(response.content, tokenData);
    } catch (error) {
      logger.error(
        `AI analysis failed for ${tokenData.symbol}:`,
        error.message
      );
      return {
        token: tokenData.symbol,
        decision: "SKIP",
        reason: "AI unavailable",
        confidence: 0,
      };
    }
  }

  parseResponse(content, tokenData) {
    const lower = content.toLowerCase();

    let verdict = "SKIP";
    if (lower.includes("buy")) verdict = "BUY";
    else if (lower.includes("hold")) verdict = "HOLD";

    // Extract confidence if mentioned
    const confidenceMatch = content.match(/(\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;

    return {
      token: tokenData.symbol,
      address: tokenData.address,
      verdict, // Changed from 'decision' to 'verdict'
      confidence,
      reason: content.substring(0, 150),
      price: tokenData.price,
      liquidity: tokenData.liquidity,
      timestamp: new Date().toISOString(),
    };
  }

  async analyzeBatch(tokens, delayMs = 2000) {
    const results = [];

    for (const token of tokens) {
      const analysis = await this.analyzeToken(token);
      results.push(analysis);

      logger.info(`✓ ${token.symbol}: ${analysis.decision}`);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return results;
  }
}

// Export singleton instance
export default new TradingAnalyzer();
