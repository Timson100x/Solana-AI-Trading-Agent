import express from 'express';
import { EventEmitter } from 'eventemitter3';
import { Connection, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

/**
 * Helius Webhook Handler für Solana AI Trading Agent
 * Verarbeitet Echtzeit-Events von Helius Webhooks:
 * - Transaction Updates (Trades, Swaps)
 * - Token Account Changes (Balance Updates)
 * - NFT/Token Metadata Updates
 */
export class HeliusWebhooks extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            port: config.port || process.env.WEBHOOK_PORT || 3000,
            secret: config.secret || process.env.WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex'),
            walletAddress: config.walletAddress || process.env.WALLET_PUBLIC_KEY,
            rpcUrl: config.rpcUrl || process.env.HELIUS_RPC_URL,
            enableLogging: config.enableLogging !== false,
            ...config
        };

        this.connection = new Connection(this.config.rpcUrl);
        this.app = express();
        this.stats = {
            received: 0,
            processed: 0,
            errors: 0,
            lastEvent: null
        };
        
        this.setupRoutes();
    }

    /**
     * Express Routes Setup
     */
    setupRoutes() {
        this.app.use(express.json({ limit: '10mb' }));
        
        // Health Check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                uptime: process.uptime(),
                stats: this.stats,
                timestamp: new Date().toISOString()
            });
        });

        // Main Webhook Endpoint
        this.app.post('/webhook/helius', this.verifyWebhook.bind(this), this.handleWebhook.bind(this));
        
        // Transaction Webhook
        this.app.post('/webhook/transactions', this.verifyWebhook.bind(this), this.handleTransactionWebhook.bind(this));
        
        // Account Update Webhook
        this.app.post('/webhook/accounts', this.verifyWebhook.bind(this), this.handleAccountWebhook.bind(this));
        
        // Token Metadata Webhook
        this.app.post('/webhook/metadata', this.verifyWebhook.bind(this), this.handleMetadataWebhook.bind(this));

        // Stats Endpoint
        this.app.get('/webhook/stats', (req, res) => {
            res.json(this.stats);
        });
    }

    /**
     * Webhook Signature Verification
     */
    verifyWebhook(req, res, next) {
        // Skip verification if no secret is set (development)
        if (!this.config.secret) {
            return next();
        }

        const signature = req.headers['x-helius-signature'];
        if (!signature) {
            this.log('⚠️ Missing webhook signature');
            return res.status(401).json({ error: 'Missing signature' });
        }

        try {
            const payload = JSON.stringify(req.body);
            const hmac = crypto.createHmac('sha256', this.config.secret);
            const digest = hmac.update(payload).digest('hex');

            if (signature !== digest) {
                this.log('❌ Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }

            next();
        } catch (error) {
            this.log('❌ Signature verification error:', error.message);
            res.status(500).json({ error: 'Verification failed' });
        }
    }

    /**
     * Main Webhook Handler
     */
    async handleWebhook(req, res) {
        try {
            this.stats.received++;
            const data = req.body;

            this.log('📥 Webhook received:', data.type || 'unknown');
            this.stats.lastEvent = new Date().toISOString();

            // Route to specific handler based on webhook type
            switch (data.type) {
                case 'ENHANCED_TRANSACTION':
                case 'TRANSACTION':
                    await this.processTransaction(data);
                    break;
                    
                case 'ACCOUNT_UPDATE':
                case 'TOKEN_ACCOUNT':
                    await this.processAccountUpdate(data);
                    break;
                    
                case 'NFT_METADATA':
                case 'TOKEN_METADATA':
                    await this.processMetadata(data);
                    break;
                    
                default:
                    this.log('⚠️ Unknown webhook type:', data.type);
            }

            this.stats.processed++;
            res.status(200).json({ success: true, received: this.stats.received });
            
        } catch (error) {
            this.stats.errors++;
            this.log('❌ Webhook processing error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Transaction Webhook Handler
     */
    async handleTransactionWebhook(req, res) {
        try {
            await this.processTransaction(req.body);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Account Update Webhook Handler
     */
    async handleAccountWebhook(req, res) {
        try {
            await this.processAccountUpdate(req.body);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Metadata Webhook Handler
     */
    async handleMetadataWebhook(req, res) {
        try {
            await this.processMetadata(req.body);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Process Transaction Event
     */
    async processTransaction(data) {
        try {
            const transactions = Array.isArray(data) ? data : [data];
            
            for (const tx of transactions) {
                const signature = tx.signature;
                const type = tx.type;
                const timestamp = tx.timestamp;

                this.log(`🔄 Transaction: ${signature?.substring(0, 8)}... | Type: ${type}`);

                // Parse transaction details
                const txDetails = {
                    signature,
                    type,
                    timestamp,
                    success: tx.meta?.err === null,
                    fee: tx.meta?.fee / 1e9, // SOL
                    accountData: tx.accountData || [],
                    instructions: tx.instructions || [],
                    tokenTransfers: tx.tokenTransfers || [],
                    nativeTransfers: tx.nativeTransfers || []
                };

                // Check if this is a relevant trade
                if (this.isRelevantTrade(txDetails)) {
                    this.log('💰 Trade detected!');
                    this.emit('trade', txDetails);
                }

                // Check for swaps
                if (this.isSwapTransaction(txDetails)) {
                    this.log('🔄 Swap detected!');
                    const swapData = this.parseSwapData(txDetails);
                    this.emit('swap', swapData);
                }

                // Emit generic transaction event
                this.emit('transaction', txDetails);
            }
        } catch (error) {
            this.log('❌ Transaction processing error:', error.message);
            throw error;
        }
    }

    /**
     * Process Account Update Event
     */
    async processAccountUpdate(data) {
        try {
            const updates = Array.isArray(data) ? data : [data];
            
            for (const update of updates) {
                const account = update.account;
                const slot = update.slot;

                this.log(`📊 Account Update: ${account?.substring(0, 8)}... | Slot: ${slot}`);

                // Parse token balance changes
                if (update.tokenBalance) {
                    const balanceData = {
                        account,
                        mint: update.tokenBalance.mint,
                        amount: update.tokenBalance.amount,
                        decimals: update.tokenBalance.decimals,
                        uiAmount: update.tokenBalance.uiAmount,
                        slot,
                        timestamp: Date.now()
                    };

                    this.log(`💵 Balance: ${balanceData.uiAmount} tokens`);
                    this.emit('balance', balanceData);
                }

                // Emit generic account update
                this.emit('account', update);
            }
        } catch (error) {
            this.log('❌ Account update processing error:', error.message);
            throw error;
        }
    }

    /**
     * Process Metadata Event
     */
    async processMetadata(data) {
        try {
            const metadata = data.metadata || data;
            
            this.log(`📝 Metadata: ${metadata.name || 'Unknown'}`);

            const metadataInfo = {
                mint: metadata.mint,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
                creators: metadata.creators,
                collection: metadata.collection,
                attributes: metadata.attributes,
                timestamp: Date.now()
            };

            this.emit('metadata', metadataInfo);
        } catch (error) {
            this.log('❌ Metadata processing error:', error.message);
            throw error;
        }
    }

    /**
     * Check if transaction is relevant to our wallet
     */
    isRelevantTrade(txDetails) {
        if (!this.config.walletAddress) return true;
        
        // Check if our wallet is involved
        const walletKey = this.config.walletAddress;
        
        return txDetails.accountData.some(acc => 
            acc.account === walletKey ||
            acc.owner === walletKey
        ) || txDetails.tokenTransfers.some(transfer =>
            transfer.fromUserAccount === walletKey ||
            transfer.toUserAccount === walletKey
        );
    }

    /**
     * Check if transaction is a swap
     */
    isSwapTransaction(txDetails) {
        return txDetails.type === 'SWAP' || 
               txDetails.instructions.some(inst => 
                   inst.programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' || // Jupiter
                   inst.programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'    // Raydium
               );
    }

    /**
     * Parse swap data from transaction
     */
    parseSwapData(txDetails) {
        const transfers = txDetails.tokenTransfers;
        
        if (transfers.length < 2) return null;

        // Assume first transfer is input, last is output
        const input = transfers[0];
        const output = transfers[transfers.length - 1];

        return {
            signature: txDetails.signature,
            timestamp: txDetails.timestamp,
            success: txDetails.success,
            fee: txDetails.fee,
            input: {
                mint: input.mint,
                amount: input.tokenAmount,
                decimals: input.decimals
            },
            output: {
                mint: output.mint,
                amount: output.tokenAmount,
                decimals: output.decimals
            },
            priceImpact: this.calculatePriceImpact(input, output)
        };
    }

    /**
     * Calculate price impact (simplified)
     */
    calculatePriceImpact(input, output) {
        // This is a simplified calculation
        // In production, you'd want more sophisticated price impact calculation
        try {
            const inputValue = input.tokenAmount / Math.pow(10, input.decimals);
            const outputValue = output.tokenAmount / Math.pow(10, output.decimals);
            const ratio = outputValue / inputValue;
            return ratio;
        } catch {
            return null;
        }
    }

    /**
     * Start webhook server
     */
    startServer(port) {
        const serverPort = port || this.config.port;
        
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(serverPort, () => {
                    this.log(`🚀 Helius Webhook Server running on port ${serverPort}`);
                    this.log(`📡 Webhook URL: http://localhost:${serverPort}/webhook/helius`);
                    this.log(`🔐 Webhook Secret: ${this.config.secret.substring(0, 16)}...`);
                    this.log(`👛 Monitoring Wallet: ${this.config.walletAddress || 'All wallets'}`);
                    resolve(this.server);
                });

                this.server.on('error', (error) => {
                    this.log('❌ Server error:', error.message);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop webhook server
     */
    stopServer() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.log('🛑 Webhook server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Get webhook configuration for Helius Dashboard
     */
    getWebhookConfig() {
        return {
            webhookURL: `http://your-vps-ip:${this.config.port}/webhook/helius`,
            webhookType: 'enhanced',
            accountAddresses: this.config.walletAddress ? [this.config.walletAddress] : [],
            transactionTypes: ['ANY'],
            authHeader: this.config.secret,
            webhookSecret: this.config.secret
        };
    }

    /**
     * Test webhook with mock data
     */
    async testWebhook() {
        const mockTransaction = {
            type: 'ENHANCED_TRANSACTION',
            signature: 'test123456789',
            timestamp: Date.now(),
            meta: { err: null, fee: 5000 },
            accountData: [],
            instructions: [],
            tokenTransfers: [],
            nativeTransfers: []
        };

        this.log('🧪 Testing webhook with mock data...');
        await this.processTransaction(mockTransaction);
        this.log('✅ Webhook test complete');
    }

    /**
     * Logging helper
     */
    log(...args) {
        if (this.config.enableLogging) {
            console.log(`[Helius Webhooks ${new Date().toLocaleTimeString('de-DE')}]`, ...args);
        }
    }
}

// Export als Standard für npm run webhook
export default HeliusWebhooks;
