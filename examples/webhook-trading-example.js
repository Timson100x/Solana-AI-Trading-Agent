/**
 * Komplettes Beispiel: Webhook-basiertes Trading mit Auto Risk Management
 * 
 * Dieses Beispiel zeigt, wie du:
 * 1. Helius Webhooks empfängst
 * 2. Positionen trackst
 * 3. Automatisch Stop-Loss & Take-Profit ausführst
 * 4. Telegram Benachrichtigungen versendest
 */

import { WebhookIntegration } from '../src/integrations/webhook-integration.js';
import { WebhookRiskManager } from '../src/trading/webhook-risk-manager.js';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

// Konfiguration
const config = {
    // Solana Connection
    rpcUrl: process.env.HELIUS_RPC_URL,
    
    // Wallet
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
    walletPublicKey: process.env.WALLET_PUBLIC_KEY,
    
    // Webhook Settings
    webhookPort: parseInt(process.env.WEBHOOK_PORT) || 3000,
    webhookSecret: process.env.WEBHOOK_SECRET,
    
    // Risk Management
    stopLoss: -10,        // -10%
    takeProfit: 25,       // +25%
    emergencyStop: -20,   // -20%
    trailingStop: true,
    trailingDistance: 5,  // 5%
    
    // Partial Take Profits
    partialTakeProfits: [
        { percent: 15, sellAmount: 0.3 },  // Bei +15%: verkaufe 30%
        { percent: 25, sellAmount: 0.5 },  // Bei +25%: verkaufe weitere 50%
        { percent: 50, sellAmount: 1.0 }   // Bei +50%: verkaufe Rest
    ],
    
    // Sicherheit
    dryRun: true  // Setze auf false für echtes Trading!
};

class WebhookTradingBot {
    constructor(config) {
        this.config = config;
        this.connection = new Connection(config.rpcUrl);
        this.wallet = this.loadWallet(config.walletPrivateKey);
        
        // Risk Manager initialisieren
        this.riskManager = new WebhookRiskManager({
            connection: this.connection,
            wallet: this.wallet,
            defaultStopLoss: config.stopLoss,
            defaultTakeProfit: config.takeProfit,
            emergencyStopLoss: config.emergencyStop,
            trailingStopLoss: config.trailingStop,
            trailingStopDistance: config.trailingDistance,
            partialTakeProfitLevels: config.partialTakeProfits,
            dryRun: config.dryRun
        });
        
        // Webhook Integration initialisieren
        this.webhookIntegration = new WebhookIntegration(
            this,  // trading bot
            null   // telegram bot (optional)
        );
        
        this.setupEventHandlers();
    }
    
    /**
     * Wallet laden
     */
    loadWallet(privateKey) {
        const secretKey = bs58.decode(privateKey);
        return Keypair.fromSecretKey(secretKey);
    }
    
    /**
     * Event Handlers setup
     */
    setupEventHandlers() {
        // Webhook Events -> Risk Manager
        this.webhookIntegration.on('balance_updated', async (balanceData) => {
            await this.riskManager.handleBalanceUpdate(balanceData);
        });
        
        this.webhookIntegration.on('swap_detected', async (swapData) => {
            await this.riskManager.handleSwapEvent(swapData);
        });
        
        this.webhookIntegration.on('transaction_detected', async (txData) => {
            await this.riskManager.handleTransaction(txData);
        });
        
        // Risk Manager Events
        this.riskManager.on('position_registered', (position) => {
            console.log(`✅ Position registered: ${position.mint}`);
            this.sendTelegramNotification(`🎯 Neue Position: ${position.mint.substring(0, 8)}...\nEntry: $${position.entryPrice}\nStop Loss: $${position.stopLoss.toFixed(6)}\nTake Profit: $${position.takeProfit.toFixed(6)}`);
        });
        
        this.riskManager.on('sell_executed', (data) => {
            const { position, reason, pnlPercent, sellRatio } = data;
            console.log(`💰 Sell executed: ${reason} | P/L: ${pnlPercent.toFixed(2)}%`);
            
            const emoji = pnlPercent > 0 ? '📈' : '📉';
            this.sendTelegramNotification(
                `${emoji} ${reason}\n` +
                `Token: ${position.mint.substring(0, 8)}...\n` +
                `Sold: ${(sellRatio * 100).toFixed(0)}%\n` +
                `P/L: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`
            );
        });
        
        this.riskManager.on('sell_failed', (data) => {
            console.error(`❌ Sell failed: ${data.error}`);
            this.sendTelegramNotification(`⚠️ Verkauf fehlgeschlagen: ${data.error}`);
        });
        
        this.riskManager.on('position_closed', (position) => {
            console.log(`🔒 Position closed: ${position.mint}`);
        });
    }
    
