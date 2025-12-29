/**
 * 🧠 SMART MONEY TRACKER - Finde die besten Trader
 *
 * GEHEIMNIS: Nicht alle Wallets sind gleich gut!
 * Diese Klasse analysiert Wallets und findet die profitabelsten.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";

class SmartMoneyTracker {
  constructor(connection) {
    this.connection = connection;
    this.walletScores = new Map();
    this.profitableWallets = [];
  }

  /**
   * 🔍 ANALYSIERE WALLET PROFITABILITÄT
   */
  async analyzeWallet(walletAddress) {
    try {
      // Hole letzte 100 TXs
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(walletAddress),
        { limit: 100 }
      );

      let wins = 0;
      let losses = 0;
      let totalProfit = 0;
      const tokens = new Map();

      for (const sig of signatures.slice(0, 50)) {
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta) continue;

          // Analysiere SOL Changes
          const solChange =
            (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9;

          if (solChange > 0.01) {
            wins++;
            totalProfit += solChange;
          } else if (solChange < -0.01) {
            losses++;
            totalProfit += solChange;
          }

          // Token Tracking
          for (const balance of tx.meta.postTokenBalances || []) {
            if (balance.owner === walletAddress) {
              tokens.set(balance.mint, (tokens.get(balance.mint) || 0) + 1);
            }
          }
        } catch (e) {}
      }

      const totalTrades = wins + losses;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      const score = {
        address: walletAddress,
        wins,
        losses,
        totalTrades,
        winRate,
        totalProfitSol: totalProfit,
        uniqueTokens: tokens.size,
        score: this.calculateScore(winRate, totalProfit, totalTrades),
        analyzedAt: Date.now(),
      };

      this.walletScores.set(walletAddress, score);
      return score;
    } catch (error) {
      return null;
    }
  }

  /**
   * 📊 Berechne Wallet Score
   */
  calculateScore(winRate, profit, trades) {
    // Gewichtung: Win Rate 40%, Profit 40%, Activity 20%
    const winRateScore = Math.min(winRate, 100);
    const profitScore = Math.min(Math.max(profit * 10, 0), 100);
    const activityScore = Math.min(trades * 2, 100);

    return Math.round(
      winRateScore * 0.4 + profitScore * 0.4 + activityScore * 0.2
    );
  }

  /**
   * 🐋 FINDE TOP TRADER für einen Token
   */
  async findTopTraders(tokenMint, limit = 10) {
    try {
      // Hole Top Holder
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const pair = data.pairs?.[0];

      if (!pair) return [];

      // Für jeden Top Holder: Analysiere Profitabilität
      // In Realität würdest du Helius oder andere APIs für Holder List nutzen

      return this.profitableWallets.slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  /**
   * 📈 FINDE PROFITABLE WALLETS aus Recent Trades
   */
  async findProfitableWallets(tokenMint) {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(tokenMint),
        { limit: 50 }
      );

      const wallets = new Map();

      for (const sig of signatures) {
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta) continue;

          // Finde Trader Wallets
          for (const balance of tx.meta.postTokenBalances || []) {
            if (balance.mint === tokenMint && balance.owner) {
              wallets.set(balance.owner, (wallets.get(balance.owner) || 0) + 1);
            }
          }
        } catch (e) {}
      }

      // Sortiere nach Aktivität
      const sorted = Array.from(wallets.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      // Analysiere Top Wallets
      const analyzed = [];
      for (const [wallet, trades] of sorted) {
        const score = await this.analyzeWallet(wallet);
        if (score && score.winRate > 50) {
          analyzed.push(score);
        }
      }

      this.profitableWallets = analyzed
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return this.profitableWallets;
    } catch (error) {
      return [];
    }
  }

  /**
   * 🔥 EARLY BUYERS - Wer hat früh gekauft?
   */
  async findEarlyBuyers(tokenMint) {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(tokenMint),
        { limit: 100 }
      );

      // Die ältesten TXs sind die Early Buyers
      const earlyTxs = signatures.slice(-20);
      const earlyBuyers = new Set();

      for (const sig of earlyTxs) {
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta) continue;

          for (const balance of tx.meta.postTokenBalances || []) {
            if (balance.mint === tokenMint && balance.owner) {
              earlyBuyers.add(balance.owner);
            }
          }
        } catch (e) {}
      }

      return Array.from(earlyBuyers);
    } catch (error) {
      return [];
    }
  }

  /**
   * 🎯 COPY TRADE EMPFEHLUNG
   */
  async getCopyTradeRecommendation(tokenMint) {
    const profitable = await this.findProfitableWallets(tokenMint);
    const earlyBuyers = await this.findEarlyBuyers(tokenMint);

    // Finde Wallets die sowohl early als auch profitabel sind
    const smartMoney = profitable.filter((w) =>
      earlyBuyers.includes(w.address)
    );

    return {
      smartMoneyWallets: smartMoney,
      profitableWallets: profitable,
      earlyBuyers: earlyBuyers.slice(0, 10),
      recommendation:
        smartMoney.length > 0
          ? "🟢 Smart Money detected - Consider following"
          : "🟡 No clear smart money signal",
    };
  }

  /**
   * 📊 Wallet Leaderboard
   */
  getLeaderboard() {
    return Array.from(this.walletScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}

export default SmartMoneyTracker;
