/**
 * 🐋 WHALE WALLET TRACKER - Copy Trading der Profis
 *
 * Geheimnis: Tracke die besten Wallets und kopiere ihre Trades
 * - Bekannte Profit-Wallets
 * - Real-time Alerts wenn sie kaufen
 * - Auto-Buy wenn Whale kauft
 */

import { Connection, PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";
import EventEmitter from "eventemitter3";

// 🔥 BEKANNTE PROFITABLE WALLETS (Public Knowledge)
const FAMOUS_WHALE_WALLETS = [
  // Diese Wallets haben historisch gute Returns
  // DISCLAIMER: Vergangene Performance ist keine Garantie!

  // Top Degen Traders (öffentlich bekannt)
  "JDcGpKmjkwzKPopJbuqrBc8LSgvKwQGU56WqnhQqMfhJ", // Bekannter Sniper
  "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9", // Memecoin Whale

  // Füge hier eigene Wallets hinzu die du tracken willst
];

// Trading Patterns die wir erkennen wollen
const WHALE_PATTERNS = {
  ACCUMULATION: "accumulation", // Mehrere kleine Buys
  DISTRIBUTION: "distribution", // Mehrere kleine Sells
  SNIPE: "snipe", // Großer Buy in neuem Token
  DUMP: "dump", // Großer Sell
  TRANSFER_IN: "transfer_in", // Token Eingang
  TRANSFER_OUT: "transfer_out", // Token Ausgang
};

class WhaleTracker extends EventEmitter {
  constructor(connection) {
    super();
    this.connection = connection;
    this.trackedWallets = new Map();
    this.walletSubscriptions = new Map();
    this.recentTrades = new Map();
    this.isRunning = false;
  }

  /**
   * 🎯 Wallet zur Tracking-Liste hinzufügen
   */
  addWallet(address, label = "Unknown Whale") {
    this.trackedWallets.set(address, {
      label,
      addedAt: Date.now(),
      trades: [],
      profitLoss: 0,
      winRate: 0,
    });
    console.log(`🐋 Tracking: ${label} (${address.slice(0, 8)}...)`);
  }

  /**
   * 🔍 Starte Real-time Monitoring
   */
  async startTracking() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("🐋 Whale Tracker gestartet...");

    // Für jede Wallet einen WebSocket Listener
    for (const [address, data] of this.trackedWallets) {
      try {
        const pubkey = new PublicKey(address);

        const subscriptionId = this.connection.onAccountChange(
          pubkey,
          async (accountInfo, context) => {
            await this.handleWalletActivity(address, accountInfo, context);
          },
          "confirmed"
        );

        this.walletSubscriptions.set(address, subscriptionId);
        console.log(`📡 Subscribed to ${data.label}`);
      } catch (error) {
        console.error(`Failed to subscribe to ${address}:`, error);
      }
    }

    // Polling-basiertes Tracking als Backup
    this.pollInterval = setInterval(() => this.pollWallets(), 10000);
  }

  /**
   * 🛑 Stoppe Tracking
   */
  async stopTracking() {
    this.isRunning = false;

    for (const [address, subId] of this.walletSubscriptions) {
      await this.connection.removeAccountChangeListener(subId);
    }
    this.walletSubscriptions.clear();

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    console.log("🛑 Whale Tracker gestoppt");
  }

  /**
   * 📊 Poll Wallets für neue Transaktionen
   */
  async pollWallets() {
    for (const [address, data] of this.trackedWallets) {
      try {
        const signatures = await this.connection.getSignaturesForAddress(
          new PublicKey(address),
          { limit: 5 }
        );

        for (const sig of signatures) {
          const sigKey = `${address}-${sig.signature}`;

          if (!this.recentTrades.has(sigKey)) {
            this.recentTrades.set(sigKey, true);
            await this.analyzeTransaction(address, sig.signature);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Cleanup alte Trades (älter als 1 Stunde)
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, _] of this.recentTrades) {
      // Simple cleanup
      if (this.recentTrades.size > 1000) {
        this.recentTrades.delete(key);
      }
    }
  }

  /**
   * 🔬 Analysiere Transaction
   */
  async analyzeTransaction(walletAddress, signature) {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta) return;

      const walletData = this.trackedWallets.get(walletAddress);

      // Finde Token Transfers
      const preBalances = tx.meta.preTokenBalances || [];
      const postBalances = tx.meta.postTokenBalances || [];

      // Analysiere welche Tokens gekauft/verkauft wurden
      const tokenChanges = this.calculateTokenChanges(
        preBalances,
        postBalances,
        walletAddress
      );

      for (const change of tokenChanges) {
        const trade = {
          signature,
          timestamp: tx.blockTime * 1000,
          token: change.mint,
          type: change.amount > 0 ? "BUY" : "SELL",
          amount: Math.abs(change.amount),
          wallet: walletAddress,
          label: walletData.label,
        };

        // Emit Event für Auto-Trading
        this.emit("whale_trade", trade);

        // Log
        const emoji = trade.type === "BUY" ? "🟢" : "🔴";
        console.log(
          `${emoji} ${walletData.label} ${trade.type}: ${change.mint.slice(
            0,
            8
          )}...`
        );

        // Speichere Trade
        walletData.trades.push(trade);
      }
    } catch (error) {
      // Ignore
    }
  }

  /**
   * 📈 Berechne Token Changes
   */
  calculateTokenChanges(preBalances, postBalances, walletAddress) {
    const changes = [];
    const tokenMap = new Map();

    // Pre-Balances sammeln
    for (const balance of preBalances) {
      if (balance.owner === walletAddress) {
        tokenMap.set(balance.mint, {
          mint: balance.mint,
          pre: parseFloat(balance.uiTokenAmount.uiAmount || 0),
        });
      }
    }

    // Post-Balances vergleichen
    for (const balance of postBalances) {
      if (balance.owner === walletAddress) {
        const existing = tokenMap.get(balance.mint) || {
          mint: balance.mint,
          pre: 0,
        };
        const post = parseFloat(balance.uiTokenAmount.uiAmount || 0);
        const change = post - existing.pre;

        if (Math.abs(change) > 0.01) {
          changes.push({
            mint: balance.mint,
            amount: change,
            pre: existing.pre,
            post,
          });
        }
      }
    }

    return changes;
  }

  /**
   * 🔍 Handle Wallet Activity (WebSocket)
   */
  async handleWalletActivity(address, accountInfo, context) {
    const walletData = this.trackedWallets.get(address);
    console.log(
      `🐋 Activity detected: ${walletData?.label || address.slice(0, 8)}`
    );

    // Hole neueste TX
    const signatures = await this.connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: 1 }
    );

    if (signatures.length > 0) {
      await this.analyzeTransaction(address, signatures[0].signature);
    }
  }

  /**
   * 📊 Hole Wallet Stats
   */
  getWalletStats(address) {
    const data = this.trackedWallets.get(address);
    if (!data) return null;

    const buys = data.trades.filter((t) => t.type === "BUY").length;
    const sells = data.trades.filter((t) => t.type === "SELL").length;

    return {
      label: data.label,
      totalTrades: data.trades.length,
      buys,
      sells,
      recentTrades: data.trades.slice(-10),
    };
  }

  /**
   * 🔥 HOT WALLETS: Die aktivsten Wallets gerade
   */
  getHotWallets() {
    const oneHourAgo = Date.now() - 3600000;
    const activity = [];

    for (const [address, data] of this.trackedWallets) {
      const recentTrades = data.trades.filter((t) => t.timestamp > oneHourAgo);
      if (recentTrades.length > 0) {
        activity.push({
          address,
          label: data.label,
          tradesLastHour: recentTrades.length,
          lastTrade: recentTrades[recentTrades.length - 1],
        });
      }
    }

    return activity.sort((a, b) => b.tradesLastHour - a.tradesLastHour);
  }

  /**
   * 🎯 COPY TRADE: Automatisch Whale Trade kopieren
   */
  async copyTrade(trade, amountSol) {
    if (trade.type !== "BUY") {
      console.log("ℹ️ Nur BUY Trades werden kopiert");
      return null;
    }

    console.log(`📋 Kopiere Trade von ${trade.label}...`);
    console.log(`   Token: ${trade.token}`);
    console.log(`   Amount: ${amountSol} SOL`);

    // Emit Event für Trading Service
    this.emit("copy_trade", {
      token: trade.token,
      amount: amountSol,
      reason: `Copy trade from ${trade.label}`,
      originalTrade: trade,
    });

    return {
      success: true,
      token: trade.token,
      amount: amountSol,
    };
  }

  /**
   * ➕ Standard Whales hinzufügen
   */
  addDefaultWhales() {
    for (const address of FAMOUS_WHALE_WALLETS) {
      this.addWallet(address, `Whale ${address.slice(0, 6)}`);
    }
  }
}

export default WhaleTracker;