    /**
     * Bot starten
     */
    async start() {
        try {
            console.log('🚀 Starting Webhook Trading Bot...');
            console.log(`   Wallet: ${this.wallet.publicKey.toString()}`);
            console.log(`   Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);
            console.log(`   Stop Loss: ${this.config.stopLoss}%`);
            console.log(`   Take Profit: ${this.config.takeProfit}%`);
            console.log(`   Emergency Stop: ${this.config.emergencyStop}%`);
            
            // Webhook Server starten
            await this.webhookIntegration.start(this.config.webhookPort);
            
            console.log('\n✅ Bot is running!');
            console.log('\n📖 Next steps:');
            console.log('1. Configure webhook in Helius Dashboard:');
            console.log(`   URL: http://your-vps-ip:${this.config.webhookPort}/webhook/helius`);
            console.log(`   Secret: ${this.config.webhookSecret?.substring(0, 16)}...`);
            console.log('2. Make a trade to test the system');
            console.log('3. Watch automatic Stop-Loss & Take-Profit execution\n');
            
            // Beispiel: Position manuell registrieren (nach einem Kauf)
            // this.registerTestPosition();
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error.message);
            throw error;
        }
    }
    
    /**
     * Test Position registrieren
     */
    registerTestPosition() {
        // Beispiel: Nach einem Kauf würdest du die Position so registrieren
        const position = this.riskManager.registerPosition(
            'TokenMintAddressHere',  // Token Mint Address
            {
                entryPrice: 0.001,         // Entry Preis in SOL oder USD
                amount: 1000,              // Gekaufte Token Menge
                signature: 'tx_signature'  // Transaction Signature
            }
        );
        
        console.log('🧪 Test position registered:', position);
    }
    
    /**
     * Trade ausführen (Beispiel)
     */
    async executeTrade(tokenMint, amountSOL) {
        try {
            console.log(`🔄 Executing trade: ${amountSOL} SOL -> ${tokenMint.substring(0, 8)}...`);
            
            // TODO: Implementiere tatsächlichen Trade via Jupiter
            // const swapResult = await this.jupiterSwap(...);
            
            // Nach erfolgreichem Kauf: Position registrieren
            const entryPrice = 0.001; // Von Jupiter Quote
            const tokenAmount = 1000; // Erhaltene Tokens
            
            this.riskManager.registerPosition(tokenMint, {
                entryPrice,
                amount: tokenAmount,
                signature: 'swap_signature'
            });
            
            console.log('✅ Trade executed and position registered');
            
        } catch (error) {
            console.error('❌ Trade execution failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Telegram Benachrichtigung senden
     */
    sendTelegramNotification(message) {
        // TODO: Implementiere Telegram Bot Integration
        console.log(`📢 Telegram: ${message}`);
    }
    
    /**
     * Status anzeigen
     */
    getStatus() {
        const riskStats = this.riskManager.getStats();
        const webhookStats = this.webhookIntegration.getStats();
        
        return {
            risk: riskStats,
            webhook: webhookStats,
            wallet: this.wallet.publicKey.toString(),
            mode: this.config.dryRun ? 'DRY_RUN' : 'LIVE'
        };
    }
    
    /**
     * Bot stoppen
     */
    async stop() {
        console.log('\n🛑 Stopping bot...');
        await this.webhookIntegration.stop();
        console.log('✅ Bot stopped');
    }
}

// Bot starten
if (import.meta.url === `file://${process.argv[1]}`) {
    const bot = new WebhookTradingBot(config);
    
    await bot.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n👋 Received SIGINT, shutting down...');
        await bot.stop();
        process.exit(0);
    });
    
    // Status updates alle 60 Sekunden
    setInterval(() => {
        const status = bot.getStatus();
        console.log('\n📊 Status Update:');
        console.log(`   Active Positions: ${status.risk.activePositions}`);
        console.log(`   Stop Loss Triggered: ${status.risk.stopLossTriggered}`);
        console.log(`   Take Profit Triggered: ${status.risk.takeProfitTriggered}`);
        console.log(`   Webhooks Received: ${status.webhook.webhookStats.received}`);
    }, 60000);
}

export default WebhookTradingBot;
