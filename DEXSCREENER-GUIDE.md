# 🔍 DEXScreener Auto-Discovery Guide

## What Is This?

Your bot now **automatically finds profitable wallets** without you doing ANY manual work!

### How It Works

```
Every 24 hours:

1. 🔍 DEXScreener finds trending tokens
   → Filters: +50% price, $50k liquidity, $10k volume

2. 📊 Bot analyzes each token's early buyers
   → Gets wallet addresses from on-chain data

3. 🤖 AI analyzes each wallet's history
   → Calculates win rate, profit, trading style

4. ✅ Adds wallets with 60%+ win rate
   → Automatically updates config/smart-wallets.json

5. 🗑️ Removes underperformers every 7 days
   → Keeps only profitable wallets

Result: SELF-OPTIMIZING SYSTEM! 🚀
```

---

## Configuration

### In `.env`:

```env
# Enable auto-scouting
AUTO_SCOUT_WALLETS=true

# How often to scout (24 hours recommended)
SCOUT_INTERVAL_HOURS=24

# Token Quality Filters
MIN_TOKEN_LIQUIDITY=50000    # $50k minimum
MIN_TOKEN_VOLUME=10000       # $10k 24h volume
MIN_PRICE_CHANGE=50          # +50% minimum gain
MAX_PRICE_CHANGE=1000        # +1000% maximum (scam filter)

# Wallet Quality Filters  
MIN_WALLET_WIN_RATE=60       # 60% win rate minimum
```

### Adjust For Your Strategy

**Conservative (High Quality Only):**
```env
MIN_TOKEN_LIQUIDITY=100000   # $100k
MIN_WALLET_WIN_RATE=70       # 70% WR
MIN_PRICE_CHANGE=100         # +100% only
```

**Moderate (Balanced):**
```env
MIN_TOKEN_LIQUIDITY=50000    # $50k
MIN_WALLET_WIN_RATE=60       # 60% WR
MIN_PRICE_CHANGE=50          # +50%
```

**Aggressive (More Signals):**
```env
MIN_TOKEN_LIQUIDITY=25000    # $25k
MIN_WALLET_WIN_RATE=50       # 50% WR
MIN_PRICE_CHANGE=30          # +30%
```

---

## Manual Scouting (via Telegram)

You can also trigger scouting manually:

```
/scout
```

Bot will:
1. Find trending tokens NOW
2. Analyze top traders
3. Add profitable wallets
4. Send you a summary

---

## What Gets Tracked

### Token Metrics:
- ✅ Price change (1h, 6h, 24h)
- ✅ Liquidity ($USD)
- ✅ Volume (24h)
- ✅ Buy/Sell ratio
- ✅ Market cap
- ✅ Transaction count

### Wallet Metrics:
- ✅ Win rate (%)
- ✅ Total profit (SOL)
- ✅ Average hold time
- ✅ Trading frequency
- ✅ Risk level
- ✅ Token selection quality

---

## Example Workflow

### Day 1: Initial Scout

```
🔍 Scouting...
📊 Found 8 trending tokens:
  - BONK: +245% ($2.1M liquidity)
  - WIF: +187% ($5.4M liquidity)
  - MYRO: +156% ($890k liquidity)
  ...

💎 Analyzing top traders...
  - Found 23 potential wallets
  - AI analyzing trading history...

✅ Added 5 profitable wallets:
  - Wallet A: 78% WR (discovered via BONK)
  - Wallet B: 72% WR (discovered via WIF)
  - Wallet C: 68% WR (discovered via MYRO)
  - Wallet D: 65% WR (discovered via BONK)
  - Wallet E: 61% WR (discovered via WIF)
```

### Day 2-7: Tracking Performance

```
📊 Wallet Performance Update:
  - Wallet A: 5 signals, 4 wins (80% WR) ✅
  - Wallet B: 3 signals, 2 wins (66% WR) ✅
  - Wallet C: 7 signals, 3 wins (43% WR) ⚠️
  - Wallet D: 2 signals, 0 wins (0% WR) ❌
  - Wallet E: 4 signals, 3 wins (75% WR) ✅
```

### Day 8: Auto-Cleanup

```
🗑️ Removing underperformers:
  - Wallet C: 43% WR (below 60% threshold)
  - Wallet D: 0% WR (below 40% minimum)

🔍 Scouting for replacements...
✅ Added 3 new wallets to replace removed ones
```

---

## Viewing Your Wallets

### Check Current Wallets:

```
/wallets
```

