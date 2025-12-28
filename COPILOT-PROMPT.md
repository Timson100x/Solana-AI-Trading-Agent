# 🤖 GitHub Copilot Integration Prompt

Copy this prompt into **GitHub Copilot Chat** in Codespaces:

---

## Complete Prompt

```
@workspace I need you to complete and integrate this Solana AI trading agent.

Current Structure:
- ✅ Services exist but need full implementation
- ✅ Position manager ready
- ✅ Wallet scout & performance tracker ready
- ❌ Main index.js needs integration
- ❌ Services need complete implementation

Your Tasks:

### 1. Complete src/services/wallet.js

Implement full wallet management:
- Import: @solana/web3.js, @solana/spl-token, bs58
- constructor(connection): Initialize with Solana connection
- initialize(): Load wallet from process.env.WALLET_PRIVATE_KEY (base58 decode with bs58)
- getBalance(): Return SOL balance in SOL (not lamports)
- getWrappedSOLBalance(): Get wSOL token account balance
- wrapSOL(amount): Wrap SOL to wSOL
  * Get/create associated token account
  * Transfer SOL
  * Sync native instruction
  * Return transaction signature
- autoWrapForTrading(): 
  * Check current SOL balance
  * Wrap all except KEEP_SOL_BALANCE
  * Return true if wrapped
- getPublicKey(): Return wallet public key
- getKeypair(): Return wallet keypair

### 2. Complete src/services/jupiter.js

Implement DEX trading:
- constructor(connection, wallet): Store connection and wallet
- getQuote(inputMint, outputMint, amount):
  * Call https://quote-api.jup.ag/v6/quote
  * Params: inputMint, outputMint, amount (in lamports), slippageBps
  * Return quote object
- executeSwap(quote):
  * POST to https://quote-api.jup.ag/v6/swap
  * Body: quoteResponse, userPublicKey, wrapAndUnwrapSol: true
  * Deserialize transaction with VersionedTransaction
  * Sign with wallet keypair
  * Send and confirm
  * Return signature
- buyToken(tokenMint, solAmount):
  * WSOL mint: 'So11111111111111111111111111111111111111112'
  * Get quote WSOL → tokenMint
  * Execute swap
  * Return {signature, inputAmount, outputAmount, quote}
- sellToken(tokenMint, tokenAmount, decimals):
  * Get quote tokenMint → WSOL
  * Execute swap
  * Return {signature, inputAmount, outputAmount, quote}

### 3. Complete src/services/telegram.js

Implement Telegram bot:
- Import: node-telegram-bot-api
- constructor(agent): Store agent reference, initialize bot with TELEGRAM_BOT_TOKEN
- setupCommands(): Register all commands:
  * /start - Welcome message
  * /status - Agent uptime, open positions, daily trades
  * /balance - SOL & wSOL balances
  * /positions - List open positions with P&L
  * /stats - Trading statistics (win rate, total P&L)
  * /wallets - Show tracked wallets with performance
  * /scout - Trigger wallet scouting manually
  * /review - Review wallet performance manually
  * /close - Close all positions
  * /help - Command list
- sendMessage(text): Send to TELEGRAM_CHAT_ID with Markdown
- sendAlert(alert): Format trading alert nicely

### 4. Complete src/services/gemini.js

Implement AI analysis:
- Import: @google/generative-ai
- constructor(): Initialize with GEMINI_API_KEY, model: gemini-2.0-flash-exp
- analyze(data, prompt):
  * Convert data to JSON or TOON if USE_TOON=true
  * Send to Gemini with prompt
  * Parse JSON response
  * Return {confidence: number, reasoning: string, action: string}
- analyzeTransaction(tx, walletConfig):
  * Prompt: "Analyze this transaction for trading signal..."
  * Consider: timing, volume, wallet history
  * Return {confidence: 0-100, action: "BUY"|"SKIP", reasoning: string}

### 5. Complete index.js - Main Integration

Create complete trading agent:

```javascript
import 'dotenv/config';
import express from 'express';
import { Connection } from '@solana/web3.js';
import { WalletService } from './src/services/wallet.js';
import { JupiterService } from './src/services/jupiter.js';
import { SolanaService } from './src/services/solana.js';
import { GeminiService } from './src/services/gemini.js';
import { TelegramService } from './src/services/telegram.js';
import { PositionManager } from './src/services/position-manager.js';
import { WalletScout } from './src/services/wallet-scout.js';
import { PerformanceTracker } from './src/services/performance-tracker.js';
import { HeliusWebhooks } from './src/services/helius-webhooks.js';
import { Logger } from './src/utils/logger.js';
import fs from 'fs/promises';

const logger = new Logger('Agent');

class TradingAgent {
  constructor() {
    this.app = express();
    this.stats = { startTime: Date.now(), totalSignals: 0, totalTrades: 0 };
  }

