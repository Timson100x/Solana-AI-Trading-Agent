import { HeliusWebhooks } from '../services/helius-webhooks.js';
import { EventEmitter } from 'eventemitter3';

/**
 * Webhook Integration Layer
 * Verbindet Helius Webhooks mit dem Trading Bot System
 */
export class WebhookIntegration extends EventEmitter {
    constructor(tradingBot, telegramBot) {
        super();
        
        this.tradingBot = tradingBot;
        this.telegramBot = telegramBot;
        
        // Initialize Helius Webhooks
        this.webhooks = new HeliusWebhooks({
            port: process.env.WEBHOOK_PORT || 3000,
            secret: process.env.WEBHOOK_SECRET,
            walletAddress: process.env.WALLET_PUBLIC_KEY,
            rpcUrl: process.env.HELIUS_RPC_URL
        });

        this.setupEventHandlers();
        this.stats = {
            trades: 0,
            swaps: 0,
            balanceUpdates: 0,
            lastUpdate: null
        };
    }

    /**
     * Setup Event Handlers
     */
    setupEventHandlers() {
        // Trade Events
        this.webhooks.on('trade', this.handleTrade.bind(this));
        
        // Swap Events
        this.webhooks.on('swap', this.handleSwap.bind(this));
        
        // Balance Updates
        this.webhooks.on('balance', this.handleBalanceUpdate.bind(this));
        
        // Account Updates
        this.webhooks.on('account', this.handleAccountUpdate.bind(this));
        
        // Transaction Events
        this.webhooks.on('transaction', this.handleTransaction.bind(this));
        
        // Metadata Events
        this.webhooks.on('metadata', this.handleMetadata.bind(this));
    }

    /**
     * Handle Trade Event
     */
    async handleTrade(tradeData) {
        try {
            this.stats.trades++;
            this.stats.lastUpdate = new Date().toISOString();

            console.log('💰 Trade detected:', tradeData.signature);

            // Notify via Telegram if bot is available
            if (this.telegramBot) {
                const message = this.formatTradeMessage(tradeData);
                await this.telegramBot.sendMessage(message);
            }

            // Trigger position update in trading bot
            if (this.tradingBot && this.tradingBot.positionMonitor) {
                await this.tradingBot.positionMonitor.updatePositions();
            }

            // Emit event for other listeners
            this.emit('trade_detected', tradeData);
        } catch (error) {
            console.error('❌ Trade handling error:', error.message);
        }
    }

    /**
     * Handle Swap Event
     */
    async handleSwap(swapData) {
        try {
            this.stats.swaps++;
            this.stats.lastUpdate = new Date().toISOString();

            console.log('🔄 Swap detected:', swapData.signature);

            // Calculate profit/loss if possible
            const pnl = this.calculateSwapPnL(swapData);

            // Notify via Telegram
            if (this.telegramBot) {
                const message = this.formatSwapMessage(swapData, pnl);
                await this.telegramBot.sendMessage(message);
            }

            // Update trading statistics
            if (this.tradingBot && this.tradingBot.statistics) {
                await this.tradingBot.statistics.recordSwap(swapData, pnl);
            }

            this.emit('swap_detected', swapData);
        } catch (error) {
            console.error('❌ Swap handling error:', error.message);
        }
    }

    /**
     * Handle Balance Update
     */
    async handleBalanceUpdate(balanceData) {
        try {
            this.stats.balanceUpdates++;
            this.stats.lastUpdate = new Date().toISOString();

            console.log(`💵 Balance update: ${balanceData.uiAmount} tokens`);

            // Check if stop-loss or take-profit triggered
            if (this.tradingBot && this.tradingBot.riskManager) {
                await this.tradingBot.riskManager.checkTriggers(balanceData);
            }

            // Update portfolio tracking
            if (this.tradingBot && this.tradingBot.portfolio) {
                await this.tradingBot.portfolio.updateBalance(balanceData);
            }

            this.emit('balance_updated', balanceData);
        } catch (error) {
            console.error('❌ Balance update handling error:', error.message);
        }
    }

