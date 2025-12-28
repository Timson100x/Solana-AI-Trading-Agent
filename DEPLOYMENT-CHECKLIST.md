# 🚀 Deployment Checklist

Before going live with real money, complete this checklist:

## ✅ Pre-Deployment

### 1. Environment Setup
- [ ] All API keys added to `.env`
- [ ] Wallet private key added (⚠️ KEEP SECRET!)
- [ ] RPC URL configured (Helius recommended)
- [ ] Telegram bot token & chat ID set
- [ ] `TRADING_ENABLED=false` (for testing)

### 2. Configuration Review
- [ ] `TOTAL_CAPITAL_SOL` set correctly
- [ ] `MAX_POSITION_PERCENT` reasonable (30-50%)
- [ ] `STOP_LOSS_PERCENT` configured (10-15%)
- [ ] `TAKE_PROFIT_PERCENT` configured (20-30%)
- [ ] `MIN_CONFIDENCE` set (75-80% recommended)
- [ ] `CLOSE_ALL_POSITIONS_AT` set (23:30 recommended)
- [ ] `MAX_DAILY_TRADES` set (10 recommended)

### 3. Wallet Setup
- [ ] Wallet has enough SOL for trading
- [ ] Extra SOL for transaction fees (0.05 SOL minimum)
- [ ] Test wallet on devnet first (optional but recommended)

### 4. Wallet List
- [ ] At least 3-5 profitable wallets in `config/smart-wallets.json`
- [ ] Verified win rate on Solscan.io
- [ ] Wallets actively trading (not inactive)

## ✅ Testing Phase (1-2 Weeks)

### Week 1: Paper Trading
```env
TRADING_ENABLED=false
```

- [ ] Agent starts without errors
- [ ] Signals detected from tracked wallets
- [ ] Telegram notifications working
- [ ] Dashboard accessible
- [ ] No crashes for 24+ hours

Monitor:
- How many signals per day?
- What's the average confidence?
- Are signals from all wallets or just one?

Optimize:
- Adjust `MIN_CONFIDENCE` if too few/many signals
- Add/remove wallets based on signal quality

### Week 2: Small Capital Test
```env
TRADING_ENABLED=true
TOTAL_CAPITAL_SOL=0.05
```

- [ ] First trade executes successfully
- [ ] Position opens and closes correctly
- [ ] Stop loss triggers if needed
- [ ] Take profit triggers if profitable
- [ ] Telegram alerts working
- [ ] Daily close at 23:30 works
- [ ] No failed transactions

Check after 7 days:
- Win rate: Should be 40%+
- P&L: Break-even or small profit?
- Max drawdown: < 20%?

## ✅ Go-Live Checklist

### Before Full Capital Deployment

- [ ] Paper trading showed profitable signals
- [ ] Small capital test was successful
- [ ] Win rate ≥ 40% after 20+ trades
- [ ] No major bugs or crashes
- [ ] Comfortable with risk

### Security Final Check
- [ ] `.env` in `.gitignore`
- [ ] Never committed private keys to git
- [ ] Telegram 2FA enabled
- [ ] GitHub 2FA enabled
- [ ] Backup of wallet private key stored securely

### Full Capital Deployment
```env
TOTAL_CAPITAL_SOL=0.17
```

- [ ] Start with conservative settings
- [ ] Monitor closely first 24 hours
- [ ] Check Telegram notifications frequently
- [ ] Review positions daily

## 🔄 Ongoing Maintenance

### Daily
- [ ] Check Telegram for alerts
- [ ] Review open positions (if any)
- [ ] Check agent status: `/status` command

### Weekly
- [ ] Review `config/wallet-performance.json`
- [ ] Check win rate by wallet
- [ ] Remove underperforming wallets
- [ ] Scout for new wallets (manual or auto)

### Monthly
- [ ] Calculate total P&L
- [ ] Adjust position sizing if needed
- [ ] Optimize `MIN_CONFIDENCE` threshold
- [ ] Review stop loss / take profit levels

## ⚠️ Emergency Procedures

### If Something Goes Wrong

1. **Close all positions:**
   ```
   /close in Telegram
   ```

2. **Stop the agent:**
   ```bash
   # In terminal
   Ctrl+C
   ```

3. **Set trading to false:**
   ```env
   TRADING_ENABLED=false
   ```

4. **Review logs:**
   - Check terminal output
   - Review Telegram messages
   - Check `config/wallet-performance.json`

5. **Unwrap wSOL back to SOL:**
   ```
   /unwrap in Telegram (if implemented)
   # Or manually in Phantom wallet
   ```

### Common Issues

**"No signals detected"**
- Check wallet list has active wallets
- Lower `MIN_CONFIDENCE` temporarily
- Verify wallets are still trading

**"Transaction failed"**
- Check RPC connection
- Verify sufficient balance
- Increase `SLIPPAGE_BPS`

**"Position not closing"**
- May be liquidity issue
- Try increasing slippage
- Close manually if needed

## 📊 Success Metrics

### Healthy Trading Agent

✅ Win rate: 45-60%
✅ Daily trades: 5-10
✅ Max drawdown: < 20%
✅ Monthly P&L: Positive
✅ Agent uptime: > 95%

### Warning Signs

⚠️ Win rate: < 35%
⚠️ No trades for 2+ days
⚠️ Daily P&L consistently negative
⚠️ Many failed transactions
⚠️ Agent crashes frequently

If you see warning signs:
1. Stop trading (`TRADING_ENABLED=false`)
2. Review wallet performance
3. Optimize settings
4. Test again with small capital

---

**Remember:** Start small, test thoroughly, scale gradually!
