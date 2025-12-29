#!/usr/bin/env node
/**
 * Test Trading via Raydium API
 * Uses Raydium SDK since Jupiter DNS is blocked in Codespace
 */

import "dotenv/config";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import { WalletService } from "../src/services/wallet.js";

// Colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

// Test config
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const WSOL = "So11111111111111111111111111111111111111112";
const TEST_AMOUNT_SOL = 0.005;

async function testRaydiumTrade() {
  console.log(`\n${MAGENTA}🚀 RAYDIUM TRADING TEST${RESET}`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Initialize
    console.log(`\n${CYAN}⚙️ Initialisiere Services...${RESET}`);

    const connection = new Connection(process.env.RPC_ENDPOINT, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });

    const wallet = new WalletService(connection);
    await wallet.initialize();

    console.log(
      `${GREEN}✅ Wallet: ${wallet.publicKey
        .toBase58()
        .slice(0, 12)}...${RESET}`
    );

    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    console.log(`${GREEN}💰 Balance: ${balanceSOL.toFixed(4)} SOL${RESET}`);

    if (balanceSOL < TEST_AMOUNT_SOL + 0.01) {
      console.log(`${RED}❌ Nicht genug Balance für Test!${RESET}`);
      process.exit(1);
    }

    // Step 1: Get Raydium Quote
    console.log(`\n${YELLOW}📊 SCHRITT 1: Raydium Quote holen${RESET}`);
    console.log(`${"─".repeat(40)}`);

    const lamports = Math.floor(TEST_AMOUNT_SOL * LAMPORTS_PER_SOL);

    const quoteParams = new URLSearchParams({
      inputMint: WSOL,
      outputMint: BONK,
      amount: lamports.toString(),
      slippageBps: "150",
      txVersion: "V0",
    });

    console.log(`${CYAN}Anfrage: ${TEST_AMOUNT_SOL} SOL → BONK${RESET}`);

    const quoteRes = await axios.get(
      `https://transaction-v1.raydium.io/compute/swap-base-in?${quoteParams}`,
      { timeout: 15000 }
    );

    if (!quoteRes.data.success) {
      throw new Error(`Quote Fehler: ${JSON.stringify(quoteRes.data)}`);
    }

    const quoteData = quoteRes.data.data;
    const expectedTokens = parseInt(quoteData.outputAmount);
    console.log(`${GREEN}✅ Quote erhalten:${RESET}`);
    console.log(
      `   Erwartete BONK: ${(expectedTokens / 1e5).toLocaleString()}`
    );
    console.log(`   Preis Impact: ${quoteData.priceImpactPct || "0"}%`);

    // Step 2: Get Swap Transaction
    console.log(`\n${YELLOW}📝 SCHRITT 2: Swap Transaction erstellen${RESET}`);
    console.log(`${"─".repeat(40)}`);

    const swapRes = await axios.post(
      "https://transaction-v1.raydium.io/transaction/swap-base-in",
      {
        computeUnitPriceMicroLamports: "100000",
        swapResponse: quoteData,
        txVersion: "V0",
        wallet: wallet.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: true,
      },
      { timeout: 15000 }
    );

    if (!swapRes.data.success) {
      throw new Error(`Swap TX Fehler: ${JSON.stringify(swapRes.data)}`);
    }

    console.log(`${GREEN}✅ Swap Transaction erhalten${RESET}`);

    // Step 3: Sign and send
    console.log(`\n${YELLOW}✍️ SCHRITT 3: Signieren & Senden${RESET}`);
    console.log(`${"─".repeat(40)}`);

    const txData = swapRes.data.data;
    const txBuf = Buffer.from(txData.transaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);

    // Sign with wallet
    tx.sign([wallet.keypair]);

    console.log(`${CYAN}📤 Sende Transaction...${RESET}`);

    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    console.log(`${GREEN}✅ TX gesendet: ${signature.slice(0, 12)}...${RESET}`);
    console.log(`   Solscan: https://solscan.io/tx/${signature}`);

    // Wait for confirmation
    console.log(`${CYAN}⏳ Warte auf Bestätigung...${RESET}`);

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: tx.message.recentBlockhash,
        lastValidBlockHeight: (
          await connection.getLatestBlockhash()
        ).lastValidBlockHeight,
      },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(
        `TX fehlgeschlagen: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    console.log(`${GREEN}✅ KAUF ERFOLGREICH!${RESET}`);

    // Wait for balance update
    await new Promise((r) => setTimeout(r, 3000));

    // Step 4: Check token balance
    console.log(`\n${YELLOW}💰 SCHRITT 4: Token Balance prüfen${RESET}`);
    console.log(`${"─".repeat(40)}`);

    const tokenBalance = await getTokenBalance(
      connection,
      wallet.publicKey,
      BONK
    );
    console.log(
      `${GREEN}✅ BONK Balance: ${(
        tokenBalance / 1e5
      ).toLocaleString()}${RESET}`
    );

    // Step 5: Sell back
    if (tokenBalance > 1000) {
      console.log(`\n${YELLOW}💸 SCHRITT 5: Token zurückverkaufen${RESET}`);
      console.log(`${"─".repeat(40)}`);

      // Get sell quote
      const sellParams = new URLSearchParams({
        inputMint: BONK,
        outputMint: WSOL,
        amount: Math.floor(tokenBalance).toString(),
        slippageBps: "150",
        txVersion: "V0",
      });

      const sellQuoteRes = await axios.get(
        `https://transaction-v1.raydium.io/compute/swap-base-in?${sellParams}`,
        { timeout: 15000 }
      );

      if (!sellQuoteRes.data.success) {
        throw new Error(
          `Sell Quote Fehler: ${JSON.stringify(sellQuoteRes.data)}`
        );
      }

      const sellQuote = sellQuoteRes.data.data;
      const solBack = parseInt(sellQuote.outputAmount) / LAMPORTS_PER_SOL;
      console.log(`${GREEN}✅ Sell Quote: → ${solBack.toFixed(4)} SOL${RESET}`);

      // Get sell tx
      const sellSwapRes = await axios.post(
        "https://transaction-v1.raydium.io/transaction/swap-base-in",
        {
          computeUnitPriceMicroLamports: "100000",
          swapResponse: sellQuote,
          txVersion: "V0",
          wallet: wallet.publicKey.toBase58(),
          wrapSol: true,
          unwrapSol: true,
        },
        { timeout: 15000 }
      );

      if (!sellSwapRes.data.success) {
        throw new Error(`Sell TX Fehler: ${JSON.stringify(sellSwapRes.data)}`);
      }

      const sellTxData = sellSwapRes.data.data;
      const sellTxBuf = Buffer.from(sellTxData.transaction, "base64");
      const sellTx = VersionedTransaction.deserialize(sellTxBuf);
      sellTx.sign([wallet.keypair]);

      console.log(`${CYAN}📤 Sende Sell Transaction...${RESET}`);

      const sellSig = await connection.sendRawTransaction(sellTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log(`${GREEN}✅ Sell TX: ${sellSig.slice(0, 12)}...${RESET}`);

      await connection.confirmTransaction(
        {
          signature: sellSig,
          blockhash: sellTx.message.recentBlockhash,
          lastValidBlockHeight: (
            await connection.getLatestBlockhash()
          ).lastValidBlockHeight,
        },
        "confirmed"
      );

      console.log(`${GREEN}✅ VERKAUF ERFOLGREICH!${RESET}`);

      // P&L
      const pnl = solBack - TEST_AMOUNT_SOL;
      const pnlPercent = (pnl / TEST_AMOUNT_SOL) * 100;

      console.log(`\n${MAGENTA}${"═".repeat(50)}${RESET}`);
      console.log(`${MAGENTA}📊 ERGEBNIS:${RESET}`);
      console.log(`   Investiert: ${TEST_AMOUNT_SOL} SOL`);
      console.log(`   Zurück: ~${solBack.toFixed(4)} SOL`);
      console.log(
        `   P&L: ${pnl >= 0 ? GREEN : RED}${pnl.toFixed(
          4
        )} SOL (${pnlPercent.toFixed(2)}%)${RESET}`
      );
      console.log(`${MAGENTA}${"═".repeat(50)}${RESET}`);
    }

    // Final balance
    const finalBalance = await connection.getBalance(wallet.publicKey);
    const finalBalanceSOL = finalBalance / LAMPORTS_PER_SOL;
    const difference = finalBalanceSOL - balanceSOL;

    console.log(`\n${CYAN}📊 WALLET SUMMARY:${RESET}`);
    console.log(`   Start: ${balanceSOL.toFixed(4)} SOL`);
    console.log(`   Ende:  ${finalBalanceSOL.toFixed(4)} SOL`);
    console.log(
      `   Diff:  ${difference >= 0 ? GREEN : RED}${difference.toFixed(
        4
      )} SOL${RESET}`
    );

    console.log(`\n${GREEN}✅ Raydium Trading Test abgeschlossen!${RESET}\n`);
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
    if (error.response) {
      console.log(`Response: ${JSON.stringify(error.response.data)}`);
    }
    console.error(error);
  }
}

async function getTokenBalance(connection, owner, mint) {
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
      mint: new PublicKey(mint),
    });

    if (accounts.value.length === 0) return 0;
    return parseInt(
      accounts.value[0].account.data.parsed.info.tokenAmount.amount
    );
  } catch {
    return 0;
  }
}

// Run
testRaydiumTrade();