  async initialize() {
    // Initialize Solana connection
    this.connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');

    // Initialize all services
    this.solana = new SolanaService(this.connection);
    this.wallet = new WalletService(this.connection);
    this.jupiter = new JupiterService(this.connection, this.wallet);
    this.gemini = new GeminiService();
    this.telegram = new TelegramService(this);

    // Initialize managers
    this.positionManager = new PositionManager(
      this.wallet, this.jupiter, this.telegram, this.gemini
    );
    this.walletScout = new WalletScout(this.solana, this.gemini);
    this.performanceTracker = new PerformanceTracker();

    await this.performanceTracker.loadPerformance();

    // Auto-wrap SOL
    if (process.env.AUTO_WRAP_SOL === 'true') {
      await this.wallet.autoWrapForTrading();
    }

    // Setup API & webhooks
    this.setupAPI();
    this.helius = new HeliusWebhooks(this);
    this.helius.setup(this.app);
  }

  setupAPI() {
    this.app.use(express.json());
    this.app.use(express.static('public'));

    this.app.get('/', (req, res) => {
      res.json({
        name: 'Solana AI Trading Agent',
        version: '1.0.0',
        uptime: Math.floor((Date.now() - this.stats.startTime) / 60000),
        stats: this.getStats()
      });
    });

    this.app.get('/stats', (req, res) => res.json(this.getStats()));
    this.app.get('/health', (req, res) => res.json({ status: 'ok' }));

    this.app.listen(process.env.PORT || 3000, () => {
      logger.success(`API running on port ${process.env.PORT || 3000}`);
    });
  }

  async start() {
    await this.initialize();

    // Send startup notification
    const balance = await this.wallet.getBalance();
    const wsolBalance = await this.wallet.getWrappedSOLBalance();

    await this.telegram.sendMessage(
      `🚀 *Trading Agent Started*\n\n` +
      `Balance: ${balance.toFixed(4)} SOL\n` +
      `wSOL: ${wsolBalance.toFixed(4)} wSOL\n` +
      `Status: Ready!`
    );

    // Start monitoring loops
    this.startMonitoring();

    // Auto-scout wallets
    if (process.env.AUTO_SCOUT_WALLETS === 'true') {
      this.startWalletScouting();
    }
  }

  startMonitoring() {
    // Main monitoring - every 60s
    setInterval(() => this.monitor(), 60000);

    // Position monitoring - every 30s
    setInterval(() => this.positionManager.monitorPositions(), 30000);
  }

  async monitor() {
    const wallets = await this.loadWallets();

    for (const wallet of wallets) {
      const transactions = await this.solana.getRecentTransactions(wallet.address, 5);

      for (const tx of transactions) {
        const signal = await this.gemini.analyzeTransaction(tx, wallet);

        if (signal && signal.action === 'BUY' && 
            signal.confidence >= parseInt(process.env.MIN_CONFIDENCE || 75)) {

          this.stats.totalSignals++;

          await this.performanceTracker.trackSignal(
            wallet.address, signal, false
          );

          if (process.env.TRADING_ENABLED === 'true') {
            const position = await this.positionManager.openPosition(signal);
            if (position) {
              this.stats.totalTrades++;
              await this.performanceTracker.trackSignal(
                wallet.address, signal, true
              );
            }
          }
        }
      }
    }
  }

  startWalletScouting() {
    const intervalHours = parseInt(process.env.SCOUT_INTERVAL_HOURS || 24);

    setInterval(async () => {
      const newWallets = await this.walletScout.scoutNewWallets();
      if (newWallets.length > 0) {
        await this.performanceTracker.addWallets(newWallets);
      }
    }, intervalHours * 3600000);

    // Initial scout after 5 minutes
    setTimeout(() => this.walletScout.scoutNewWallets(), 300000);
  }

  async loadWallets() {
    const data = await fs.readFile('./config/smart-wallets.json', 'utf-8');
    return JSON.parse(data);
  }

  getStats() {
    return {
      uptime: Math.floor((Date.now() - this.stats.startTime) / 60000),
      totalSignals: this.stats.totalSignals,
      totalTrades: this.stats.totalTrades,
      positions: this.positionManager.getStats()
    };
  }
}

const agent = new TradingAgent();
agent.start();
```

Requirements:
- All imports must work (check package.json)
- Proper error handling everywhere (try/catch)
- Use Logger for all console output
- Validate all environment variables
- Test each service independently
- Fix any TypeScript/import errors

Start implementation now. Test incrementally. Fix all errors before finishing.
```

---

## After Copilot Completes

1. Test each service:
```bash
node -e "import('./src/services/wallet.js').then(m => console.log('✅ Wallet OK'))"
node -e "import('./src/services/jupiter.js').then(m => console.log('✅ Jupiter OK'))"
# etc...
```

2. Start agent:
```bash
npm start
```

3. Monitor Telegram for notifications

---

## Troubleshooting

If Copilot asks questions:
- Use ES modules (import/export)
- Target Node.js 20+
- All async functions should use async/await
- Return Promises for async operations
