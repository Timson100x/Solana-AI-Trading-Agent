#!/usr/bin/env node
/**
 * AI Trading Test - Testet AI-Entscheidung + Auto Buy/Sell
 *
 * Ablauf:
 * 1. Token analysieren mit AI
 * 2. Bei BUY-Signal automatisch kaufen
 * 3. Position überwachen
 * 4. Bei Stop-Loss oder Take-Profit verkaufen
 */

import "dotenv/config";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import axios from "axios";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

// Configuration
const TEST_TOKEN = process.argv[2] || null;
const TRADE_AMOUNT_SOL = parseFloat(process.argv[3] || "0.01");
const STOP_LOSS = parseFloat(process.env.STOP_LOSS_PERCENT || 15);
const TAKE_PROFIT = parseFloat(process.env.TAKE_PROFIT_PERCENT || 30);

console.log(`\n${BLUE}🤖 AI TRADING TEST - Vollautomatisch${RESET}\n`);
console.log("=".repeat(60));

// 1. Setup
const connection = new Connection(process.env.RPC_ENDPOINT, "confirmed");
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY)
);
const WSOL = "So11111111111111111111111111111111111111112";

console.log(`\n${CYAN}📋 Konfiguration:${RESET}`);
console.log(`Wallet: ${wallet.publicKey.toBase58().slice(0, 12)}...`);
console.log(`Trade Amount: ${TRADE_AMOUNT_SOL} SOL`);
console.log(`Stop-Loss: -${STOP_LOSS}%`);
console.log(`Take-Profit: +${TAKE_PROFIT}%`);
console.log(`Min Confidence: ${process.env.MIN_CONFIDENCE || 70}%`);

// 2. Find trending token if not specified
async function findTrendingToken() {
  if (TEST_TOKEN) return TEST_TOKEN;

  console.log(`\n${BLUE}🔍 Suche trending Token...${RESET}`);

  try {
    // Try Birdeye
    const response = await axios.get(
      "https://public-api.birdeye.so/defi/tokenlist",
      {
        params: { sort_by: "v24hUSD", sort_type: "desc", limit: 10 },
        headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
        timeout: 10000,
      }
    );

    if (response.data?.data?.tokens?.length > 0) {
      const token = response.data.data.tokens.find(
        (t) => t.address !== WSOL && t.v24hUSD > 10000 && t.liquidity > 5000
      );
      if (token) {
        console.log(
          `${GREEN}✅ Gefunden: ${token.symbol} (${token.address.slice(
            0,
            12
          )}...)${RESET}`
        );
        console.log(`   24h Volume: $${(token.v24hUSD / 1000).toFixed(0)}k`);
        console.log(`   Liquidity: $${(token.liquidity / 1000).toFixed(0)}k`);
        return token.address;
      }
    }
  } catch (e) {
    console.log(`${YELLOW}⚠️ Birdeye nicht verfügbar${RESET}`);
  }

  // Fallback: Use BONK as test token
  console.log(`${YELLOW}📌 Verwende BONK als Test-Token${RESET}`);
  return "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"; // BONK
}

// 3. AI Analysis
async function analyzeWithAI(tokenAddress, tokenData) {
  console.log(`\n${BLUE}🧠 AI-Analyse läuft...${RESET}`);

  const prompt = `Analyze this Solana token for trading:

Token: ${tokenAddress}
Symbol: ${tokenData?.symbol || "Unknown"}
Price: $${tokenData?.price?.toFixed(8) || "N/A"}
24h Volume: $${tokenData?.volume24h?.toFixed(0) || "N/A"}
Liquidity: $${tokenData?.liquidity?.toFixed(0) || "N/A"}
Price Change 24h: ${tokenData?.priceChange24h?.toFixed(2) || "N/A"}%

Provide:
1. DECISION: BUY, SELL, or HOLD
2. CONFIDENCE: 0-100
3. RISK: LOW, MEDIUM, HIGH
4. REASON: Brief explanation (max 50 words)

Format your response exactly as:
DECISION: [BUY/SELL/HOLD]
CONFIDENCE: [number]
RISK: [LOW/MEDIUM/HIGH]
REASON: [text]`;

  try {
    // Try Groq first (faster)
    if (process.env.GROQ_API_KEY) {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const text = response.data.choices[0].message.content;
      console.log(`${GREEN}✅ Groq AI Response received${RESET}`);
      return parseAIResponse(text);
    }

    // Fallback to Gemini
    if (process.env.GOOGLE_AI_API_KEY) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
        },
        { timeout: 15000 }
      );

      const text = response.data.candidates[0].content.parts[0].text;
      console.log(`${GREEN}✅ Gemini AI Response received${RESET}`);
      return parseAIResponse(text);
    }

    throw new Error("No AI API configured");
  } catch (error) {
    console.log(
      `${RED}❌ AI Error: ${
        error.response?.data?.error?.message || error.message
      }${RESET}`
    );
    return null;
  }
}

