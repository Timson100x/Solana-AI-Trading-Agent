#!/usr/bin/env node
/**
 * Test Auto Trading - AI Decision + Real Trade
 * Tests the full trading flow: AI Analysis → Buy → Monitor → Sell
 */

import "dotenv/config";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { JupiterService } from "../src/services/jupiter.js";
import { WalletService } from "../src/services/wallet.js";
import { Logger } from "../src/utils/logger.js";

const logger = new Logger("AutoTrade");

// Colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

// Test token - BONK (liquid, safe for testing)
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const TEST_AMOUNT_SOL = 0.005;

async function testAutoTrade() {
  console.log(`\n${MAGENTA}🤖 AUTO TRADING TEST${RESET}`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Initialize
    console.log(`\n${CYAN}⚙️ Initialisiere Services...${RESET}`);

    const connection = new Connection(process.env.RPC_ENDPOINT, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });

    // Initialize wallet service
    const wallet = new WalletService(connection);
    await wallet.initialize();

    const jupiter = new JupiterService(connection, wallet);

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

    // Test 1: Get Quote
    console.log(`\n${YELLOW}📊 TEST 1: Jupiter Quote${RESET}`);
    console.log(`${"─".repeat(40)}`);

    const lamports = Math.floor(TEST_AMOUNT_SOL * LAMPORTS_PER_SOL);
    const quote = await jupiter.getQuote(
      "So11111111111111111111111111111111111111112", // WSOL
      BONK,
      lamports,
      { slippageBps: 150 }
    );

    const expectedTokens = parseInt(quote.outAmount);
    console.log(`${GREEN}✅ Quote erhalten:${RESET}`);
    console.log(
      `   ${TEST_AMOUNT_SOL} SOL → ${(
        expectedTokens / 1e5
      ).toLocaleString()} BONK`
    );
    console.log(`   Preis Impact: ${quote.priceImpactPct || "0"}%`);

    // Test 2: Execute Buy
    console.log(`\n${YELLOW}🛒 TEST 2: Buy Ausführen${RESET}`);
    console.log(`${"─".repeat(40)}`);

    const buyResult = await jupiter.buyToken(BONK, TEST_AMOUNT_SOL);

    if (buyResult.success) {
      console.log(`${GREEN}✅ KAUF ERFOLGREICH!${RESET}`);
      console.log(`   TX: ${buyResult.signature?.slice(0, 12)}...`);
      console.log(
        `   Tokens: ${(buyResult.tokensReceived / 1e5).toLocaleString()} BONK`
      );
      console.log(`   SOL ausgegeben: ${buyResult.solSpent?.toFixed(4)} SOL`);

      // Wait a bit for transaction to settle
      console.log(`\n${CYAN}⏳ Warte 5 Sekunden...${RESET}`);
      await new Promise((r) => setTimeout(r, 5000));

      // Test 3: Get Token Balance
      console.log(`\n${YELLOW}💰 TEST 3: Token Balance prüfen${RESET}`);
      console.log(`${"─".repeat(40)}`);

      const tokenBalance = await getTokenBalance(
        connection,
        wallet.publicKey,
        BONK
      );
      console.log(
        `${GREEN}✅ BONK Balance: ${tokenBalance.toLocaleString()}${RESET}`
      );

      // Test 4: Sell Quote
      console.log(`\n${YELLOW}📊 TEST 4: Sell Quote${RESET}`);
      console.log(`${"─".repeat(40)}`);

      const sellLamports = Math.floor(tokenBalance); // Sell all
      if (sellLamports < 1000) {
        console.log(`${RED}❌ Token Balance zu klein zum Verkaufen${RESET}`);
      } else {
        const sellQuote = await jupiter.getQuote(
          BONK,
          "So11111111111111111111111111111111111111112", // WSOL
          sellLamports,
          { slippageBps: 150 }
        );

        const solBack = parseInt(sellQuote.outAmount) / LAMPORTS_PER_SOL;
        console.log(`${GREEN}✅ Sell Quote:${RESET}`);
        console.log(
          `   ${(sellLamports / 1e5).toLocaleString()} BONK → ${solBack.toFixed(
            4
          )} SOL`
        );

        // Test 5: Execute Sell
        console.log(`\n${YELLOW}💸 TEST 5: Sell Ausführen${RESET}`);
        console.log(`${"─".repeat(40)}`);

        const sellResult = await jupiter.sellToken(BONK, sellLamports);

        if (sellResult.success) {
          console.log(`${GREEN}✅ VERKAUF ERFOLGREICH!${RESET}`);
          console.log(`   TX: ${sellResult.signature?.slice(0, 12)}...`);
          console.log(
            `   SOL erhalten: ${sellResult.solReceived?.toFixed(4)} SOL`
          );

          // Calculate P&L
          const pnl = (sellResult.solReceived || solBack) - TEST_AMOUNT_SOL;
          const pnlPercent = (pnl / TEST_AMOUNT_SOL) * 100;

          console.log(`\n${MAGENTA}${"═".repeat(50)}${RESET}`);
          console.log(`${MAGENTA}📊 ERGEBNIS:${RESET}`);
          console.log(`   Investiert: ${TEST_AMOUNT_SOL} SOL`);
          console.log(
            `   Zurück: ${(sellResult.solReceived || solBack).toFixed(4)} SOL`
          );
          console.log(
            `   P&L: ${pnl >= 0 ? GREEN : RED}${pnl.toFixed(
              4
            )} SOL (${pnlPercent.toFixed(2)}%)${RESET}`
          );
          console.log(`${MAGENTA}${"═".repeat(50)}${RESET}`);
        } else {
          console.log(
            `${RED}❌ Verkauf fehlgeschlagen: ${sellResult.error}${RESET}`
          );
        }
      }
    } else {
      console.log(`${RED}❌ Kauf fehlgeschlagen: ${buyResult.error}${RESET}`);
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

    console.log(`\n${GREEN}✅ Auto Trading Test abgeschlossen!${RESET}\n`);
  } catch (error) {
    console.log(`${RED}❌ Error: ${error.message}${RESET}`);
    console.error(error);
  }
}

async function getTokenBalance(connection, owner, mint) {
  try {
    const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
      mint: new PublicKey(mint),
    });

    if (accounts.value.length === 0) return 0;
    return accounts.value[0].account.data.parsed.info.tokenAmount.amount;
  } catch {
    return 0;
  }
}

// Run
testAutoTrade();
