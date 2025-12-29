/**
 * Helius Webhooks - Real-time transaction monitoring
 * Alternative to polling - push-based updates
 */

import express from "express";
import { Logger } from "../utils/logger.js";

const logger = new Logger("Helius");

export class HeliusWebhooks {
  constructor(agent) {
    this.agent = agent;
    this.webhookUrl = null;
    this.enabled = process.env.HELIUS_WEBHOOKS === "true";
    this.apiKey = process.env.HELIUS_API_KEY || "";
    this.baseUrl = `https://api-mainnet.helius-rpc.com/v0`;
    this.wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;
  }

  setup(app) {
    if (!this.enabled) {
      logger.info("Webhooks disabled (using polling)");
      return;
    }

    // Webhook endpoint
    app.post("/webhooks/helius", express.json(), async (req, res) => {
      try {
        const transactions = req.body;

        // Only log if transactions from tracked wallets
        let trackedCount = 0;
        for (const tx of transactions) {
          const tracked = await this.handleTransaction(tx);
          if (tracked) trackedCount++;
        }

        if (trackedCount > 0) {
          logger.info(
            `📨 Webhook: ${trackedCount}/${transactions.length} tracked transactions`
          );
        }

        res.status(200).json({ status: "ok", processed: trackedCount });
      } catch (error) {
        logger.error("Webhook error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    logger.success("✅ Webhooks configured");
  }

  async handleTransaction(tx) {
    try {
      // Check if transaction is from tracked wallet
      const wallets = await this.agent.loadWallets();
      const walletAddresses = wallets.map((w) => w.address);

      const isTracked = tx.accountData?.some((acc) =>
        walletAddresses.includes(acc.account)
      );

      if (!isTracked) return false;

      logger.success("🎯 Transaction from tracked wallet!");
      logger.info(`   Signature: ${tx.signature?.slice(0, 12)}...`);

      // Find which wallet made the transaction
      const matchedWallet = wallets.find((w) =>
        tx.accountData?.some((acc) => acc.account === w.address)
      );

      if (matchedWallet && this.agent.telegram) {
        // Send Telegram alert about the transaction
        const message =
          `🔔 *Webhook Alert*\n\n` +
          `💼 Wallet: \`${
            matchedWallet.name || matchedWallet.address.slice(0, 8)
          }...\`\n` +
          `📝 Signature: \`${tx.signature?.slice(0, 16)}...\`\n` +
          `🔄 Type: ${tx.type || "Unknown"}\n\n` +
          `[View on Solscan](https://solscan.io/tx/${tx.signature})`;

        try {
          await this.agent.telegram.sendMessage(message, {
            parse_mode: "Markdown",
          });
        } catch (telegramError) {
          logger.warn("Telegram notification failed:", telegramError.message);
        }
      }

      return true;
    } catch (error) {
      logger.error("Handle transaction error:", error);
      return false;
    }
  }

  async createWebhook(walletAddresses) {
    if (!process.env.HELIUS_API_KEY) {
      logger.warn("No Helius API key - webhooks disabled");
      return;
    }

    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookURL: `${process.env.PUBLIC_URL}/webhooks/helius`,
            transactionTypes: ["SWAP", "TRANSFER"],
            accountAddresses: walletAddresses,
            webhookType: "enhanced",
          }),
        }
      );

      const data = await response.json();

      if (data.webhookID) {
        logger.success(`✅ Webhook created: ${data.webhookID}`);
        this.webhookUrl = data.webhookID;
      }
    } catch (error) {
      logger.error("Failed to create webhook:", error);
    }
  }
}
