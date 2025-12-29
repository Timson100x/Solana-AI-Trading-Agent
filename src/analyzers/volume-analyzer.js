/**
 * 🔥 TRICK #11: VOLUME SPIKE DETECTOR
 * Detects explosive volume increases in real-time
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("VolumeAnalyzer");

export class VolumeAnalyzer {
  constructor(birdeyeProvider, dexscreener) {
    this.birdeyeProvider = birdeyeProvider;
    this.dexscreener = dexscreener;
    this.explosionThreshold = 10; // 10x volume = explosion
    this.maxLiquidity = 1000; // Under $1k liquidity
  }

  /**
   * Detect volume explosion (10x increase in 5 minutes)
   */
  async detectVolumeExplosion(tokenAddress) {
    try {
      logger.info(`📊 Analyzing volume for: ${tokenAddress.slice(0, 8)}...`);

      // Get current data
      const [currentPrice, tokenDetails] = await Promise.allSettled([
        this.birdeyeProvider.getTokenPrice(tokenAddress),
        this.dexscreener.getTokenDetails(tokenAddress),
      ]);

      const priceData =
        currentPrice.status === "fulfilled" ? currentPrice.value : null;
      const dexData =
        tokenDetails.status === "fulfilled" ? tokenDetails.value : null;

      if (!priceData || !dexData) {
        return { explosion: false, reason: "No data" };
      }

      // Check liquidity constraint
      if (priceData.liquidity > this.maxLiquidity) {
        return { explosion: false, reason: "Liquidity too high" };
      }

      // Calculate volume ratios
      const volume5m = parseFloat(dexData.volume?.m5 || 0);
      const volume1h = parseFloat(dexData.volume?.h1 || 0);
      const volume24h = parseFloat(dexData.volume?.h24 || 0);

      // 5-minute volume explosion check
      if (volume1h > 0) {
        const volumeRatio = (volume5m * 12) / volume1h; // Extrapolate 5m to 1h

        if (volumeRatio > this.explosionThreshold) {
          logger.success(
            `🚀 VOLUME EXPLOSION: ${volumeRatio.toFixed(1)}x in 5m!`
          );

          return {
            explosion: true,
            volumeRatio: parseFloat(volumeRatio.toFixed(2)),
            volume5m,
            volume1h,
            liquidity: priceData.liquidity,
            priceChange5m: priceData.priceChange5m || 0,
          };
        }
      }

      // Alternative: sudden volume surge vs 24h average
      if (volume24h > 0) {
        const avgVolumePerHour = volume24h / 24;
        const currentHourlyRate = volume5m * 12;

        if (currentHourlyRate > avgVolumePerHour * 20) {
          logger.success(
            `🚀 VOLUME SURGE: ${(currentHourlyRate / avgVolumePerHour).toFixed(
              1
            )}x average!`
          );

          return {
            explosion: true,
            volumeRatio: parseFloat(
              (currentHourlyRate / avgVolumePerHour).toFixed(2)
            ),
            volume5m,
            volume24h,
            liquidity: priceData.liquidity,
          };
        }
      }

      return {
        explosion: false,
        volumeRatio: 1,
        volume5m,
        volume1h,
        liquidity: priceData.liquidity,
      };
    } catch (error) {
      logger.error("Volume analysis failed:", error.message);
      return { explosion: false, reason: "Error", error: error.message };
    }
  }

  /**
   * Batch analyze multiple tokens for volume explosions
   */
  async detectExplosions(tokenAddresses, delayMs = 100) {
    const results = [];

    for (const address of tokenAddresses) {
      const result = await this.detectVolumeExplosion(address);
      if (result.explosion) {
        results.push({ address, ...result });
      }
      await this.sleep(delayMs);
    }

    return results;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default VolumeAnalyzer;
