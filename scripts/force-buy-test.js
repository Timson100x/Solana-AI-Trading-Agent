#!/usr/bin/env node
/**
 * FORCE BUY TEST - Testet den kompletten Buy/Sell Flow
 * Überspringt AI-Analyse und führt direkt einen Trade aus
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

// BONK Token - hat gute Liquidität
const TOKEN = process.argv[2] || "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const AMOUNT_SOL = parseFloat(process.argv[3] || "0.005");
const WSOL = "So11111111111111111111111111111111111111112";

console.log(`\n${BLUE}🔥 FORCE BUY/SELL TEST${RESET}\n`);
console.log("=".repeat(60));

const connection = new Connection(process.env.RPC_ENDPOINT, "confirmed");
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY)
);

console.log(`Wallet: ${wallet.publicKey.toBase58().slice(0, 12)}...`);
console.log(`Token: ${TOKEN.slice(0, 16)}...`);
console.log(`Amount: ${AMOUNT_SOL} SOL`);

// Send Telegram
async function telegram(msg) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: "Markdown",
      }
    );
  } catch (e) {}
}

async function main() {
  try {
    // 1. Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(
      `\n${GREEN}💰 Balance: ${(balance / 1e9).toFixed(4)} SOL${RESET}`
    );

    if (balance / 1e9 < AMOUNT_SOL + 0.005) {
      console.log(`${RED}❌ Nicht genug SOL${RESET}`);
      process.exit(1);
    }

    // 2. BUY
    console.log(`\n${GREEN}🛒 KAUFE TOKEN...${RESET}`);
    await telegram(
      `🛒 *FORCE BUY TEST*\nToken: \`${TOKEN.slice(
        0,
        16
      )}...\`\nAmount: ${AMOUNT_SOL} SOL`
    );

    const lamports = Math.floor(AMOUNT_SOL * 1e9);

    // Get quote
    console.log(`${CYAN}📊 Hole Jupiter Quote...${RESET}`);
    const quoteRes = await axios.get("https://public.jupiterapi.com/v6/quote", {
      params: {
        inputMint: WSOL,
        outputMint: TOKEN,
        amount: lamports,
        slippageBps: 200,
      },
      timeout: 15000,
    });

    const quote = quoteRes.data;
    const outAmount = parseInt(quote.outAmount);
    console.log(
      `${GREEN}✅ Quote: ${AMOUNT_SOL} SOL → ${outAmount.toLocaleString()} Token${RESET}`
    );

    // Get swap tx
    console.log(`${CYAN}🔄 Erstelle Swap Transaction...${RESET}`);
    const swapRes = await axios.post(
      "https://public.jupiterapi.com/v6/swap",
      {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      },
      { timeout: 15000 }
    );

    // Sign and send
    const swapTx = VersionedTransaction.deserialize(
      Buffer.from(swapRes.data.swapTransaction, "base64")
    );
    swapTx.sign([wallet]);

    console.log(`${CYAN}📤 Sende BUY Transaction...${RESET}`);
    const buySig = await connection.sendRawTransaction(swapTx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    console.log(
      `${GREEN}✅ BUY TX GESENDET: ${buySig.slice(0, 20)}...${RESET}`
    );
    console.log(`   https://solscan.io/tx/${buySig}`);

    // Wait for confirmation
    console.log(`${YELLOW}⏳ Warte auf Bestätigung...${RESET}`);
    const buyConf = await connection.confirmTransaction(buySig, "confirmed");

    if (buyConf.value.err) {
      console.log(`${RED}❌ BUY FEHLGESCHLAGEN${RESET}`);
      await telegram(`❌ *BUY FAILED*\nError: Transaction error`);
      process.exit(1);
    }

    console.log(`${GREEN}✅ BUY BESTÄTIGT!${RESET}`);
    await telegram(
      `✅ *BUY EXECUTED*\n` +
        `Token: \`${TOKEN.slice(0, 16)}...\`\n` +
        `Amount: ${AMOUNT_SOL} SOL\n` +
        `Tokens: ${outAmount.toLocaleString()}\n` +
        `[View TX](https://solscan.io/tx/${buySig})`
    );

    // 3. Wait 10 seconds
    console.log(`\n${YELLOW}⏳ Warte 10 Sekunden vor Verkauf...${RESET}`);
    await new Promise((r) => setTimeout(r, 10000));

    // 4. SELL
    console.log(`\n${YELLOW}💰 VERKAUFE TOKEN...${RESET}`);

    // Get sell quote
    console.log(`${CYAN}📊 Hole Sell Quote...${RESET}`);
    const sellQuoteRes = await axios.get(
      "https://public.jupiterapi.com/v6/quote",
      {
        params: {
          inputMint: TOKEN,
          outputMint: WSOL,
          amount: outAmount,
          slippageBps: 200,
        },
        timeout: 15000,
      }
    );

    const sellQuote = sellQuoteRes.data;
    const solBack = parseInt(sellQuote.outAmount) / 1e9;
    console.log(
      `${GREEN}✅ Sell Quote: Tokens → ${solBack.toFixed(4)} SOL${RESET}`
    );

    // Get sell swap tx
    console.log(`${CYAN}🔄 Erstelle Sell Transaction...${RESET}`);
    const sellSwapRes = await axios.post(
      "https://public.jupiterapi.com/v6/swap",
      {
        quoteResponse: sellQuote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      },
      { timeout: 15000 }
    );

    // Sign and send
    const sellTx = VersionedTransaction.deserialize(
      Buffer.from(sellSwapRes.data.swapTransaction, "base64")
    );
    sellTx.sign([wallet]);

    console.log(`${CYAN}📤 Sende SELL Transaction...${RESET}`);
    const sellSig = await connection.sendRawTransaction(sellTx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    console.log(
      `${GREEN}✅ SELL TX GESENDET: ${sellSig.slice(0, 20)}...${RESET}`
    );
    console.log(`   https://solscan.io/tx/${sellSig}`);

    // Wait for confirmation
    console.log(`${YELLOW}⏳ Warte auf Bestätigung...${RESET}`);
    const sellConf = await connection.confirmTransaction(sellSig, "confirmed");

    if (sellConf.value.err) {
      console.log(`${RED}❌ SELL FEHLGESCHLAGEN${RESET}`);
      await telegram(`❌ *SELL FAILED*\nError: Transaction error`);
      process.exit(1);
    }

    // 5. Summary
    const pnl = solBack - AMOUNT_SOL;
    const pnlPct = (pnl / AMOUNT_SOL) * 100;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`${BLUE}📊 TRADE ZUSAMMENFASSUNG${RESET}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Entry: ${AMOUNT_SOL} SOL`);
    console.log(`Exit: ${solBack.toFixed(4)} SOL`);
    console.log(
      `P&L: ${pnl >= 0 ? GREEN : RED}${pnl >= 0 ? "+" : ""}${pnl.toFixed(
        4
      )} SOL (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)${RESET}`
    );
    console.log(`${"=".repeat(60)}\n`);

    await telegram(
      `💰 *TRADE COMPLETE*\n\n` +
        `Token: \`${TOKEN.slice(0, 16)}...\`\n` +
        `Entry: ${AMOUNT_SOL} SOL\n` +
        `Exit: ${solBack.toFixed(4)} SOL\n` +
        `P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SOL (${
          pnlPct >= 0 ? "+" : ""
        }${pnlPct.toFixed(2)}%)\n\n` +
        `[Buy TX](https://solscan.io/tx/${buySig})\n` +
        `[Sell TX](https://solscan.io/tx/${sellSig})`
    );

    console.log(`${GREEN}✅ TEST ERFOLGREICH ABGESCHLOSSEN!${RESET}\n`);
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
    await telegram(`❌ *TEST FAILED*\n${error.message}`);
    process.exit(1);
  }
}

main();
