/**
 * Professional Gemini AI Service
 * ElizaOS-inspired with advanced prompt engineering
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '../utils/logger.js';

const logger = new Logger('GeminiPro');

export class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,  // More deterministic for trading
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
      }
    });

    // Performance tracking
    this.requestCount = 0;
    this.avgResponseTime = 0;

    logger.success('✅ Gemini AI initialized');
  }

  /**
   * Analyze transaction with AI
   */
  async analyzeTransaction(tx, walletConfig) {
    try {
      const startTime = Date.now();

      const prompt = this.buildTransactionPrompt(tx, walletConfig);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Update performance tracking
      const responseTime = Date.now() - startTime;
      this.requestCount++;
      this.avgResponseTime = 
        (this.avgResponseTime * (this.requestCount - 1) + responseTime) / this.requestCount;

      logger.info(`🤖 AI Analysis (${responseTime}ms): ${analysis.confidence}% confidence`);

      return {
        confidence: analysis.confidence || 0,
        action: analysis.action || 'SKIP',
        reasoning: analysis.reasoning || 'No reasoning provided',
        riskLevel: analysis.riskLevel || 'unknown',
        expectedReturn: analysis.expectedReturn || 0,
        holdTime: analysis.holdTime || 0
      };
    } catch (error) {
      logger.error('AI analysis failed:', error);
      return {
        confidence: 0,
        action: 'SKIP',
        reasoning: `Analysis failed: ${error.message}`
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
- Historical Win Rate: ${walletConfig.winRate || 'unknown'}%
- Notes: ${walletConfig.notes || 'none'}

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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      const responseTime = Date.now() - startTime;
      logger.info(`🤖 Wallet Analysis (${responseTime}ms): ${analysis.winRate}% WR`);

      return analysis;
    } catch (error) {
      logger.error('Wallet analysis failed:', error);
      return {
        isProfitable: false,
        confidence: 0,
        reason: error.message
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
      requestsPerMin: this.requestCount > 0 ? 
        (this.requestCount / (Date.now() / 60000)).toFixed(2) : 0
    };
  }
}
