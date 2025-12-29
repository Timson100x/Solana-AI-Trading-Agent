/**
 * 📊 VOLUME SPIKE DETECTOR - Ungewöhnliche Aktivität erkennen
 *
 * GEHEIMNIS: Große Moves kündigen sich durch Volume an!
 * - Volume Spike = Jemand weiß was
 * - Kaufe BEVOR der Pump kommt
 */

import fetch from "node-fetch";
import EventEmitter from "eventemitter3";

class VolumeSpikeDetector extends EventEmitter {
  constructor() {
    super();
    this.tokenHistory = new Map();
    this.alerts = [];
    this.isRunning = false;
    this.checkInterval = null;
  }

  /**
   * 🚀 Start Monitoring
   */
  async start(tokens = []) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("📊 Volume Spike Detector gestartet...");

    // Initial Data Load
    await this.loadTrendingTokens();

    // Check alle 30 Sekunden
    this.checkInterval = setInterval(() => this.checkForSpikes(), 30000);

    // Initial Check
    await this.checkForSpikes();
  }

  /**
   * 🛑 Stop Monitoring
   */
  stop() {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    console.log("🛑 Volume Spike Detector gestoppt");
  }

  /**
   * 🔥 Lade Trending Tokens
   */
  async loadTrendingTokens() {
    try {
      // DexScreener Trending
      const response = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/solana"
      );
      if (response.ok) {
        const data = await response.json();
        const pairs = data.pairs?.slice(0, 50) || [];

        for (const pair of pairs) {
          this.trackToken(pair.baseToken.address, {
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            volume24h: pair.volume?.h24 || 0,
            priceChange: pair.priceChange?.h24 || 0,
            liquidity: pair.liquidity?.usd || 0,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load trending tokens:", error);
    }
  }

  /**
   * 📈 Track Token
   */
  trackToken(mint, data) {
    const history = this.tokenHistory.get(mint) || {
      mint,
      symbol: data.symbol,
      samples: [],
    };

    history.samples.push({
      timestamp: Date.now(),
      volume24h: data.volume24h,
      priceChange: data.priceChange,
      liquidity: data.liquidity,
    });

    // Keep last 60 samples (30 minutes bei 30s interval)
    if (history.samples.length > 60) {
      history.samples = history.samples.slice(-60);
    }

    this.tokenHistory.set(mint, history);
  }

  /**
   * 🔍 Check für Volume Spikes
   */
  async checkForSpikes() {
    try {
      // Hole neue Daten
      const response = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/solana"
      );
      if (!response.ok) return;

      const data = await response.json();
      const pairs = data.pairs?.slice(0, 100) || [];

      for (const pair of pairs) {
        const mint = pair.baseToken.address;
        const currentVolume = pair.volume?.h24 || 0;
        const history = this.tokenHistory.get(mint);

        if (history && history.samples.length >= 5) {
          // Berechne Average Volume der letzten Samples
          const avgVolume =
            history.samples
              .slice(-10)
              .reduce((sum, s) => sum + s.volume24h, 0) / 10;

          // Volume Spike Detection
          // Spike wenn aktuelles Volume > 2x Durchschnitt
          const volumeMultiple = currentVolume / (avgVolume || 1);

          if (volumeMultiple > 2 && currentVolume > 50000) {
            const spike = {
              type: "VOLUME_SPIKE",
              mint,
              symbol: pair.baseToken.symbol,
              volumeMultiple: volumeMultiple.toFixed(1),
              currentVolume,
              avgVolume,
              priceChange: pair.priceChange?.h24 || 0,
              liquidity: pair.liquidity?.usd || 0,
              timestamp: Date.now(),
            };

            // Emit nur wenn nicht kürzlich gemeldet
            const lastAlert = this.alerts.find((a) => a.mint === mint);
            if (!lastAlert || Date.now() - lastAlert.timestamp > 300000) {
              console.log(`\n🚨 VOLUME SPIKE: ${pair.baseToken.symbol}`);
              console.log(`   Volume: ${volumeMultiple.toFixed(1)}x normal`);
              console.log(`   24h Change: ${pair.priceChange?.h24 || 0}%`);

              this.alerts.push(spike);
              this.emit("volume_spike", spike);

              // Cleanup alte Alerts
              this.alerts = this.alerts.filter(
                (a) => Date.now() - a.timestamp < 3600000
              );
            }
          }

          // Price Spike Detection (schnelle Bewegung)
          if (history.samples.length >= 2) {
            const lastSample = history.samples[history.samples.length - 1];
            const prevSample = history.samples[history.samples.length - 2];

            const priceChangeRate =
              lastSample.priceChange - prevSample.priceChange;

            // Schnelle Bewegung > 5% in 30 Sekunden
            if (priceChangeRate > 5) {
              const priceSpike = {
                type: "PRICE_SPIKE",
                mint,
                symbol: pair.baseToken.symbol,
                priceChangeRate,
                currentPrice: pair.priceUsd,
                timestamp: Date.now(),
              };

              const lastPriceAlert = this.alerts.find(
                (a) => a.mint === mint && a.type === "PRICE_SPIKE"
              );

              if (
                !lastPriceAlert ||
                Date.now() - lastPriceAlert.timestamp > 60000
              ) {
                console.log(
                  `\n🚀 PRICE SPIKE: ${
                    pair.baseToken.symbol
                  } +${priceChangeRate.toFixed(1)}%`
                );
                this.alerts.push(priceSpike);
                this.emit("price_spike", priceSpike);
              }
            }
          }
        }

        // Update Tracking
        this.trackToken(mint, {
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          volume24h: currentVolume,
          priceChange: pair.priceChange?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
        });
      }
    } catch (error) {
      console.error("Spike check error:", error.message);
    }
  }

  /**
   * 📊 Get Active Alerts
   */
  getActiveAlerts() {
    const oneHourAgo = Date.now() - 3600000;
    return this.alerts
      .filter((a) => a.timestamp > oneHourAgo)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 📈 Get Top Movers
   */
  getTopMovers() {
    const tokens = Array.from(this.tokenHistory.values());

    return tokens
      .filter((t) => t.samples.length > 0)
      .map((t) => {
        const latest = t.samples[t.samples.length - 1];
        return {
          mint: t.mint,
          symbol: t.symbol,
          volume24h: latest.volume24h,
          priceChange: latest.priceChange,
          liquidity: latest.liquidity,
        };
      })
      .sort((a, b) => b.priceChange - a.priceChange)
      .slice(0, 20);
  }
}

export default VolumeSpikeDetector;