function parseAIResponse(text) {
  const decisionMatch = text.match(/DECISION:\s*(BUY|SELL|HOLD)/i);
  const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/i);
  const riskMatch = text.match(/RISK:\s*(LOW|MEDIUM|HIGH)/i);
  const reasonMatch = text.match(/REASON:\s*(.+?)(?:\n|$)/i);

  return {
    decision: decisionMatch?.[1]?.toUpperCase() || "HOLD",
    confidence: parseInt(confidenceMatch?.[1] || "50"),
    risk: riskMatch?.[1]?.toUpperCase() || "MEDIUM",
    reason: reasonMatch?.[1]?.trim() || "No reason provided",
    raw: text,
  };
}

// 4. Get Token Data
async function getTokenData(tokenAddress) {
  try {
    const response = await axios.get(
      `https://public-api.birdeye.so/defi/token_overview`,
      {
        params: { address: tokenAddress },
        headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    return {
      symbol: data?.symbol,
      price: data?.price,
      volume24h: data?.v24hUSD,
      liquidity: data?.liquidity,
      priceChange24h: data?.priceChange24hPercent,
      decimals: data?.decimals || 9,
    };
  } catch (e) {
    return null;
  }
}

// 5. Execute Buy
async function executeBuy(tokenAddress, amountSOL) {
  console.log(`\n${GREEN}🛒 KAUFE TOKEN...${RESET}`);

  const lamports = Math.floor(amountSOL * 1e9);

  try {
    // Get quote
    const quoteResponse = await axios.get("https://quote-api.jup.ag/v6/quote", {
      params: {
        inputMint: WSOL,
        outputMint: tokenAddress,
        amount: lamports,
        slippageBps: parseInt(process.env.SLIPPAGE_BPS || 150),
      },
      timeout: 10000,
    });

    const quote = quoteResponse.data;
    console.log(
      `${CYAN}📊 Quote: ${amountSOL} SOL → ${(
        parseInt(quote.outAmount) / 1e6
      ).toFixed(4)} Token${RESET}`
    );

    // Get swap transaction
    const swapResponse = await axios.post(
      "https://quote-api.jup.ag/v6/swap",
      {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      },
      { timeout: 15000 }
    );

    // Deserialize and sign
    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(swapResponse.data.swapTransaction, "base64")
    );
    swapTx.sign([wallet]);

    // Send
    const signature = await connection.sendRawTransaction(swapTx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    console.log(`${GREEN}✅ BUY EXECUTED!${RESET}`);
    console.log(`   Signature: ${signature.slice(0, 20)}...`);
    console.log(`   https://solscan.io/tx/${signature}`);

    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");

    return {
      success: true,
      signature,
      amountIn: amountSOL,
      amountOut: parseInt(quote.outAmount),
      price: amountSOL / (parseInt(quote.outAmount) / 1e6),
    };
  } catch (error) {
    console.log(`${RED}❌ Buy failed: ${error.message}${RESET}`);
    return { success: false, error: error.message };
  }
}

// 6. Execute Sell
async function executeSell(tokenAddress, tokenAmount, decimals = 6) {
  console.log(`\n${YELLOW}💰 VERKAUFE TOKEN...${RESET}`);

  try {
    // Get quote
    const quoteResponse = await axios.get("https://quote-api.jup.ag/v6/quote", {
      params: {
        inputMint: tokenAddress,
        outputMint: WSOL,
        amount: Math.floor(tokenAmount),
        slippageBps: parseInt(process.env.SLIPPAGE_BPS || 150),
      },
      timeout: 10000,
    });

    const quote = quoteResponse.data;
    const solOut = parseInt(quote.outAmount) / 1e9;
    console.log(`${CYAN}📊 Quote: Token → ${solOut.toFixed(4)} SOL${RESET}`);

    // Get swap transaction
    const swapResponse = await axios.post(
      "https://quote-api.jup.ag/v6/swap",
      {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      },
      { timeout: 15000 }
    );

    // Deserialize and sign
    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(swapResponse.data.swapTransaction, "base64")
    );
    swapTx.sign([wallet]);

    // Send
    const signature = await connection.sendRawTransaction(swapTx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    console.log(`${GREEN}✅ SELL EXECUTED!${RESET}`);
    console.log(`   Signature: ${signature.slice(0, 20)}...`);
    console.log(`   https://solscan.io/tx/${signature}`);

    await connection.confirmTransaction(signature, "confirmed");

    return { success: true, signature, solReceived: solOut };
  } catch (error) {
    console.log(`${RED}❌ Sell failed: ${error.message}${RESET}`);
    return { success: false, error: error.message };
  }
}

// 7. Monitor Position
async function monitorPosition(
  tokenAddress,
  entryPrice,
  tokenAmount,
  entrySOL
) {
  console.log(`\n${BLUE}👁️ ÜBERWACHE POSITION...${RESET}`);
  console.log(`Entry: ${entrySOL} SOL @ $${entryPrice.toFixed(8)}`);
  console.log(`Stop-Loss: -${STOP_LOSS}% | Take-Profit: +${TAKE_PROFIT}%`);

  const stopLossPrice = entryPrice * (1 - STOP_LOSS / 100);
  const takeProfitPrice = entryPrice * (1 + TAKE_PROFIT / 100);

  console.log(
    `Target Prices: SL $${stopLossPrice.toFixed(
      8
    )} | TP $${takeProfitPrice.toFixed(8)}`
  );

  let checkCount = 0;
  const maxChecks = 60; // 5 minutes max

  while (checkCount < maxChecks) {
    try {
      const tokenData = await getTokenData(tokenAddress);
      const currentPrice = tokenData?.price || 0;
      const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

      process.stdout.write(
        `\r${CYAN}Check ${checkCount + 1}/${maxChecks}: $${currentPrice.toFixed(
          8
        )} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)${RESET}    `
      );

      if (currentPrice <= stopLossPrice) {
        console.log(
          `\n${RED}🛑 STOP-LOSS TRIGGERED @ ${pnlPercent.toFixed(2)}%${RESET}`
        );
        return { action: "SELL", reason: "stop_loss", pnl: pnlPercent };
      }

      if (currentPrice >= takeProfitPrice) {
        console.log(
          `\n${GREEN}🎯 TAKE-PROFIT TRIGGERED @ ${pnlPercent.toFixed(
            2
          )}%${RESET}`
        );
        return { action: "SELL", reason: "take_profit", pnl: pnlPercent };
      }

      checkCount++;
      await new Promise((r) => setTimeout(r, 5000)); // Check every 5s
    } catch (e) {
      checkCount++;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.log(
    `\n${YELLOW}⏱️ Max monitoring time reached - selling position${RESET}`
  );
  return { action: "SELL", reason: "timeout", pnl: 0 };
}

// 8. Send Telegram Alert
async function sendTelegramAlert(message) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }
    );
  } catch (e) {}
}

