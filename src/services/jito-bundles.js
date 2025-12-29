/**
 * 🚀 JITO BUNDLES - MEV Protection & Guaranteed Execution
 *
 * Geheimnis: Deine TX wird in einem "Bundle" direkt an Jito Validators gesendet
 * - Kein Front-Running möglich
 * - Garantierte Reihenfolge
 * - Schneller als normale TXs
 */

import { Connection, VersionedTransaction, PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";
import bs58 from "bs58";

// Jito Block Engine Endpoints
const JITO_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

// Jito Tip Accounts - Du musst einen Tip zahlen
const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

class JitoBundleService {
  constructor() {
    this.currentEndpoint = 0;
    this.tipAmount = 10000; // 0.00001 SOL default tip
  }

  /**
   * Wähle zufälligen Tip Account
   */
  getRandomTipAccount() {
    const index = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
    return new PublicKey(JITO_TIP_ACCOUNTS[index]);
  }

  /**
   * Rotiere Endpoint für Load Balancing
   */
  getNextEndpoint() {
    this.currentEndpoint = (this.currentEndpoint + 1) % JITO_ENDPOINTS.length;
    return JITO_ENDPOINTS[this.currentEndpoint];
  }

  /**
   * 🔥 HAUPTFUNKTION: Sende Bundle an Jito
   *
   * @param {VersionedTransaction[]} transactions - Array von signierten TXs
   * @param {number} tipLamports - Tip in Lamports (höher = schneller)
   */
  async sendBundle(transactions, tipLamports = null) {
    const tip = tipLamports || this.tipAmount;

    // Konvertiere TXs zu Base58
    const encodedTransactions = transactions.map((tx) =>
      bs58.encode(tx.serialize())
    );

    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [encodedTransactions],
    };

    // Versuche alle Endpoints
    for (let i = 0; i < JITO_ENDPOINTS.length; i++) {
      const endpoint = this.getNextEndpoint();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          timeout: 5000,
        });

        const result = await response.json();

        if (result.result) {
          console.log(`✅ Jito Bundle gesendet: ${result.result}`);
          return {
            success: true,
            bundleId: result.result,
            endpoint,
          };
        }

        if (result.error) {
          console.log(`⚠️ Jito Error (${endpoint}): ${result.error.message}`);
        }
      } catch (error) {
        console.log(`⚠️ Jito Endpoint failed: ${endpoint}`);
      }
    }

    return { success: false, error: "All Jito endpoints failed" };
  }

  /**
   * 🎯 SNIPE BUNDLE: Optimiert für Token Sniping
   * Höherer Tip für garantierte schnelle Execution
   */
  async sendSnipeBundle(transactions) {
    // Für Snipes: 0.0001 SOL Tip (sehr schnell)
    return this.sendBundle(transactions, 100000);
  }

  /**
   * 📊 Bundle Status prüfen
   */
  async getBundleStatus(bundleId) {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "getBundleStatuses",
      params: [[bundleId]],
    };

    try {
      const response = await fetch(JITO_ENDPOINTS[0], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return result.result?.value?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 💰 Tip Amount basierend auf Urgency
   */
  calculateTip(urgency = "normal") {
    const tips = {
      low: 5000, // 0.000005 SOL
      normal: 10000, // 0.00001 SOL
      high: 50000, // 0.00005 SOL
      urgent: 100000, // 0.0001 SOL
      snipe: 500000, // 0.0005 SOL - für kritische Snipes
    };
    return tips[urgency] || tips.normal;
  }
}

export default new JitoBundleService();
