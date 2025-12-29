#!/usr/bin/env node
/**
 * Test Buy - Simuliert und testet einen echten Token-Kauf
 * ⚠️ ACHTUNG: Mit EXECUTE=true wird echter SOL ausgegeben!
 */

import "dotenv/config";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

console.log(`\n${BLUE}🧪 TEST BUY - Solana AI Trading Agent${RESET}\n`);
console.log("=".repeat(60));

// Konfiguration
const TEST_TOKEN =
  process.argv[2] || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC als Test
const TEST_AMOUNT_SOL = parseFloat(process.argv[3] || "0.001"); // Minimal-Betrag
const EXECUTE = process.argv[4] === "--execute";

console.log(`\n${YELLOW}📋 Test-Konfiguration:${RESET}`);
console.log(`Token: ${TEST_TOKEN.slice(0, 20)}...`);
console.log(`Betrag: ${TEST_AMOUNT_SOL} SOL`);
console.log(
  `Modus: ${
    EXECUTE ? `${RED}🔴 LIVE TRADE${RESET}` : `${GREEN}🟢 SIMULATION${RESET}`
  }`
);

// 1. Wallet laden
console.log(`\n${BLUE}1. Wallet prüfen...${RESET}`);

let wallet;
try {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error("WALLET_PRIVATE_KEY nicht gesetzt");

  const decoded = bs58.decode(privateKey);
  wallet = Keypair.fromSecretKey(decoded);
  console.log(
    `${GREEN}✅ Wallet: ${wallet.publicKey.toBase58().slice(0, 12)}...${RESET}`
  );
} catch (error) {
  console.log(`${RED}❌ Wallet-Fehler: ${error.message}${RESET}`);
  process.exit(1);
}

// 2. Balance prüfen
console.log(`\n${BLUE}2. Balance prüfen...${RESET}`);

const connection = new Connection(
  process.env.RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
  "confirmed"
);

try {
  const balance = await connection.getBalance(wallet.publicKey);
  const solBalance = balance / 1e9;
  console.log(`${GREEN}✅ Balance: ${solBalance.toFixed(4)} SOL${RESET}`);

  if (solBalance < TEST_AMOUNT_SOL + 0.01) {
    console.log(
      `${RED}❌ Nicht genug SOL für Test (brauche ${
        TEST_AMOUNT_SOL + 0.01
      } SOL)${RESET}`
    );
    process.exit(1);
  }
} catch (error) {
  console.log(`${RED}❌ Balance-Fehler: ${error.message}${RESET}`);
  process.exit(1);
}

// 3. Jupiter Quote holen
console.log(`\n${BLUE}3. Jupiter Quote holen...${RESET}`);

const SOL_MINT = "So11111111111111111111111111111111111111112";
const lamports = Math.floor(TEST_AMOUNT_SOL * 1e9);

try {
  const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${TEST_TOKEN}&amount=${lamports}&slippageBps=100`;

  const quoteResponse = await fetch(quoteUrl);
  const quote = await quoteResponse.json();

  if (quote.error) {
    throw new Error(quote.error);
  }

  const outAmount =
    parseInt(quote.outAmount) /
    Math.pow(10, quote.outputMint === TEST_TOKEN ? 6 : 9);
  const priceImpact = parseFloat(quote.priceImpactPct || 0);

  console.log(`${GREEN}✅ Quote erhalten:${RESET}`);
  console.log(`   Input: ${TEST_AMOUNT_SOL} SOL`);
  console.log(`   Output: ${outAmount.toFixed(6)} Token`);
  console.log(`   Price Impact: ${priceImpact.toFixed(4)}%`);
  console.log(
    `   Route: ${
      quote.routePlan?.map((r) => r.swapInfo?.label).join(" → ") || "Direct"
    }`
  );

  // 4. Swap ausführen (nur wenn --execute)
  if (EXECUTE) {
    console.log(`\n${RED}4. LIVE SWAP wird ausgeführt...${RESET}`);

    const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });

    const swapData = await swapResponse.json();

    if (swapData.error) {
      throw new Error(swapData.error);
    }

    // Transaction deserialisieren und signieren
    const { VersionedTransaction } = await import("@solana/web3.js");
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Signieren
    transaction.sign([wallet]);

    // Senden
    console.log(`${YELLOW}📤 Sende Transaktion...${RESET}`);
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: true,
        maxRetries: 3,
      }
    );

    console.log(`${GREEN}✅ TRADE AUSGEFÜHRT!${RESET}`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);

    // Bestätigung warten
    console.log(`${YELLOW}⏳ Warte auf Bestätigung...${RESET}`);
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );

    if (confirmation.value.err) {
      console.log(`${RED}❌ Transaktion fehlgeschlagen!${RESET}`);
    } else {
      console.log(`${GREEN}✅ Transaktion bestätigt!${RESET}`);
    }
  } else {
    console.log(
      `\n${YELLOW}4. Simulation abgeschlossen (kein echter Trade)${RESET}`
    );
    console.log(`\n${BLUE}💡 Für echten Trade ausführen:${RESET}`);
    console.log(
      `   node scripts/test-buy.js ${TEST_TOKEN.slice(
        0,
        12
      )}... ${TEST_AMOUNT_SOL} --execute`
    );
  }
} catch (error) {
  console.log(`${RED}❌ Jupiter-Fehler: ${error.message}${RESET}`);
  process.exit(1);
}

console.log("\n" + "=".repeat(60));
console.log(`${GREEN}✅ Test abgeschlossen!${RESET}\n`);