// MAIN
async function main() {
  try {
    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / 1e9;
    console.log(`\n${GREEN}💰 Balance: ${solBalance.toFixed(4)} SOL${RESET}`);

    if (solBalance < TRADE_AMOUNT_SOL + 0.01) {
      console.log(
        `${RED}❌ Nicht genug SOL (brauche ${TRADE_AMOUNT_SOL + 0.01})${RESET}`
      );
      process.exit(1);
    }

    // Find token
    const tokenAddress = await findTrendingToken();
    if (!tokenAddress) {
      console.log(`${RED}❌ Kein Token gefunden${RESET}`);
      process.exit(1);
    }

    // Get token data
    const tokenData = await getTokenData(tokenAddress);
    console.log(`\n${CYAN}📊 Token Data:${RESET}`);
    console.log(`   Symbol: ${tokenData?.symbol || "Unknown"}`);
    console.log(`   Price: $${tokenData?.price?.toFixed(8) || "N/A"}`);
    console.log(
      `   24h Change: ${tokenData?.priceChange24h?.toFixed(2) || "N/A"}%`
    );

    // AI Analysis
    const aiResult = await analyzeWithAI(tokenAddress, tokenData);

    if (!aiResult) {
      console.log(`${RED}❌ AI-Analyse fehlgeschlagen${RESET}`);
      process.exit(1);
    }

    console.log(`\n${BLUE}🤖 AI ENTSCHEIDUNG:${RESET}`);
    console.log(
      `   Decision: ${
        aiResult.decision === "BUY"
          ? GREEN
          : aiResult.decision === "SELL"
          ? RED
          : YELLOW
      }${aiResult.decision}${RESET}`
    );
    console.log(`   Confidence: ${aiResult.confidence}%`);
    console.log(`   Risk: ${aiResult.risk}`);
    console.log(`   Reason: ${aiResult.reason}`);

    // Send Telegram alert
    await sendTelegramAlert(
      `🤖 *AI ANALYSE*\n\n` +
        `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
        `Symbol: ${tokenData?.symbol || "Unknown"}\n` +
        `Decision: *${aiResult.decision}*\n` +
        `Confidence: ${aiResult.confidence}%\n` +
        `Risk: ${aiResult.risk}\n\n` +
        `Reason: ${aiResult.reason}`
    );

    // Check if should buy
    const minConfidence = parseInt(process.env.MIN_CONFIDENCE || 70);

    if (aiResult.decision !== "BUY") {
      console.log(
        `\n${YELLOW}⏸️ AI empfiehlt NICHT zu kaufen - Test beendet${RESET}`
      );
      process.exit(0);
    }

    if (aiResult.confidence < minConfidence) {
      console.log(
        `\n${YELLOW}⏸️ Confidence ${aiResult.confidence}% < ${minConfidence}% - Test beendet${RESET}`
      );
      process.exit(0);
    }

    // Execute Buy
    console.log(
      `\n${GREEN}✅ AI empfiehlt BUY mit ${aiResult.confidence}% Confidence!${RESET}`
    );

    const buyResult = await executeBuy(tokenAddress, TRADE_AMOUNT_SOL);

    if (!buyResult.success) {
      console.log(`${RED}❌ Kauf fehlgeschlagen${RESET}`);
      process.exit(1);
    }

    await sendTelegramAlert(
      `🛒 *AUTO-BUY EXECUTED*\n\n` +
        `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
        `Amount: ${TRADE_AMOUNT_SOL} SOL\n` +
        `Entry Price: $${buyResult.price.toFixed(8)}\n` +
        `Signature: \`${buyResult.signature.slice(0, 20)}...\`\n\n` +
        `Monitoring für SL/TP...`
    );

    // Monitor position
    const monitorResult = await monitorPosition(
      tokenAddress,
      buyResult.price,
      buyResult.amountOut,
      TRADE_AMOUNT_SOL
    );

    // Execute Sell
    const sellResult = await executeSell(
      tokenAddress,
      buyResult.amountOut,
      tokenData?.decimals || 6
    );

    if (sellResult.success) {
      const pnl = sellResult.solReceived - TRADE_AMOUNT_SOL;
      const pnlPercent = (pnl / TRADE_AMOUNT_SOL) * 100;

      console.log(`\n${"=".repeat(60)}`);
      console.log(`${BLUE}📊 TRADE SUMMARY${RESET}`);
      console.log(`${"=".repeat(60)}`);
      console.log(`Entry: ${TRADE_AMOUNT_SOL} SOL`);
      console.log(`Exit: ${sellResult.solReceived.toFixed(4)} SOL`);
      console.log(
        `P&L: ${pnl >= 0 ? GREEN : RED}${pnl >= 0 ? "+" : ""}${pnl.toFixed(
          4
        )} SOL (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)${RESET}`
      );
      console.log(`Reason: ${monitorResult.reason}`);

      await sendTelegramAlert(
        `💰 *TRADE CLOSED*\n\n` +
          `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
          `Entry: ${TRADE_AMOUNT_SOL} SOL\n` +
          `Exit: ${sellResult.solReceived.toFixed(4)} SOL\n` +
          `P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SOL (${
            pnlPercent >= 0 ? "+" : ""
          }${pnlPercent.toFixed(2)}%)\n` +
          `Reason: ${monitorResult.reason}\n\n` +
          `[View Sell TX](https://solscan.io/tx/${sellResult.signature})`
      );
    }

    console.log(`\n${GREEN}✅ AI Trading Test abgeschlossen!${RESET}\n`);
  } catch (error) {
    console.log(`${RED}❌ Fatal error: ${error.message}${RESET}`);
    console.error(error);
    process.exit(1);
  }
}

main();