    /**
     * Handle Account Update
     */
    async handleAccountUpdate(accountData) {
        try {
            console.log('📊 Account updated');
            this.emit('account_updated', accountData);
        } catch (error) {
            console.error('❌ Account update handling error:', error.message);
        }
    }

    /**
     * Handle Generic Transaction
     */
    async handleTransaction(txData) {
        try {
            // Log all transactions for audit trail
            if (this.tradingBot && this.tradingBot.auditLog) {
                await this.tradingBot.auditLog.logTransaction(txData);
            }

            this.emit('transaction_detected', txData);
        } catch (error) {
            console.error('❌ Transaction handling error:', error.message);
        }
    }

    /**
     * Handle Metadata Update
     */
    async handleMetadata(metadataData) {
        try {
            console.log(`📝 Metadata received: ${metadataData.name}`);
            
            // Update token info cache
            if (this.tradingBot && this.tradingBot.tokenCache) {
                await this.tradingBot.tokenCache.updateMetadata(metadataData);
            }

            this.emit('metadata_updated', metadataData);
        } catch (error) {
            console.error('❌ Metadata handling error:', error.message);
        }
    }

    /**
     * Format Trade Message for Telegram
     */
    formatTradeMessage(tradeData) {
        return `💰 *TRADE DETECTED*\n\n` +
               `Signature: \`${tradeData.signature?.substring(0, 12)}...\`\n` +
               `Status: ${tradeData.success ? '✅ Success' : '❌ Failed'}\n` +
               `Fee: ${tradeData.fee?.toFixed(6)} SOL\n` +
               `Time: ${new Date(tradeData.timestamp).toLocaleString('de-DE')}`;
    }

    /**
     * Format Swap Message for Telegram
     */
    formatSwapMessage(swapData, pnl) {
        let message = `🔄 *SWAP EXECUTED*\n\n`;
        message += `Signature: \`${swapData.signature?.substring(0, 12)}...\`\n`;
        message += `Status: ${swapData.success ? '✅ Success' : '❌ Failed'}\n\n`;
        
        if (swapData.input) {
            message += `🔻 Input: ${(swapData.input.amount / Math.pow(10, swapData.input.decimals)).toFixed(4)}\n`;
        }
        
        if (swapData.output) {
            message += `🔺 Output: ${(swapData.output.amount / Math.pow(10, swapData.output.decimals)).toFixed(4)}\n`;
        }
        
        if (pnl) {
            const emoji = pnl > 0 ? '📈' : '📉';
            message += `\n${emoji} P/L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%\n`;
        }
        
        message += `\nFee: ${swapData.fee?.toFixed(6)} SOL`;
        return message;
    }

    /**
     * Calculate Swap P/L (simplified)
     */
    calculateSwapPnL(swapData) {
        // This is a placeholder - implement actual P/L calculation
        // based on your trading strategy and cost basis
        if (swapData.priceImpact) {
            return (swapData.priceImpact - 1) * 100;
        }
        return null;
    }

    /**
     * Start Webhook Server
     */
    async start(port) {
        try {
            await this.webhooks.startServer(port);
            console.log('✅ Webhook integration started');
            
            // Print webhook config for Helius Dashboard
            console.log('\n📋 Helius Dashboard Config:');
            console.log(JSON.stringify(this.webhooks.getWebhookConfig(), null, 2));
            
            return true;
        } catch (error) {
            console.error('❌ Failed to start webhook integration:', error.message);
            throw error;
        }
    }

    /**
     * Stop Webhook Server
     */
    async stop() {
        try {
            await this.webhooks.stopServer();
            console.log('✅ Webhook integration stopped');
            return true;
        } catch (error) {
            console.error('❌ Failed to stop webhook integration:', error.message);
            throw error;
        }
    }

    /**
     * Get Integration Statistics
     */
    getStats() {
        return {
            ...this.stats,
            webhookStats: this.webhooks.stats
        };
    }

    /**
     * Test Webhook
     */
    async test() {
        await this.webhooks.testWebhook();
    }
}

export default WebhookIntegration;
