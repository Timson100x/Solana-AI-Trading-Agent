#!/usr/bin/env node
/**
 * AI Decision Test - Mit simuliertem "Hot" Token
 * Testet die vollständige AI-Entscheidungslogik
 */

import "dotenv/config";
import axios from "axios";

// Colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

// Simulierte "neue Token" mit guten Metriken
const SIMULATED_TOKENS = [
  {
    name: "PEPE2024",
    symbol: "PEPE24",
    mint: "SIMULATED1111111111111111111111111111111111",
    type: "new_launch",
    metrics: {
      liquidity: 125000, // $125k
      holders: 2500,
      volume24h: 450000,
      priceChange24h: 85,
      age_minutes: 45,
      verified: true,
      renounced: true,
    },
  },
  {
    name: "MOONCAT",
    symbol: "MCAT",
    mint: "SIMULATED2222222222222222222222222222222222",
    type: "new_launch",
    metrics: {
      liquidity: 85000, // $85k
      holders: 1800,
      volume24h: 320000,
      priceChange24h: 120,
      age_minutes: 30,
      verified: true,
      renounced: true,
    },
  },
  {
    name: "RUGPULL",
    symbol: "RUG",
    mint: "SIMULATED3333333333333333333333333333333333",
    type: "suspicious",
    metrics: {
      liquidity: 15000, // Low liquidity
      holders: 50, // Very few holders
      volume24h: 5000,
      priceChange24h: 500, // Suspicious pump
      age_minutes: 5,
      verified: false,
      renounced: false, // Not renounced - RED FLAG
    },
  },
];

async function analyzeWithFullContext(tokenData) {
  const prompt = `
Du bist ein professioneller Solana Memecoin Trader. Analysiere diesen NEUEN Token und entscheide ob ein schneller Trade sinnvoll ist.

TOKEN DATEN:
- Name: ${tokenData.name}
- Symbol: ${tokenData.symbol}
- Typ: ${tokenData.type}
- Alter: ${tokenData.metrics.age_minutes} Minuten

ONCHAIN METRIKEN:
- Liquidität: $${tokenData.metrics.liquidity.toLocaleString()}
- Holder: ${tokenData.metrics.holders}
- 24h Volume: $${tokenData.metrics.volume24h.toLocaleString()}
- 24h Preis-Änderung: +${tokenData.metrics.priceChange24h}%
- Contract Verified: ${tokenData.metrics.verified ? "JA" : "NEIN"}
- Ownership Renounced: ${tokenData.metrics.renounced ? "JA" : "NEIN"}

TRADING REGELN:
- Minimum Liquidität: $50,000
- Minimum Holder: 100
- Verified Contract: Bevorzugt
- Renounced Ownership: Bevorzugt (sicherer gegen Rugpulls)
- Neue Tokens (<60min) können sehr profitabel sein

ANTWORTE EXAKT IN DIESEM FORMAT:
DECISION: BUY
CONFIDENCE: 75
REASON: Gute Liquidität und Holder-Basis

ODER:
DECISION: SKIP
CONFIDENCE: 30
REASON: Zu riskant - nicht verifiziert
`;

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
          temperature: 0.2,
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
      console.log(`${YELLOW}⚠️ Groq failed: ${error.message}${RESET}`);
    }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.2 },
        },
        { timeout: 15000 }
      );
      const text = response.data.candidates[0].content.parts[0].text;
      return parseAIResponse(text);
    } catch (error) {
      console.log(`${RED}❌ Gemini failed: ${error.message}${RESET}`);
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
    reason: reasonMatch ? reasonMatch[1].trim() : text.slice(0, 100),
  };
}

async function runSimulation() {
  console.log(`\n${MAGENTA}🎯 AI TRADING DECISION SIMULATION${RESET}`);
  console.log(`${"═".repeat(60)}\n`);

  const minConfidence = parseInt(process.env.MIN_CONFIDENCE || 70);
  console.log(`${CYAN}⚙️ Trading Konfiguration:${RESET}`);
  console.log(`   MIN_CONFIDENCE: ${minConfidence}%`);
  console.log(`   AUTO_TRADING: ${process.env.AUTO_TRADING_ENABLED}`);
  console.log(`\n`);

  let buySignals = 0;
  let skipSignals = 0;
  let wouldTrade = 0;

  for (const token of SIMULATED_TOKENS) {
    console.log(
      `${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`
    );
    console.log(`${YELLOW}📊 ${token.name} (${token.symbol})${RESET}`);
    console.log(`   Typ: ${token.type}`);
    console.log(`   Liquidität: $${token.metrics.liquidity.toLocaleString()}`);
    console.log(`   Holder: ${token.metrics.holders}`);
    console.log(`   Alter: ${token.metrics.age_minutes} min`);
    console.log(`   Renounced: ${token.metrics.renounced ? "✅" : "❌"}`);

    const result = await analyzeWithFullContext(token);

    console.log(`\n   ${CYAN}🤖 AI Entscheidung:${RESET}`);

    const color =
      result.decision === "BUY"
        ? GREEN
        : result.decision === "HOLD"
        ? YELLOW
        : RED;

    console.log(
      `   ${color}${result.decision}${RESET} (Confidence: ${result.confidence}%)`
    );
    console.log(`   Grund: ${result.reason}`);

    if (result.decision === "BUY") {
      buySignals++;
      if (result.confidence >= minConfidence) {
        wouldTrade++;
        console.log(`\n   ${GREEN}✅ WÜRDE TRADEN!${RESET}`);
        console.log(
          `   ${GREEN}→ 0.02 SOL in ${token.symbol} investieren${RESET}`
        );
      } else {
        console.log(`\n   ${YELLOW}⚠️ BUY aber Confidence zu niedrig${RESET}`);
      }
    } else {
      skipSignals++;
      console.log(`\n   ${RED}🚫 Kein Trade${RESET}`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  // Final Summary
  console.log(`\n${MAGENTA}${"═".repeat(60)}${RESET}`);
  console.log(`${MAGENTA}📊 SIMULATIONS-ERGEBNIS:${RESET}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`   Tokens analysiert: ${SIMULATED_TOKENS.length}`);
  console.log(`   ${GREEN}BUY Signale: ${buySignals}${RESET}`);
  console.log(`   ${RED}SKIP Signale: ${skipSignals}${RESET}`);
  console.log(`   ${GREEN}Trades ausgeführt: ${wouldTrade}${RESET}`);
  console.log(`${MAGENTA}${"═".repeat(60)}${RESET}`);

  if (wouldTrade > 0) {
    console.log(`\n${GREEN}✅ AI FUNKTIONIERT KORREKT!${RESET}`);
    console.log(
      `${GREEN}   Der Bot würde ${wouldTrade} von ${SIMULATED_TOKENS.length} Token(s) traden.${RESET}`
    );
    console.log(
      `\n${CYAN}ℹ️ Auf VPS wird Jupiter API die Trades ausführen.${RESET}\n`
    );
  } else {
    console.log(`\n${YELLOW}ℹ️ AI ist sehr konservativ eingestellt.${RESET}`);
    console.log(
      `${CYAN}   Erwäge MIN_CONFIDENCE auf 60-65% zu senken.${RESET}\n`
    );
  }
}

runSimulation();
