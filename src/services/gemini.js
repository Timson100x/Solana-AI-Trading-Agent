/**
 * Professional AI Service with Groq primary + Gemini fallback
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import axios from "axios";
import { Logger } from "../utils/logger.js";

const logger = new Logger("GeminiPro");

export class GeminiService {
  constructor() {
    const geminiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    this.openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!geminiKey && !groqKey && !this.openrouterKey) {
      throw new Error(
        "No AI key found (set GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY)"
      );
    }

    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
    }

    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }

    this.openrouterBase = "https://openrouter.ai/api/v1";

    // Performance tracking
    this.requestCount = 0;
    this.avgResponseTime = 0;
    this.lastProvider = "unknown";

    logger.success(
      `✅ AI initialized (primary: ${
        this.groq ? "groq" : this.model ? "gemini" : "openrouter"
      })`
    );
  }

  buildMessages(prompt, systemPrompt) {
    return [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are a disciplined Solana trading analyst. Respond with JSON only.",
      },
      { role: "user", content: prompt },
    ];
  }

  async generateText(prompt, options = {}) {
    const {
      systemPrompt,
      temperature = 0.3,
      maxTokens = 1024,
      model,
      topP = 1,
    } = options;

    const messages =
      options.messages || this.buildMessages(prompt, systemPrompt);
    const providers = [
      {
        name: "groq",
        enabled: !!this.groq,
        run: async () => {
          const response = await this.groq.chat.completions.create({
            messages,
            model: model || "llama-3.3-70b-versatile",
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            stream: false,
          });

          return {
            text: response.choices?.[0]?.message?.content || "",
            model: response.model,
            provider: "groq",
          };
        },
      },
      {
        name: "openrouter",
        enabled: !!this.openrouterKey,
        run: async () => {
          const response = await axios.post(
            `${this.openrouterBase}/chat/completions`,
            {
              model: model || "meta-llama/llama-3.1-70b-instruct:free",
              messages,
              temperature,
              max_tokens: maxTokens,
              top_p: topP,
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
            text: response.data?.choices?.[0]?.message?.content || "",
            model: response.data?.model,
            provider: "openrouter",
          };
        },
      },
      {
        name: "gemini",
        enabled: !!this.model,
        run: async () => {
          const combinedPrompt = `${
            systemPrompt || "You are a disciplined Solana trading analyst."
          }\n\n${prompt}`;
          const result = await this.model.generateContent(combinedPrompt);
          const response = await result.response;
          const text = response.text();

          return {
            text,
            model: "gemini-2.0-flash-exp",
            provider: "gemini",
          };
        },
      },
    ];

    let lastError = null;

    for (const provider of providers) {
      if (!provider.enabled) continue;

      const start = Date.now();
      try {
        const result = await provider.run();
        const responseTime = Date.now() - start;

        this.requestCount++;
        this.avgResponseTime =
          (this.avgResponseTime * (this.requestCount - 1) + responseTime) /
          this.requestCount;
        this.lastProvider = provider.name;

        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`${provider.name} request failed:`, error.message);
      }
    }

    throw lastError || new Error("No AI provider available");
  }

  /**
   * Analyze transaction with AI
   */
  async analyzeTransaction(tx, walletConfig) {
    try {
      const startTime = Date.now();

      const prompt = this.buildTransactionPrompt(tx, walletConfig);
      const { text, provider, model } = await this.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2048,
      });

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Update performance tracking
      const responseTime = Date.now() - startTime;
      this.requestCount++;
      this.avgResponseTime =
        (this.avgResponseTime * (this.requestCount - 1) + responseTime) /
        this.requestCount;

      logger.info(
        `🤖 AI Analysis via ${provider} (${responseTime}ms, ${
          model || "n/a"
        }): ${analysis.confidence}% confidence`
      );

      return {
        confidence: analysis.confidence || 0,
        action: analysis.action || "SKIP",
        reasoning: analysis.reasoning || "No reasoning provided",
        riskLevel: analysis.riskLevel || "unknown",
        expectedReturn: analysis.expectedReturn || 0,
        holdTime: analysis.holdTime || 0,
      };
    } catch (error) {
      logger.error("AI analysis failed:", error);
      return {
        confidence: 0,
        action: "SKIP",
        reasoning: `Analysis failed: ${error.message}`,
      };
    }
  }

  /**
   * Build optimized prompt for transaction analysis
   */
  buildTransactionPrompt(tx, walletConfig) {
    return `You are a professional crypto trading analyst specializing in Solana memecoins and DeFi.

TRANSACTION DATA:
${JSON.stringify(tx, null, 2)}

WALLET CONTEXT:
- Address: ${walletConfig.address}
- Historical Win Rate: ${walletConfig.winRate || "unknown"}%
- Notes: ${walletConfig.notes || "none"}

ANALYSIS TASK:
Analyze if this transaction indicates a profitable trading opportunity.

EVALUATION CRITERIA:
1. **Timing**: Is this an early entry? (Higher score for early)
2. **Token Quality**: Liquidity, volume, holder distribution
3. **Wallet Reputation**: This wallet's historical performance
4. **Market Conditions**: Current sentiment, trend direction
5. **Risk Factors**: Rug pull indicators, concentrated holdings

OUTPUT FORMAT (JSON only):
{
  "confidence": <0-100>,
  "action": "BUY" | "SKIP",
  "reasoning": "<brief 1-2 sentence explanation>",
  "riskLevel": "low" | "medium" | "high",
  "expectedReturn": <percentage>,
  "holdTime": <minutes>
}

SCORING GUIDE:
- 90-100: Exceptional opportunity, all factors aligned
- 80-89: Strong buy signal, minor concerns
- 70-79: Good opportunity with moderate risk
- 60-69: Acceptable but watch closely
- <60: Skip, too risky or poor timing

Be conservative. Only recommend BUY if confidence > 75%.`;
  }

  /**
   * Analyze wallet performance (for scouting)
   */
  async analyze(data, customPrompt) {
    try {
      const startTime = Date.now();

      const prompt = customPrompt || this.buildDefaultPrompt(data);
      const { text, provider, model } = await this.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1024,
      });

      // Parse JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      const responseTime = Date.now() - startTime;
      logger.info(
        `🤖 Wallet Analysis via ${provider} (${responseTime}ms, ${
          model || "n/a"
        }): ${analysis.winRate}% WR`
      );

      return analysis;
    } catch (error) {
      logger.error("Wallet analysis failed:", error);
      return {
        isProfitable: false,
        confidence: 0,
        reason: error.message,
      };
    }
  }

  /**
   * Build default analysis prompt
   */
  buildDefaultPrompt(data) {
    return `Analyze this data and return JSON:
${JSON.stringify(data, null, 2)}

Return format:
{
  "isProfitable": boolean,
  "winRate": number,
  "totalProfit": number,
  "confidence": number,
  "reasoning": string
}`;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      avgResponseTime: Math.round(this.avgResponseTime),
      lastProvider: this.lastProvider,
      requestsPerMin:
        this.requestCount > 0
          ? (this.requestCount / (Date.now() / 60000)).toFixed(2)
          : 0,
    };
  }
}
