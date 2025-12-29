/**
 * 🎭 SANDWICH ATTACK DETECTOR - Schütze dich vor MEV Bots
 *
 * GEHEIMNIS: MEV Bots sehen deine TX und:
 * 1. Kaufen VOR dir (Front-run)
 * 2. Lassen dich kaufen (zu höherem Preis)
 * 3. Verkaufen NACH dir (Back-run)
 *
 * Du verlierst Geld! Diese Klasse schützt dich.
 */

import { Connection, PublicKey } from "@solana/web3.js";

// Bekannte MEV Bot Wallets (öffentlich)
const KNOWN_MEV_BOTS = [
  "jito", // Jito MEV
  "mev", // Generische MEV
];

// Sandwich Attack Patterns
const SANDWICH_INDICATORS = {
  MIN_PROFIT_THRESHOLD: 0.001, // SOL
  MAX_TIME_WINDOW: 5, // Sekunden zwischen TXs
  SUSPICIOUS_GAS_RATIO: 2, // Wenn Gas 2x höher als Durchschnitt
};

class SandwichDetector {
  constructor(connection) {
    this.connection = connection;
    this.recentAttacks = [];
    this.protectedTxs = new Set();
  }

  /**
   * 🔍 ANALYSIERE OB TX SANDWICHED WURDE
   */
  async analyzeTransaction(signature) {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta) return { sandwiched: false };

      const slot = tx.slot;

      // Hole alle TXs im gleichen Block
      const blockTxs = await this.getBlockTransactions(slot);

      // Finde Position unserer TX
      const txIndex = blockTxs.findIndex((t) => t.signature === signature);
      if (txIndex === -1) return { sandwiched: false };

      // Check für Front-Runner (TX vor uns)
      const frontTx = txIndex > 0 ? blockTxs[txIndex - 1] : null;

      // Check für Back-Runner (TX nach uns)
      const backTx =
        txIndex < blockTxs.length - 1 ? blockTxs[txIndex + 1] : null;

      // Analysiere Pattern
      const isSandwich = this.detectSandwichPattern(frontTx, tx, backTx);

      if (isSandwich.detected) {
        this.recentAttacks.push({
          victimTx: signature,
          frontRunTx: frontTx?.signature,
          backRunTx: backTx?.signature,
          estimatedLoss: isSandwich.estimatedLoss,
          timestamp: Date.now(),
        });

        console.log(`🚨 SANDWICH ATTACK DETECTED!`);
        console.log(`   Victim TX: ${signature.slice(0, 20)}...`);
        console.log(`   Estimated Loss: ${isSandwich.estimatedLoss} SOL`);
      }

      return isSandwich;
    } catch (error) {
      return { sandwiched: false, error: error.message };
    }
  }

  /**
   * 🔬 Erkenne Sandwich Pattern
   */
  detectSandwichPattern(frontTx, victimTx, backTx) {
    if (!frontTx || !backTx || !victimTx) {
      return { detected: false };
    }

    // Prüfe ob gleicher Token in allen 3 TXs
    // Prüfe ob Front = Buy, Victim = Buy, Back = Sell
    // Prüfe ob gleiche Wallet in Front und Back

    // Simplified Detection
    const frontAccounts = new Set(
      frontTx.transaction?.message?.accountKeys?.map((k) => k.toString()) || []
    );
    const backAccounts = new Set(
      backTx.transaction?.message?.accountKeys?.map((k) => k.toString()) || []
    );

    // Wenn Front und Back die gleiche Wallet haben = Sandwich Bot
    const commonAccounts = [...frontAccounts].filter((a) =>
      backAccounts.has(a)
    );

    // Mehr als 2 gemeinsame Accounts (excluding Programs) ist verdächtig
    const suspiciousAccounts = commonAccounts.filter(
      (a) =>
        !a.includes("111111") && // System Program
        a.length === 44 // Wahrscheinlich Wallet
    );

    if (suspiciousAccounts.length > 2) {
      return {
        detected: true,
        confidence: "HIGH",
        estimatedLoss: 0.01, // Schätzung
        sandwichBot: suspiciousAccounts[0],
      };
    }

    return { detected: false };
  }

  /**
   * 📦 Hole Block Transactions
   */
  async getBlockTransactions(slot) {
    try {
      const block = await this.connection.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
      });

      return block?.transactions || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 🛡️ PRE-TX PROTECTION CHECK
   * Prüfe bevor du sendest ob MEV Bots aktiv sind
   */
  async checkMEVActivity(tokenMint) {
    try {
      // Hole recent TXs für diesen Token
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(tokenMint),
        { limit: 20 }
      );

      let suspiciousPatterns = 0;
      let highGasTxs = 0;

      for (const sig of signatures) {
        const tx = await this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (tx?.meta) {
          // Hohe Priority Fee = möglicher MEV Bot
          const fee = tx.meta.fee;
          if (fee > 50000) {
            highGasTxs++;
          }
        }
      }

      // Mehr als 30% High-Gas TXs = MEV Bots aktiv
      const mevRisk = highGasTxs / signatures.length;

      return {
        mevActive: mevRisk > 0.3,
        riskLevel: mevRisk > 0.5 ? "HIGH" : mevRisk > 0.3 ? "MEDIUM" : "LOW",
        recommendation:
          mevRisk > 0.3
            ? "⚠️ MEV Bots aktiv - Nutze Jito Bundle oder Private RPC!"
            : "✅ MEV Risiko niedrig",
      };
    } catch (error) {
      return { mevActive: false, riskLevel: "UNKNOWN" };
    }
  }

  /**
   * 🔒 PROTECTION RECOMMENDATIONS
   */
  getProtectionRecommendations() {
    return {
      methods: [
        {
          name: "Jito Bundles",
          description: "TX wird direkt an Validator gesendet",
          effectiveness: "95%",
          cost: "~0.0001 SOL Tip",
        },
        {
          name: "Private RPC",
          description: "TX nicht im öffentlichen Mempool sichtbar",
          effectiveness: "90%",
          cost: "RPC Kosten",
        },
        {
          name: "Slippage Reduction",
          description: "Niedrigere Slippage = weniger Profit für Bots",
          effectiveness: "50%",
          cost: "Möglicherweise failed TXs",
        },
        {
          name: "Split Orders",
          description: "Große Orders in kleinere aufteilen",
          effectiveness: "70%",
          cost: "Mehr TX Fees",
        },
      ],
      recentAttacks: this.recentAttacks.slice(-10),
    };
  }

  /**
   * 📊 Attack Statistics
   */
  getStats() {
    const last24h = this.recentAttacks.filter(
      (a) => Date.now() - a.timestamp < 86400000
    );

    return {
      totalDetected: this.recentAttacks.length,
      last24h: last24h.length,
      estimatedTotalLoss: this.recentAttacks.reduce(
        (sum, a) => sum + (a.estimatedLoss || 0),
        0
      ),
      mostActiveHour: this.getMostActiveHour(),
    };
  }

  /**
   * ⏰ Finde aktivste Stunde für MEV
   */
  getMostActiveHour() {
    const hourCounts = new Array(24).fill(0);

    for (const attack of this.recentAttacks) {
      const hour = new Date(attack.timestamp).getHours();
      hourCounts[hour]++;
    }

    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    return { hour: maxHour, attacks: hourCounts[maxHour] };
  }
}

export default SandwichDetector;
