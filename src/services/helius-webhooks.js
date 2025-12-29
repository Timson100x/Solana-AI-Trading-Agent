/**
 * Helius Webhooks - Real-time transaction monitoring
 * Alternative to polling - push-based updates
 * Documentation: https://docs.helius.dev/webhooks-and-websockets/webhooks
 */

import express from 'express';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Helius');

export class HeliusWebhooks {
  constructor(agent) {
    this.agent = agent;
    this.webhookId = null;
    this.webhookUrl = null;
    this.enabled = process.env.HELIUS_WEBHOOKS === 'true';
    this.apiKey = process.env.HELIUS_API_KEY;
    this.publicUrl = process.env.PUBLIC_URL;
    this.transactionTypes = (process.env.HELIUS_WEBHOOK_TYPES || 'SWAP,TRANSFER').split(',');
  }

  setup(app) {
    if (!this.enabled) {
      logger.info('⚠️ Webhooks disabled - using polling mode');
      logger.info('💡 Enable with: HELIUS_WEBHOOKS=true in .env');
      return;
    }

    if (!this.apiKey) {
      logger.error('❌ HELIUS_API_KEY not configured');
      logger.info('💡 Get your API key from: https://dashboard.helius.dev');
      return;
    }

    if (!this.publicUrl) {
      logger.error('❌ PUBLIC_URL not configured');
      logger.info('💡 Use ngrok or cloudflare tunnel for local development');
      return;
    }

    // Webhook endpoint
    app.post('/webhooks/helius', express.json(), async (req, res) => {
      try {
        const transactions = req.body;

        logger.info(`📨 Webhook received: ${transactions.length} transaction(s)`);

        // Process transactions
        for (const tx of transactions) {
          await this.handleTransaction(tx);
        }

        res.status(200).json({ status: 'ok', processed: transactions.length });
      } catch (error) {
        logger.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    logger.success('✅ Webhook endpoint configured: /webhooks/helius');
    logger.info(`📍 Webhook URL: ${this.publicUrl}/webhooks/helius`);
  }

  async handleTransaction(tx) {
    try {
      // Check if transaction is from tracked wallet
      const wallets = await this.agent.loadWallets();
      const walletAddresses = wallets.map(w => w.address);

      const isTracked = tx.accountData?.some(acc => 
        walletAddresses.includes(acc.account)
      );

      if (!isTracked) {
        logger.info('⏭️ Transaction not from tracked wallet - skipping');
        return;
      }

      logger.success('🎯 Transaction from tracked wallet detected!');
      logger.info(`Transaction signature: ${tx.signature?.slice(0, 8)}...`);

      // Analyze with agent
      const relevantWallet = wallets.find(w => 
        tx.accountData?.some(acc => acc.account === w.address)
      );

      if (relevantWallet) {
        await this.agent.checkWallet({ 
          address: relevantWallet.address 
        });
      }

    } catch (error) {
      logger.error('❌ Transaction handling error:', error);
    }
  }

  async createWebhook(walletAddresses) {
    if (!this.apiKey) {
      logger.warn('⚠️ No Helius API key - webhooks disabled');
      logger.info('💡 Set HELIUS_API_KEY in .env');
      return null;
    }

    if (!this.publicUrl) {
      logger.warn('⚠️ No PUBLIC_URL configured');
      logger.info('💡 Set PUBLIC_URL in .env (e.g., https://your-app.ngrok.io)');
      return null;
    }

    try {
      logger.info('🔄 Creating Helius webhook...');
      
      const webhookEndpoint = `${this.publicUrl}/webhooks/helius`;
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookURL: webhookEndpoint,
            transactionTypes: this.transactionTypes,
            accountAddresses: walletAddresses,
            webhookType: 'enhanced',
            authHeader: process.env.WEBHOOK_AUTH_TOKEN || ''
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Helius API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.webhookID) {
        this.webhookId = data.webhookID;
        this.webhookUrl = webhookEndpoint;
        
        logger.success(`✅ Webhook created successfully!`);
        logger.info(`Webhook ID: ${data.webhookID}`);
        logger.info(`Webhook URL: ${webhookEndpoint}`);
        logger.info(`Monitoring ${walletAddresses.length} wallet(s)`);
        logger.info(`Transaction types: ${this.transactionTypes.join(', ')}`);
        
        return data;
      } else {
        throw new Error('No webhook ID returned from Helius');
      }
    } catch (error) {
      logger.error('❌ Failed to create webhook:', error);
      logger.info('📚 Docs: https://docs.helius.dev/webhooks-and-websockets/webhooks');
      return null;
    }
  }

  /**
   * List all webhooks for this API key
   */
  async listWebhooks() {
    if (!this.apiKey) {
      logger.warn('⚠️ No Helius API key configured');
      return [];
    }

    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Failed to list webhooks: ${response.status}`);
      }

      const webhooks = await response.json();
      logger.info(`📋 Found ${webhooks.length} webhook(s)`);
      return webhooks;
    } catch (error) {
      logger.error('❌ Failed to list webhooks:', error);
      return [];
    }
  }

  /**
   * Get webhook details by ID
   */
  async getWebhook(webhookId) {
    if (!this.apiKey) {
      logger.warn('⚠️ No Helius API key configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${this.apiKey}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Failed to get webhook: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('❌ Failed to get webhook:', error);
      return null;
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId, updates) {
    if (!this.apiKey) {
      logger.warn('⚠️ No Helius API key configured');
      return null;
    }

    try {
      logger.info(`🔄 Updating webhook ${webhookId}...`);
      
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${this.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update webhook: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.success(`✅ Webhook updated successfully`);
      return data;
    } catch (error) {
      logger.error('❌ Failed to update webhook:', error);
      return null;
    }
  }

  /**
   * Delete webhook by ID
   */
  async deleteWebhook(webhookId) {
    if (!this.apiKey) {
      logger.warn('⚠️ No Helius API key configured');
      return false;
    }

    try {
      logger.info(`🗑️ Deleting webhook ${webhookId}...`);
      
      const response = await fetch(
        `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${this.apiKey}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.status}`);
      }

      logger.success(`✅ Webhook deleted successfully`);
      
      if (this.webhookId === webhookId) {
        this.webhookId = null;
        this.webhookUrl = null;
      }
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to delete webhook:', error);
      return false;
    }
  }

  /**
   * Initialize webhook on startup
   */
  async initialize() {
    if (!this.enabled || !this.apiKey || !this.publicUrl) {
      return;
    }

    try {
      // Check for existing webhooks
      const existingWebhooks = await this.listWebhooks();
      
      // Find webhook with our URL
      const ourWebhook = existingWebhooks.find(w => 
        w.webhookURL === `${this.publicUrl}/webhooks/helius`
      );

      if (ourWebhook) {
        this.webhookId = ourWebhook.webhookID;
        this.webhookUrl = ourWebhook.webhookURL;
        logger.info(`✅ Using existing webhook: ${this.webhookId}`);
      } else {
        // Create new webhook with tracked wallets
        const wallets = await this.agent.loadWallets();
        if (wallets.length > 0) {
          const addresses = wallets.map(w => w.address);
          await this.createWebhook(addresses);
        }
      }
    } catch (error) {
      logger.error('❌ Webhook initialization failed:', error);
    }
  }

  /**
   * Get current webhook status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      configured: !!(this.apiKey && this.publicUrl),
      webhookId: this.webhookId,
      webhookUrl: this.webhookUrl,
      transactionTypes: this.transactionTypes
    };
  }
}
