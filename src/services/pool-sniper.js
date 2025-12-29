/**
 * 🎯 POOL SNIPER - Neue Liquidity Pools erkennen
 *
 * GEHEIMNIS: Raydium Pools werden erstellt BEVOR der erste Trade passiert!
 * Wenn du das Pool-Create Event siehst → KAUFEN bevor andere es sehen
 */

import { Connection, PublicKey } from "@solana/web3.js";
import EventEmitter from "eventemitter3";

// Raydium Program IDs
const RAYDIUM_PROGRAMS = {
  AMM_V4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  CLMM: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  CPMM: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
};

// Orca Program
const ORCA_WHIRLPOOL = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

// Meteora Program
const METEORA_DLMM = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";

class PoolSniper extends EventEmitter {
  constructor(connection) {
    super();
    this.connection = connection;
    this.subscriptions = [];
    this.isRunning = false;
    this.seenPools = new Set();
    this.poolQueue = [];
  }

  /**
   * 🚀 Starte Pool Monitoring
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("🎯 Pool Sniper gestartet...");
    console.log("   Monitoring: Raydium, Orca, Meteora");

    // Subscribe zu allen DEX Programs
    await this.subscribeToProgram("Raydium AMM", RAYDIUM_PROGRAMS.AMM_V4);
    await this.subscribeToProgram("Raydium CLMM", RAYDIUM_PROGRAMS.CLMM);
    await this.subscribeToProgram("Raydium CPMM", RAYDIUM_PROGRAMS.CPMM);
    await this.subscribeToProgram("Orca Whirlpool", ORCA_WHIRLPOOL);
    await this.subscribeToProgram("Meteora DLMM", METEORA_DLMM);

    console.log("✅ Pool Sniper aktiv");
  }

  /**
   * 📡 Subscribe zu Program Logs
   */
  async subscribeToProgram(name, programId) {
    try {
      const subId = this.connection.onLogs(
        new PublicKey(programId),
        async (logs, ctx) => {
          await this.handleLogs(name, programId, logs, ctx);
        },
        "confirmed"
      );

      this.subscriptions.push({ name, programId, subId });
      console.log(`   ✓ ${name} subscribed`);
    } catch (error) {
      console.error(`   ✗ ${name} failed:`, error.message);
    }
  }

  /**
   * 🔍 Analysiere Logs für Pool Creation
   */
  async handleLogs(dexName, programId, logs, ctx) {
    const signature = logs.signature;

    // Skip wenn schon gesehen
    if (this.seenPools.has(signature)) return;
    this.seenPools.add(signature);

    // Cleanup alte Signatures (Memory Management)
    if (this.seenPools.size > 10000) {
      const arr = Array.from(this.seenPools);
      this.seenPools = new Set(arr.slice(-5000));
    }

    // Suche nach Pool Creation Patterns
    const logStr = logs.logs.join(" ");

    // Raydium Patterns
    const isPoolCreate =
      logStr.includes("InitializeInstruction") ||
      logStr.includes("initialize2") ||
      (logStr.includes("Initialize") && logStr.includes("pool")) ||
      logStr.includes("CreatePool") ||
      logStr.includes("create_pool");

    if (isPoolCreate) {
      console.log(`\n🆕 NEUER POOL DETECTED!`);
      console.log(`   DEX: ${dexName}`);
      console.log(`   TX: ${signature.slice(0, 20)}...`);

      // Parse Pool Details
      const poolInfo = await this.parsePoolCreation(signature, programId);

      if (poolInfo) {
        console.log(`   Token: ${poolInfo.tokenMint?.slice(0, 12)}...`);
        console.log(`   Liquidity: ${poolInfo.liquiditySol} SOL`);

        // Emit Event für Auto-Buy
        this.emit("new_pool", {
          dex: dexName,
          signature,
          ...poolInfo,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * 🔬 Parse Pool Creation Transaction
   */
  async parsePoolCreation(signature, programId) {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta) return null;

      // Finde Token Mints aus der TX
      const preTokenBalances = tx.meta.preTokenBalances || [];
      const postTokenBalances = tx.meta.postTokenBalances || [];

      // Finde den neuen Token (nicht SOL, nicht bekannte Stable)
      const KNOWN_TOKENS = [
        "So11111111111111111111111111111111111111112", // WSOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
      ];

      let tokenMint = null;
      let liquiditySol = 0;

      // Analysiere Token Balances
      for (const balance of postTokenBalances) {
        if (!KNOWN_TOKENS.includes(balance.mint)) {
          tokenMint = balance.mint;
        }
        if (balance.mint === KNOWN_TOKENS[0]) {
          liquiditySol = parseFloat(balance.uiTokenAmount.uiAmount || 0);
        }
      }

      // SOL aus Account Balances
      if (tx.meta.postBalances && tx.meta.preBalances) {
        const solChange =
          tx.meta.preBalances.reduce((a, b) => a + b, 0) -
          tx.meta.postBalances.reduce((a, b) => a + b, 0);
        if (solChange > 0) {
          liquiditySol = Math.max(liquiditySol, solChange / 1e9);
        }
      }

      return {
        tokenMint,
        liquiditySol,
        programId,
        slot: tx.slot,
        blockTime: tx.blockTime,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 🛑 Stoppe Monitoring
   */
  async stop() {
    this.isRunning = false;

    for (const sub of this.subscriptions) {
      try {
        await this.connection.removeOnLogsListener(sub.subId);
      } catch (e) {}
    }
    this.subscriptions = [];

    console.log("🛑 Pool Sniper gestoppt");
  }

  /**
   * 📊 Stats
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      subscriptions: this.subscriptions.map((s) => s.name),
      poolsDetected: this.seenPools.size,
    };
  }
}

export default PoolSniper;
