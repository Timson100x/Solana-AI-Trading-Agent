#!/usr/bin/env node
/**
 * AI Decision Test - Simuliert vollständigen Trading-Flow
 * Testet: Token Discovery → AI Analyse → Entscheidung → (Alert statt Trade)
 */

import "dotenv/config";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletService } from "../src/services/wallet.js";
import { Logger } from "../src/utils/logger.js";
import axios from "axios";

const logger = new Logger("AIDecisionTest");

// Colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

// Test tokens with different profiles
const TEST_TOKENS = [
  {
    name: "BONK",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    type: "established",
  },
  {
    name: "WIF",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    type: "meme",
  },
  {
    name: "POPCAT",
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    type: "meme",
  },
];

async function analyzeWithAI(tokenData) {
  const prompt = `
Du bist ein Krypto-Trading-Analyst. Analysiere diesen Token und gib eine Empfehlung.

TOKEN DATEN:
- Name: ${tokenData.name}
- Symbol: ${tokenData.symbol || tokenData.name}
- Typ: ${tokenData.type}
- Mint: ${tokenData.mint}

TRADING KONTEXT:
- Min Confidence für Trade: 70%
- Max Trade Amount: 0.02 SOL
- Stop Loss: 15%
- Take Profit: 30%

Antworte im Format:
DECISION: [BUY|HOLD|SKIP]
CONFIDENCE: [0-100]
REASON: [kurze Begründung]
`;

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );
      return parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      logger.warn(`Groq failed: ${error.message}, trying Gemini...`);
    }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
        },
        { timeout: 15000 }
      );
      const text = response.data.candidates[0].content.parts[0].text;
      return parseAIResponse(text);
    } catch (error) {
      logger.error(`Gemini failed: ${error.message}`);
    }
  }

  return { decision: "SKIP", confidence: 0, reason: "No AI available" };
}

function parseAIResponse(text) {
  const decisionMatch = text.match(/DECISION:\s*(BUY|HOLD|SKIP)/i);
  const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/i);
  const reasonMatch = text.match(/REASON:\s*(.+?)(?:\n|$)/i);

  return {
    decision: decisionMatch ? decisionMatch[1].toUpperCase() : "SKIP",
    confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 0,
    reason: reasonMatch ? reasonMatch[1].trim() : "No reason provided",
    rawResponse: text,
  };
}

async function testAIDecisions() {
  console.log(`\n${MAGENTA}🤖 AI DECISION TEST${RESET}`);
  console.log(`${"=".repeat(60)}\n`);

  const minConfidence = parseInt(process.env.MIN_CONFIDENCE || 70);
  console.log(`${CYAN}⚙️ Konfiguration:${RESET}`);
  console.log(`   MIN_CONFIDENCE: ${minConfidence}%`);
  console.log(
    `   MAX_TRADE_AMOUNT: ${process.env.MAX_TRADE_AMOUNT || 0.02} SOL`
  );
  console.log(`   TRADING_ENABLED: ${process.env.TRADING_ENABLED}`);
  console.log(`   AUTO_TRADING_ENABLED: ${process.env.AUTO_TRADING_ENABLED}\n`);

  const results = {
    buy: 0,
    hold: 0,
    skip: 0,
    wouldTrade: 0,
  };

  for (const token of TEST_TOKENS) {
    console.log(`${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`${YELLOW}📊 Analysiere: ${token.name}${RESET}`);
    console.log(`   Mint: ${token.mint.slice(0, 12)}...`);
    console.log(`   Typ: ${token.type}`);

    try {
      const aiResult = await analyzeWithAI(token);

      console.log(`\n${CYAN}🤖 AI Entscheidung:${RESET}`);

      const decisionColor =
        aiResult.decision === "BUY"
          ? GREEN
          : aiResult.decision === "HOLD"
          ? YELLOW
          : RED;

      console.log(`   Decision: ${decisionColor}${aiResult.decision}${RESET}`);
      console.log(`   Confidence: ${aiResult.confidence}%`);
      console.log(`   Reason: ${aiResult.reason}`);

      // Track results
      results[aiResult.decision.toLowerCase()]++;

      // Would we trade?
      const wouldTrade =
        aiResult.decision === "BUY" &&
        aiResult.confidence >= minConfidence &&
        process.env.AUTO_TRADING_ENABLED === "true";

      if (wouldTrade) {
        results.wouldTrade++;
        console.log(
          `\n   ${GREEN}✅ WÜRDE TRADEN (Confidence >= ${minConfidence}%)${RESET}`
        );
      } else if (aiResult.decision === "BUY") {
        console.log(
          `\n   ${YELLOW}⚠️ Kein Trade (Confidence ${aiResult.confidence}% < ${minConfidence}%)${RESET}`
        );
      }
    } catch (error) {
      console.log(`${RED}❌ Fehler: ${error.message}${RESET}`);
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Summary
  console.log(`\n${MAGENTA}${"═".repeat(60)}${RESET}`);
  console.log(`${MAGENTA}📊 ZUSAMMENFASSUNG:${RESET}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`   Tokens analysiert: ${TEST_TOKENS.length}`);
  console.log(`   ${GREEN}BUY Signale: ${results.buy}${RESET}`);
  console.log(`   ${YELLOW}HOLD Signale: ${results.hold}${RESET}`);
  console.log(`   ${RED}SKIP Signale: ${results.skip}${RESET}`);
  console.log(`   ${GREEN}Würde traden: ${results.wouldTrade}${RESET}`);
  console.log(`${MAGENTA}${"═".repeat(60)}${RESET}\n`);

  if (results.wouldTrade > 0) {
    console.log(
      `${GREEN}✅ Bot würde ${results.wouldTrade} Trade(s) ausführen!${RESET}`
    );
    console.log(
      `${CYAN}   Auf VPS/lokal wird Jupiter API funktionieren.${RESET}\n`
    );
  } else {
    console.log(
      `${YELLOW}ℹ️ Keine Trades bei aktuellem MIN_CONFIDENCE=${minConfidence}%${RESET}`
    );
    console.log(
      `${CYAN}   Verringere MIN_CONFIDENCE für mehr Trades.${RESET}\n`
    );
  }
}

testAIDecisions();
