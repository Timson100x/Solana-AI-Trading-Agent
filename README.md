# 🤖 Solana AI Trading Agent

Professional AI-powered trading bot for Solana memecoins with ElizaOS V2 integration.

## ✨ Features

- **🧠 AI-Powered Analysis** - Groq & Gemini for smart trading decisions
- **⚡ Jupiter V6 Integration** - Fast swaps with dynamic priority fees
- **📊 Real-time Monitoring** - Helius webhooks for instant alerts
- **📱 Telegram Control** - Full bot control via Telegram
- **🎯 Auto Trading** - Configurable confidence thresholds
- **🛡️ Risk Management** - Stop-loss & take-profit automation

## 🚀 Quick Start

### Option 1: VPS Deployment (Recommended)

```bash
# SSH to your VPS
ssh user@your-vps-ip

# Run quick deploy script
curl -fsSL https://raw.githubusercontent.com/Timson100x/Solana-AI-Trading-Agent/main/vps-quick-deploy.sh | bash

# Configure .env
cd ~/Solana-AI-Trading-Agent
nano .env

# Start with PM2
pm2 start index.js --name trading-bot
pm2 logs trading-bot
```

### Option 2: Local Development

```bash
git clone https://github.com/Timson100x/Solana-AI-Trading-Agent.git
cd Solana-AI-Trading-Agent
npm install
cp .env.example .env
# Edit .env with your keys
npm start
```

## ⚙️ Configuration

Edit `.env` file:

```env
# Required
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WALLET_PRIVATE_KEY=your_base58_private_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# AI Providers
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key

# Trading Settings
TRADING_ENABLED=true
AUTO_TRADING_ENABLED=true
MIN_CONFIDENCE=70
MAX_TRADE_AMOUNT=0.02
SLIPPAGE_BPS=150
STOP_LOSS_PERCENTAGE=15
TAKE_PROFIT_PERCENTAGE=30
```

## 📱 Telegram Commands

| Command              | Description                |
| -------------------- | -------------------------- |
| `/status`            | Show bot status & balance  |
| `/alerts`            | Toggle alert notifications |
| `/buy <token> <sol>` | Manual buy                 |
| `/sell <token>`      | Manual sell                |
| `/positions`         | Show open positions        |
| `/help`              | Show all commands          |

## 📁 Project Structure

```
├── index.js              # Main entry point
├── src/
│   ├── services/         # API integrations
│   │   ├── jupiter.js    # Jupiter swap service
│   │   ├── telegram.js   # Telegram bot
│   │   └── wallet.js     # Wallet management
│   ├── trading/          # Trading logic
│   │   ├── auto-trader.js
│   │   └── risk-manager.js
│   ├── analyzers/        # AI analysis
│   └── utils/            # Utilities
├── config/               # Configuration files
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

## 🔧 PM2 Commands

```bash
pm2 start index.js --name trading-bot  # Start
pm2 stop trading-bot                    # Stop
pm2 restart trading-bot                 # Restart
pm2 logs trading-bot                    # View logs
pm2 status                              # Status
pm2 startup && pm2 save                 # Auto-start on reboot
```

## ⚠️ Disclaimer

This bot trades with real funds. Use at your own risk. Always start with small amounts and monitor closely.

## 📄 License

MIT License
