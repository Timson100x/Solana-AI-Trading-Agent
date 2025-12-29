/**
 * Risk Manager - Position sizing and portfolio risk management
 */

import { Logger } from "../utils/logger.js";

const logger = new Logger("RiskManager");

export class RiskManager {
  constructor(wallet) {
    this.wallet = wallet;
    this.maxPortfolioExposure = 0.3; // 30% max in all positions
    this.maxSinglePosition = 0.05; // 5% max per trade
    this.minPositionSize = 0.01; // 0.01 SOL minimum
    this.openPositions = [];
  }

  async calculatePositionSize(token, verificationResult) {
    try {
      const balance = await this.wallet.getBalance();
      const wsolBalance = await this.wallet.getWrappedSOLBalance();
      const totalBalance = balance + wsolBalance;

      logger.info(`💰 Available balance: ${totalBalance.toFixed(4)} SOL`);

      // Calculate max position based on risk score
      const riskScore = verificationResult.riskScore || 50;
      const riskMultiplier = Math.max(0.3, 1 - riskScore / 100); // 30%-100%

      // Base position size
      let positionSize = totalBalance * this.maxSinglePosition * riskMultiplier;

      // Check portfolio exposure
      const currentExposure = this.calculateCurrentExposure(totalBalance);
      const remainingAllocation =
        totalBalance * this.maxPortfolioExposure - currentExposure;

      if (remainingAllocation <= 0) {
        logger.warn("⚠️ Portfolio exposure limit reached");
        return null;
      }

      positionSize = Math.min(positionSize, remainingAllocation);

      // Apply limits
      positionSize = Math.max(this.minPositionSize, positionSize);
      positionSize = Math.min(positionSize, totalBalance * 0.1); // Never more than 10%

      // Check if we have enough balance
      if (positionSize > totalBalance * 0.95) {
        logger.warn("⚠️ Insufficient balance for trade");
        return null;
      }

      const result = {
        positionSize: parseFloat(positionSize.toFixed(4)),
        riskMultiplier: parseFloat(riskMultiplier.toFixed(2)),
        portfolioExposure: parseFloat(
          ((currentExposure + positionSize) / totalBalance).toFixed(4)
        ),
        stopLoss: 0.25, // 25%
        takeProfit1: 1.0, // 100%
        takeProfit2: 3.0, // 300%
        trailingStop: 0.5, // Start at +50%
      };

      logger.success(
        `✅ Position size: ${result.positionSize} SOL (${(
          (result.positionSize / totalBalance) *
          100
        ).toFixed(1)}% of portfolio)`
      );

      return result;
    } catch (error) {
      logger.error("Position sizing failed:", error.message);
      return null;
    }
  }

  calculateCurrentExposure(totalBalance) {
    const exposure = this.openPositions.reduce(
      (sum, pos) => sum + pos.investedSOL,
      0
    );
    return exposure;
  }

  addPosition(position) {
    this.openPositions.push(position);
    logger.info(`📊 Open positions: ${this.openPositions.length}`);
  }

  removePosition(positionId) {
    this.openPositions = this.openPositions.filter((p) => p.id !== positionId);
    logger.info(`📊 Open positions: ${this.openPositions.length}`);
  }

  async checkTradePermission() {
    try {
      const balance = await this.wallet.getBalance();
      const wsolBalance = await this.wallet.getWrappedSOLBalance();
      const totalBalance = balance + wsolBalance;

      const currentExposure = this.calculateCurrentExposure(totalBalance);
      const exposurePercent = currentExposure / totalBalance;

      if (exposurePercent >= this.maxPortfolioExposure) {
        logger.warn(
          `⚠️ Portfolio exposure at limit: ${(exposurePercent * 100).toFixed(
            1
          )}%`
        );
        return false;
      }

      if (totalBalance < this.minPositionSize * 2) {
        logger.warn("⚠️ Insufficient balance for trading");
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Trade permission check failed:", error.message);
      return false;
    }
  }

  getStats() {
    const totalInvested = this.openPositions.reduce(
      (sum, pos) => sum + pos.investedSOL,
      0
    );

    return {
      openPositions: this.openPositions.length,
      totalInvested: parseFloat(totalInvested.toFixed(4)),
      avgPositionSize: this.openPositions.length
        ? parseFloat((totalInvested / this.openPositions.length).toFixed(4))
        : 0,
    };
  }
}

export default RiskManager;
