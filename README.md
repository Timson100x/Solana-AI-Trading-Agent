# 🤖 Solana AI Trading Agent

AI-powered day trading bot for Solana with 0.17 SOL capital management.

## ⚡ Quick Start (GitHub Codespaces)

1. Click **"Code"** → **"Codespaces"** → **"Create codespace"**
2. Wait for automatic setup (2-3 minutes)
3. Copy configuration:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` with your API keys
5. Start the agent:
   ```bash
   npm start
   ```

## 🔑 Get API Keys

- **Gemini AI**: https://aistudio.google.com/apikey (FREE)
- **Helius RPC**: https://dev.helius.xyz (FREE tier available)
- **Telegram Bot**: Message @BotFather on Telegram, send `/newbot`
- **Telegram Chat ID**: Message @userinfobot on Telegram

## 📱 Telegram Commands

- `/start` - Initialize bot
- `/status` - Check agent status
- `/balance` - View SOL & wSOL balances
- `/positions` - Show open positions
- `/stats` - Trading statistics
- `/close` - Close all positions
- `/help` - Show all commands

## 🎯 Features

✅ Day Trading (auto-close at 23:30)  
✅ Auto SOL → wSOL wrapping for faster trades  
✅ Jupiter DEX integration (best rates)  
✅ Multi-agent AI analysis (Gemini)  
✅ Position sizing based on AI confidence  
✅ Stop loss & take profit automation  
✅ Telegram mobile control  
✅ Real-time dashboard  
✅ Risk management  

## ⚙️ Configuration

Edit `.env` to customize:

- `TRADING_ENABLED=true` - Enable real trading (default: false)
- `TOTAL_CAPITAL_SOL=0.17` - Your trading capital
- `MAX_POSITION_PERCENT=50` - Max % of capital per trade
- `STOP_LOSS_PERCENT=15` - Stop loss at -15%
- `TAKE_PROFIT_PERCENT=30` - Take profit at +30%
- `MIN_CONFIDENCE=75` - Only trade signals above 75% confidence
- `CLOSE_ALL_POSITIONS_AT=23:30` - Day trading close time

## 📊 Dashboard

Once running, open: `http://localhost:3000`

## 🛡️ Security

⚠️ **IMPORTANT:**
- Never commit your `.env` file
- Keep `WALLET_PRIVATE_KEY` secret
- Start with small amounts for testing
- Use testnet/devnet first if possible

## 🤖 Complete with GitHub Copilot

This repo has a basic structure. Use **GitHub Copilot** in Codespaces to complete:

Ask Copilot:
```
@workspace Complete this Solana trading agent with all services:
- wallet.js: Wallet management, SOL/wSOL wrapping
- jupiter.js: DEX integration
- telegram.js: Bot commands
- gemini.js: AI analysis
- position-manager.js: Trading logic

Implement day trading rules, position sizing, and risk management.
```

## 📝 License

MIT

---

Built with ❤️ for Solana trading
