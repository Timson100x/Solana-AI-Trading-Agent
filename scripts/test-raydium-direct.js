#!/usr/bin/env node
/**
 * Direct Raydium Swap Test
 * Holt Quote und sendet direkt zum Swap
 */

import "dotenv/config";
import {
  Connection,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import axios from "axios";
import { WalletService } from "../src/services/wallet.js";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const WSOL = "So11111111111111111111111111111111111111112";

async function directRaydiumSwap() {
  console.log("\n🚀 DIRECT RAYDIUM SWAP TEST\n");

  const connection = new Connection(process.env.RPC_ENDPOINT, "confirmed");
  const wallet = new WalletService(connection);
  await wallet.initialize();

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  // Step 1: Get fresh quote
  console.log("📊 Schritt 1: Hole frischen Quote...");
  const amount = 5000000; // 0.005 SOL

  const quoteRes = await axios.get(
    `https://transaction-v1.raydium.io/compute/swap-base-in?` +
      `inputMint=${WSOL}&outputMint=${BONK}&amount=${amount}&slippageBps=150&txVersion=V0`
  );

  if (!quoteRes.data.success) {
    throw new Error(`Quote failed: ${JSON.stringify(quoteRes.data)}`);
  }

  console.log(
    `✅ Quote erhalten: ${(
      quoteRes.data.data.outputAmount / 1e5
    ).toLocaleString()} BONK`
  );
  console.log(`   Route: ${quoteRes.data.data.routePlan.length} pools\n`);

  // Step 2: Request swap transaction
  console.log("📝 Schritt 2: Erstelle Swap Transaction...");

  const swapPayload = {
    computeUnitPriceMicroLamports: "20000",
    swapResponse: quoteRes.data.data,
    txVersion: "V0",
    wallet: wallet.publicKey.toBase58(),
    wrapSol: true,
    unwrapSol: true,
  };

  console.log(
    "Payload:",
    JSON.stringify(swapPayload, null, 2).slice(0, 500) + "...\n"
  );

  const swapRes = await axios.post(
    "https://transaction-v1.raydium.io/transaction/swap-base-in",
    swapPayload,
    {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    }
  );

  console.log("Response:", JSON.stringify(swapRes.data, null, 2));

  if (!swapRes.data.success) {
    throw new Error(`Swap failed: ${swapRes.data.msg}`);
  }

  console.log("\n✅ Transaction erhalten!");

  // Step 3: Sign and send
  console.log("✍️ Schritt 3: Signiere & Sende...");

  const txBuf = Buffer.from(swapRes.data.data.transaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet.keypair]);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`\n✅ TX gesendet: ${signature}`);
  console.log(`   Solscan: https://solscan.io/tx/${signature}\n`);
}

directRaydiumSwap().catch(console.error);
