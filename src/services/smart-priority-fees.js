/**
 * ⚡ SMART PRIORITY FEES - Optimale Fee Berechnung
 *
 * Geheimnis: Die meisten zahlen VIEL zu viel!
 * - Analysiere aktuelle Network Fees
 * - Bezahle nur was nötig ist
 * - Spare 50-90% vs. blindes Overbidding
 */

import { Connection } from "@solana/web3.js";
import fetch from "node-fetch";

// Fee Levels (in microlamports pro Compute Unit)
const FEE_LEVELS = {
  LOW: 1000, // ~0.0001 SOL für normale TX
  MEDIUM: 10000, // ~0.001 SOL
  HIGH: 50000, // ~0.005 SOL
  URGENT: 100000, // ~0.01 SOL
  SNIPE: 500000, // ~0.05 SOL - Für kritische Snipes
  MEGA: 1000000, // ~0.1 SOL - Wenn's sein muss
};

class SmartPriorityFees {
  constructor(connection) {
    this.connection = connection;
    this.feeCache = {
      data: null,
      timestamp: 0,
      ttl: 5000, // 5 Sekunden Cache
    };
    this.historicalFees = [];
  }

  /**
   * 🎯 OPTIMALE FEE BERECHNEN
   *
   * @param {string} urgency - low, medium, high, urgent, snipe
   * @param {number} computeUnits - Geschätzte Compute Units (default 200k)
   */
  async getOptimalFee(urgency = "medium", computeUnits = 200000) {
    // Hole aktuelle Network Fees
    const networkFees = await this.getNetworkFees();

    // Berechne Perzentile
    const p50 = networkFees.percentile50;
    const p75 = networkFees.percentile75;
    const p90 = networkFees.percentile90;

    let priorityFee;

    switch (urgency) {
      case "low":
        // 50th percentile - sollte durchgehen, aber nicht sofort
        priorityFee = Math.max(FEE_LEVELS.LOW, p50);
        break;

      case "medium":
        // 75th percentile - gute Chance auf schnelle Execution
        priorityFee = Math.max(FEE_LEVELS.MEDIUM, p75);
        break;

      case "high":
        // 90th percentile - sehr wahrscheinlich schnell
        priorityFee = Math.max(FEE_LEVELS.HIGH, p90);
        break;

      case "urgent":
        // 90th + 50% - fast garantiert schnell
        priorityFee = Math.max(FEE_LEVELS.URGENT, p90 * 1.5);
        break;

      case "snipe":
        // Maximum für kritische Snipes
        priorityFee = Math.max(FEE_LEVELS.SNIPE, p90 * 3);
        break;

      default:
        priorityFee = FEE_LEVELS.MEDIUM;
    }

    // Berechne Total Fee
    const totalFee = Math.floor((priorityFee * computeUnits) / 1000000);

    return {
      microLamports: Math.floor(priorityFee),
      totalLamports: totalFee,
      totalSol: totalFee / 1e9,
      urgency,
      networkP50: p50,
      networkP90: p90,
    };
  }

  /**
   * 📊 Hole aktuelle Network Fees
   */
  async getNetworkFees() {
    // Check Cache
    if (
      this.feeCache.data &&
      Date.now() - this.feeCache.timestamp < this.feeCache.ttl
    ) {
      return this.feeCache.data;
    }

    try {
      // Methode 1: Helius Priority Fee API
      if (process.env.HELIUS_API_KEY) {
        const heliusFees = await this.getHeliusFees();
        if (heliusFees) {
          this.feeCache.data = heliusFees;
          this.feeCache.timestamp = Date.now();
          return heliusFees;
        }
      }

      // Methode 2: Recent Prioritization Fees von RPC
      const recentFees = await this.connection.getRecentPrioritizationFees();

      if (recentFees.length > 0) {
        const fees = recentFees
          .map((f) => f.prioritizationFee)
          .filter((f) => f > 0)
          .sort((a, b) => a - b);

        const result = {
          min: fees[0] || 0,
          max: fees[fees.length - 1] || 0,
          percentile50: this.percentile(fees, 50),
          percentile75: this.percentile(fees, 75),
          percentile90: this.percentile(fees, 90),
          average: fees.reduce((a, b) => a + b, 0) / fees.length,
          samples: fees.length,
        };

        this.feeCache.data = result;
        this.feeCache.timestamp = Date.now();
        return result;
      }
    } catch (error) {
      console.error("Failed to get network fees:", error);
    }

    // Fallback: Standard Werte
    return {
      min: 1000,
      max: 100000,
      percentile50: 5000,
      percentile75: 15000,
      percentile90: 50000,
      average: 20000,
      samples: 0,
    };
  }

  /**
   * 🔷 Helius Priority Fee API
   */
  async getHeliusFees() {
    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getPriorityFeeEstimate",
            params: [
              {
                accountKeys: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
                options: { includeAllPriorityFeeLevels: true },
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const levels = data.result?.priorityFeeLevels;

      if (levels) {
        return {
          min: levels.min || 0,
          max: levels.max || 100000,
          percentile50: levels.medium || 5000,
          percentile75: levels.high || 15000,
          percentile90: levels.veryHigh || 50000,
          average: levels.medium || 10000,
          samples: 1,
        };
      }
    } catch (error) {
      // Fallback to RPC method
    }
    return null;
  }

  /**
   * 📈 Berechne Perzentil
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * (p / 100)) - 1;
    return arr[Math.max(0, index)];
  }

  /**
   * 💡 FEE EMPFEHLUNG basierend auf Trade
   */
  async recommendFee(tradeType, amountSol) {
    // Kleine Trades brauchen keine hohen Fees
    if (amountSol < 0.1) {
      return this.getOptimalFee("medium");
    }

    // Normale Trades
    if (amountSol < 1) {
      return this.getOptimalFee("high");
    }

    // Große Trades - hier lohnt sich Speed
    if (amountSol < 10) {
      return this.getOptimalFee("urgent");
    }

    // Sehr große Trades - Maximum Priority
    return this.getOptimalFee("snipe");
  }

  /**
   * 🎮 DYNAMIC FEE für Snipes
   * Passt Fee an basierend auf Wettbewerb
   */
  async getDynamicSnipeFee(tokenMint) {
    const networkFees = await this.getNetworkFees();

    // Bei hoher Network Activity: höhere Fees
    const congestionMultiplier = networkFees.percentile90 > 100000 ? 2 : 1;

    // Base Snipe Fee
    const baseFee = FEE_LEVELS.SNIPE;

    // Final Fee mit Congestion Adjustment
    const finalFee = Math.floor(baseFee * congestionMultiplier);

    return {
      microLamports: finalFee,
      totalLamports: Math.floor((finalFee * 200000) / 1000000),
      congestion: congestionMultiplier > 1 ? "HIGH" : "NORMAL",
      recommendation:
        congestionMultiplier > 1
          ? "⚠️ Network überlastet - höhere Fee empfohlen"
          : "✅ Network normal",
    };
  }

  /**
   * 📊 Fee Statistiken
   */
  async getStats() {
    const fees = await this.getNetworkFees();
    return {
      network: fees,
      recommendations: {
        casual: await this.getOptimalFee("low"),
        normal: await this.getOptimalFee("medium"),
        fast: await this.getOptimalFee("high"),
        urgent: await this.getOptimalFee("urgent"),
        snipe: await this.getOptimalFee("snipe"),
      },
    };
  }
}

export default SmartPriorityFees;
