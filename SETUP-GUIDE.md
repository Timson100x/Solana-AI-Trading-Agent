# 🚀 Complete Setup Guide

## Quick Start (5 Minutes)

### 1. Get API Keys

#### Gemini AI (Required)
1. Go to: https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key → Add to `.env`

#### Helius RPC (Required)
1. Go to: https://dev.helius.xyz
2. Sign up (free)
3. Create API key
4. Copy key → Add to `.env`

#### Telegram Bot (Required)
1. Open Telegram
2. Message: @BotFather
3. Send: `/newbot`
4. Follow instructions
5. Copy token → Add to `.env`
6. Message: @userinfobot
7. Copy your chat ID → Add to `.env`

#### Birdeye API (Optional - for auto wallet discovery)
1. Go to: https://birdeye.so
2. Sign up
3. Get API key (free tier available)
4. Copy key → Add to `.env`

### 2. Configure Wallet

**⚠️ NEVER share your private key!**

From Phantom wallet:
1. Settings → Show Private Key
2. Copy the key (Base58 format)
3. Paste in `.env` as `WALLET_PRIVATE_KEY`

### 3. Configure in Codespaces

```bash
# Copy example
cp .env.example .env

# Edit (add your keys)
nano .env

# Save: Ctrl+X, Y, Enter
```

### 4. Start Agent

```bash
npm start
```

---

## Auto Wallet Scouting

### How It Works

The agent automatically:

1. **Finds Profitable Wallets**
   - Scans trending tokens (top gainers)
   - Identifies early buyers
   - Analyzes their trading history
   - Adds wallets with 60%+ win rate

2. **Tracks Performance**
   - Monitors every signal from each wallet
   - Calculates win rate & profit
   - Saves data in `config/wallet-performance.json`

3. **Removes Underperformers**
   - Reviews wallets every 7 days
   - Removes if win rate < 40%
   - Removes if inactive for 7+ days
   - Removes if total profit negative

### Configuration

In `.env`:

```env
# Enable auto-scouting
AUTO_SCOUT_WALLETS=true

# Scout once per day
SCOUT_INTERVAL_HOURS=24

# Only add wallets with 60%+ win rate
MIN_WALLET_WIN_RATE=60

# Auto-remove bad performers
AUTO_REMOVE_UNDERPERFORMERS=true

# Review every week
REVIEW_INTERVAL_DAYS=7
```

### Manual Wallet Adding

Add to `config/smart-wallets.json`:

```json
[
  {
    "address": "WALLET_ADDRESS_HERE",
    "name": "Profitable Trader",
    "notes": "Found on Solscan, 75% win rate"
  }
]
```

---

## Trading Configuration

### Conservative (Recommended for Start)

```env
TRADING_ENABLED=false  # Paper trading first!
TOTAL_CAPITAL_SOL=0.17
MAX_POSITION_PERCENT=30  # Only 30% per trade
MIN_CONFIDENCE=80  # High confidence only
STOP_LOSS_PERCENT=10  # Tight stop loss
TAKE_PROFIT_PERCENT=20
```

### Moderate

```env
TRADING_ENABLED=true
MAX_POSITION_PERCENT=50
MIN_CONFIDENCE=75
STOP_LOSS_PERCENT=15
TAKE_PROFIT_PERCENT=30
```

### Aggressive (Only After Testing!)

```env
MAX_POSITION_PERCENT=70
MIN_CONFIDENCE=70
STOP_LOSS_PERCENT=20
TAKE_PROFIT_PERCENT=50
```

---

## Monitoring

### Telegram Commands

- `/start` - Start bot
- `/status` - Agent status
- `/balance` - View balances
- `/positions` - Open positions
- `/stats` - Trading stats
- `/wallets` - Tracked wallets & performance
- `/scout` - Manually trigger wallet scouting
- `/review` - Review wallet performance
- `/close` - Close all positions

### Dashboard

Open: `http://localhost:3000`

Shows:
- Real-time stats
- Open positions
- Wallet performance
- Recent signals

---

## Testing Strategy

### Week 1: Paper Trading

```env
TRADING_ENABLED=false
```

- Watch signals come in
- See which wallets perform best
- Optimize MIN_CONFIDENCE
- No real money at risk

### Week 2: Small Capital

```env
TRADING_ENABLED=true
TOTAL_CAPITAL_SOL=0.05
```

- Test with small amount
- Verify everything works
- Build confidence

### Week 3+: Full Capital

```env
TOTAL_CAPITAL_SOL=0.17
```

- Scale up if profitable
- Keep monitoring performance

---

## Troubleshooting

### "No signals detected"

1. Check wallet list: `config/smart-wallets.json`
2. Enable auto-scouting: `AUTO_SCOUT_WALLETS=true`
3. Lower MIN_CONFIDENCE temporarily

### "Transaction failed"

1. Check RPC: `SOLANA_RPC_URL` correct?
2. Check balance: Enough SOL for fees?
3. Check slippage: Increase `SLIPPAGE_BPS`

### "Wallet private key error"

1. Format must be Base58 (not array)
2. No spaces in `.env`
3. Check Phantom: Settings → Private Key

---

## Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] Never commit `.env` to git
- [ ] Wallet private key only in `.env`
- [ ] Start with small capital
- [ ] Enable 2FA on all services
- [ ] Regularly check `wallet-performance.json`

---

## Getting Help

1. Check logs in terminal
2. Use `/status` in Telegram
3. Review `config/wallet-performance.json`
4. Check GitHub Issues

---

Built with ❤️ for Solana trading
