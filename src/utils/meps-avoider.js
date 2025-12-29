/**
 * 🔥 TRICK #8: MEPS (Minimum Extractable Priority System) Avoider
 * Waits for "safe slots" to avoid MEV sandwich attacks
 */

import { Logger } from "./logger.js";

const logger = new Logger("MEPSAvoider");

export class MEPSAvoider {
  constructor(connection) {
    this.connection = connection;
    this.safeZoneStart = 10;
    this.safeZoneEnd = 90;
  }

  /**
   * Wait for safe slot to execute transaction
   * Slots 10-90 in each 100-slot cycle are safer from MEV
   */
  async waitForSafeSlot() {
    try {
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        const slot = await this.connection.getSlot("confirmed");
        const slotPosition = slot % 100;

        // Safe zone: slots 10-90 (avoid edges)
        if (
          slotPosition >= this.safeZoneStart &&
          slotPosition <= this.safeZoneEnd
        ) {
          logger.info(`✅ Safe slot found: ${slot} (position ${slotPosition})`);
          return slot;
        }

        logger.info(
          `⏳ Waiting for safe slot (current: ${slotPosition}/100)...`
        );
        await this.sleep(1000);
        attempts++;
      }

      logger.warn("⚠️ Max attempts reached, proceeding anyway");
      return await this.connection.getSlot("confirmed");
    } catch (error) {
      logger.error("MEPS check failed:", error.message);
      return await this.connection.getSlot("confirmed");
    }
  }

  /**
   * Check if current slot is safe
   */
  async isCurrentSlotSafe() {
    try {
      const slot = await this.connection.getSlot("confirmed");
      const slotPosition = slot % 100;
      return (
        slotPosition >= this.safeZoneStart && slotPosition <= this.safeZoneEnd
      );
    } catch (error) {
      logger.error("Slot safety check failed:", error.message);
      return true; // Fail open
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default MEPSAvoider;