**Shows:**
```
💼 Tracked Wallets (6):

1. Wallet ABC123...
   Win Rate: 78%
   Signals: 12 | Trades: 8
   P&L: +0.045 SOL
   Discovered: via BONK

2. Wallet DEF456...
   Win Rate: 72%
   Signals: 9 | Trades: 6
   P&L: +0.032 SOL
   Discovered: via WIF

...
```

### Check Performance:

```
/stats
```

**Shows:**
```
📊 Trading Statistics:

Total Wallets: 6
Active Wallets: 5
Avg Win Rate: 68%
Total Signals: 45
Total Trades: 28
Total P&L: +0.124 SOL

Best Wallet: ABC123... (78% WR)
Worst Wallet: XYZ789... (52% WR)
```

---

## Advantages Over Manual Search

### Manual Method (Old Way):
```
1. Open DEXScreener
2. Find trending token
3. Click "Top Traders"
4. Copy wallet address
5. Open Solscan
6. Check transaction history
7. Calculate win rate manually
8. Add to config
9. Repeat for each wallet

Time: 30-60 minutes per scouting session
Frequency: Once per week (if you remember)
Quality: Depends on your analysis skills
```

### Auto Method (Your Bot):
```
1. Bot does everything automatically
2. Every 24 hours
3. AI analyzes accurately
4. Only adds profitable wallets
5. Auto-removes bad performers

Time: 0 minutes (automated)
Frequency: Daily
Quality: AI-powered analysis
Result: Always optimized!
```

---

## Monitoring

### Check If Scouting Works:

```bash
# In Codespaces terminal
cat config/smart-wallets.json

# Should show wallets with "Auto-discovered" in notes
```

### Check Performance Data:

```bash
cat config/wallet-performance.json

# Shows detailed stats for each wallet
```

---

## Troubleshooting

### "No wallets found"

**Reasons:**
1. No tokens meet your filter criteria
   → Lower `MIN_PRICE_CHANGE` or `MIN_TOKEN_LIQUIDITY`

2. Wallets don't meet win rate threshold
   → Lower `MIN_WALLET_WIN_RATE` to 50%

3. DEXScreener API issues
   → Wait 1 hour and try again

### "Scout not running"

Check `.env`:
```env
AUTO_SCOUT_WALLETS=true  # Must be true!
```

Trigger manually:
```
/scout
```

### "Too many bad wallets added"

**Increase quality filters:**
```env
MIN_WALLET_WIN_RATE=70
MIN_TOKEN_LIQUIDITY=100000
MIN_PRICE_CHANGE=100
```

---

## Best Practices

### Week 1: Conservative
```env
MIN_WALLET_WIN_RATE=70
MIN_TOKEN_LIQUIDITY=100000
```
→ Only highest quality wallets
→ Fewer signals but higher accuracy

### Week 2+: Optimize
```env
# Based on results, adjust:
MIN_WALLET_WIN_RATE=60-70
MIN_TOKEN_LIQUIDITY=50000-100000
```
→ Find the sweet spot for YOUR risk tolerance

### Monthly: Review
```
/wallets
/stats
```
→ Check overall performance
→ Adjust filters if needed

---

## Expected Results

### With Good Filters (70% WR):
```
- 3-5 new wallets per week
- 80% of added wallets are actually profitable
- System stays optimized
- High signal quality
```

### With Loose Filters (50% WR):
```
- 5-10 new wallets per week  
- 50% of added wallets are profitable
- More noise, more signals
- Lower average quality
```

**Recommendation:** Start strict, loosen if needed!

---

## The Magic Formula

```
HIGH QUALITY FILTERS
+ AI ANALYSIS
+ DAILY SCOUTING
+ AUTO-REMOVAL
= SELF-OPTIMIZING TRADING SYSTEM! 🚀
```

**You literally don't have to do ANYTHING!**

The bot:
- ✅ Finds profitable tokens
- ✅ Finds profitable traders
- ✅ Analyzes their performance
- ✅ Adds the best ones
- ✅ Removes the bad ones
- ✅ Optimizes continuously

**You just:**
- ✅ Check Telegram notifications
- ✅ Monitor overall performance
- ✅ Adjust filters if needed

---

## Pro Tips

1. **Start Conservative** → High filters, high quality
2. **Monitor First Week** → See what gets added
3. **Adjust After 20+ Trades** → Based on real data
4. **Trust The System** → It's smarter than manual search
5. **Review Monthly** → Keep optimizing

---

**Your bot is now a SELF-LEARNING PROFIT MACHINE! 💎**
