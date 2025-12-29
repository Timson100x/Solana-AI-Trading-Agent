# 🚀 QUICK START - Alert Mode → Trading Mode

## Your Strategy: SMART! 💎

```
PHASE 1: ALERT-ONLY (1-2 Wochen)
→ Bot findet Memecoins
→ Du bekommst Telegram Alerts
→ Du checkst ob Signals gut sind
→ KEIN Auto-Trading (noch nicht)

PHASE 2: AUTO-TRADING (wenn Alerts gut sind)
→ TRADING_ENABLED=true
→ Bot kauft & verkauft automatisch
→ Du machst Profit
```

---

## PHASE 1: ALERT-ONLY MODE (JETZT STARTEN!)

### 1. Codespaces öffnen (2 min)
```
https://github.com/Timson100x/Solana-AI-Trading-Agent
→ Code → Codespaces → Create
```

### 2. .env erstellen (3 min)
```bash
cp .env.example .env
nano .env
```

**Füge ein:**
```env
# API Keys
GEMINI_API_KEY=dein_key_hier
HELIUS_API_KEY=dein_key_hier
TELEGRAM_BOT_TOKEN=dein_token_hier
TELEGRAM_CHAT_ID=deine_id_hier

# Wallet (MAINNET!)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=DEIN_HELIUS_KEY
WALLET_PRIVATE_KEY=dein_privat_key_hier

# PHASE 1: ALERT-ONLY
TRADING_ENABLED=false
# ⬆️ FALSE = Nur Alerts, kein Trading!

# Capital (für später)
TOTAL_CAPITAL_SOL=0.17

# Risk Settings (für später)
MAX_POSITION_PERCENT=50
STOP_LOSS_PERCENT=15
TAKE_PROFIT_PERCENT=30
MIN_CONFIDENCE=75

# Auto-Discovery (WICHTIG!)
AUTO_SCOUT_WALLETS=true
SCOUT_INTERVAL_HOURS=24

# Token Filters (Memecoins finden!)
MIN_TOKEN_LIQUIDITY=50000
MIN_TOKEN_VOLUME=10000
MIN_PRICE_CHANGE=50
MAX_PRICE_CHANGE=1000

# Wallet Quality
MIN_WALLET_WIN_RATE=60
AUTO_REMOVE_UNDERPERFORMERS=true

# WICHTIG: Auto-wrap erst wenn Trading aktiv
AUTO_WRAP_SOL=false
# ⬆️ FALSE = SOL bleibt SOL (für Phase 1)
```

### 3. System Test (1 min)
```bash
npm test
```

**Sollte zeigen:**
- ✅ All API keys valid
- ✅ Wallet connected
- ✅ Mainnet RPC working

### 4. Start Bot (1 min)
```bash
npm start
```

**Du solltest sehen:**
```
✅ Solana service initialized
✅ DEXScreener service initialized
✅ Position Manager initialized
✅ Wallet Scout initialized
🚀 Trading Agent Started

Balance: X.XXXX SOL
Status: Alert-Only Mode
Ready!
```

### 5. Telegram Check (1 min)
```
In Telegram:
/start

Du bekommst:
🚀 Trading Agent Started

Mode: Alert-Only (Testing)
Balance: X.XXXX SOL
Status: Monitoring for signals
```

---

## WAS PASSIERT JETZT (PHASE 1):

### Automatic Process:

```
Alle 60 Sekunden:
1. 🔍 Bot checkt tracked Wallets
2. 📊 Findet neue Transactions
3. 🤖 AI analysiert (ist das ein guter Trade?)
4. 📱 TELEGRAM ALERT wenn Confidence > 75%

Alle 24 Stunden:
1. 🔍 DEXScreener scannt Trending Tokens
2. 💎 Findet Memecoins mit +50% pump
3. 👥 Identifiziert profitable Trader
4. ✅ Fügt sie zu tracked Wallets hinzu
```

### Telegram Alerts Example:

```
🚨 TRADING SIGNAL DETECTED!

Token: ABC123...xyz
Symbol: BONK
Confidence: 87%

Price Change: +145%
Liquidity: $127k
Volume 24h: $45k

Wallet: DEF456...abc
Win Rate: 72%

Action: BUY
Reason: Early entry detected, high volume, 
wallet has proven track record

⚠️ Alert-Only Mode: Trade NOT executed
```

---

## WAS DU MACHST (PHASE 1):

### Week 1-2: Monitor Alerts

**Check:**
- ✅ Wie viele Alerts pro Tag? (5-15 ist gut)
- ✅ Sind die Tokens wirklich gut?
- ✅ Pumpen sie nachdem du Alert bekommen hast?
- ✅ Win Rate der Signals > 50%?

**Telegram Commands:**
```
/status   - Check system status
/wallets  - See tracked wallets
/stats    - See signal statistics
/scout    - Trigger manual wallet discovery
```

### Optimization:

**Zu wenige Signals?**
```env
MIN_CONFIDENCE=70  # Lower (war 75)
MIN_PRICE_CHANGE=30  # Lower (war 50)
```

**Zu viele schlechte Signals?**
```env
MIN_CONFIDENCE=80  # Higher (war 75)
MIN_WALLET_WIN_RATE=70  # Higher (war 60)
MIN_TOKEN_LIQUIDITY=100000  # Higher (war 50k)
```

**Optimale Settings für dich:**
```
Signals pro Tag: 7-12
Confidence Average: 75-85%
Token Quality: $50k+ liquidity
```

---

## PHASE 2: AUTO-TRADING AKTIVIEREN

### Wann bist du ready?

✅ **Checklist:**
- [ ] 20+ Alerts erhalten
- [ ] 60%+ der Alerts waren profitable (nachträglich geprüft)
- [ ] System läuft stabil (keine Crashes)
- [ ] Du verstehst wie Signals funktionieren
- [ ] Wallet hat genug SOL (0.17 + 0.05 für Fees)

### Aktivierung (2 min):

```bash
# Stop bot
Ctrl+C

# Edit .env
nano .env
```

**Ändere:**
```env
# TRADING AKTIVIEREN!
TRADING_ENABLED=true
# ⬆️ TRUE = Bot kauft & verkauft automatisch!

# Auto-wrap aktivieren
AUTO_WRAP_SOL=true
# ⬆️ TRUE = Auto SOL→wSOL für schnelleres Trading

# Optional: Konservativ starten
MAX_POSITION_PERCENT=30  # Nur 30% pro Trade
MAX_DAILY_TRADES=5       # Max 5 Trades/Tag
```

**Restart:**
```bash
npm start
```

**Telegram Nachricht:**
```
🚀 Trading Agent Started

Mode: LIVE TRADING ACTIVE 🔥
Balance: X.XXXX SOL
wSOL: Y.YYYY wSOL
Status: Ready to trade!
```

---

## LIVE TRADING - WAS PASSIERT:

### Automatic Trading Flow:

```
1. 🔍 Signal detected (wie vorher)

2. 🤖 AI Analysis:
   - Confidence > MIN_CONFIDENCE?
   - Token quality check
   - Wallet performance check

3. 💰 Position Sizing:
   - Calculate based on confidence
   - Max 30-50% of capital
   - Min 0.01 SOL

4. 🚀 BUY:
   - Jupiter swap: wSOL → Token
   - Best route selected
   - Transaction confirmed

5. 📊 Monitor:
   - Every 30 seconds check price
   - Stop Loss: -15%
   - Take Profit: +30%

6. 💸 SELL (automatic):
   - If Stop Loss hit: Sell
   - If Take Profit hit: Sell
   - If 23:30 reached: Sell (Day Trading)

7. 📱 Telegram Alert:
   - Position opened
   - Position closed
   - P&L result
```

### Example Trading Cycle:

```
📱 10:15 - ALERT:
🚀 POSITION OPENED
Token: BONK123...
Size: 0.05 SOL (30% of capital)
Amount: 1,234.56 BONK
Confidence: 82%

📱 10:47 - ALERT:
💰 POSITION CLOSED (Take Profit)
Token: BONK123...
Invested: 0.05 SOL
Returned: 0.067 SOL
P&L: +0.017 SOL (+34%)
```

---

## SAFETY FEATURES (ACTIVE):

### Automatic Protection:

1. **Stop Loss (-15%)**
   - Closes position wenn -15% loss
   - Protects capital

2. **Take Profit (+30%)**
   - Locks in gains at +30%
   - Prevents greed losses

3. **Day Trading Close (23:30)**
   - Closes ALL positions
   - No overnight risk

4. **Daily Limit (10 trades)**
   - Prevents overtrading
   - Conserves fees

5. **Position Sizing**
   - Max 50% per trade
   - Risk management

6. **Bad Wallet Removal**
   - Auto-removes wallets <40% WR
   - Keeps system optimized

---

## MONITORING (BOTH PHASES):

### Telegram Commands:

```
/start      - Start bot & get welcome
/status     - System status, uptime, positions
/balance    - SOL & wSOL balance
/positions  - Open positions with P&L
/stats      - Trading statistics, win rate
/wallets    - Tracked wallets & performance
/scout      - Trigger wallet scouting now
/review     - Review wallet performance
/close      - Close all positions (emergency)
/help       - Command list
```

### Dashboard:

```
Open: http://localhost:3000

Shows:
- Real-time status
- Open positions
- Daily P&L
- Trading stats
- Wallet performance
```

---

## EXPECTED RESULTS:

### Phase 1 (Alert-Only):

**Week 1:**
- 30-70 alerts received
- Learn system behavior
- Optimize settings

**Week 2:**
- 40-80 alerts
- 60%+ quality signals
- Ready for trading

### Phase 2 (Auto-Trading):

**Week 1 (with 0.17 SOL):**
```
Trades: 5-10
Win Rate: 45-60%
Daily P&L: +0.002 to +0.01 SOL
Weekly: +0.01 to +0.05 SOL (+6% to +30%)
```

**Month 1:**
```
Capital: 0.17 SOL
Conservative: 0.22 SOL (+30%)
Moderate: 0.25 SOL (+47%)
Good: 0.30 SOL (+76%)
```

---

## TROUBLESHOOTING:

### "Keine Alerts" (Phase 1):

1. Check tracked wallets:
   ```
   /wallets
   ```

2. Trigger scouting:
   ```
   /scout
   ```

3. Lower confidence:
   ```env
   MIN_CONFIDENCE=70
   ```

### "Zu viele schlechte Alerts":

```env
MIN_CONFIDENCE=80
MIN_WALLET_WIN_RATE=70
MIN_TOKEN_LIQUIDITY=100000
```

### "Trading nicht ausführbar" (Phase 2):

1. Check balance:
   ```
   /balance
   ```

2. Check wSOL:
   ```env
   AUTO_WRAP_SOL=true
   ```

3. Restart bot

---

## BACKUP & SAFETY:

### Daily Backup:

```bash
npm backup
```

### Check Logs:

```bash
cat logs/trade-history.json
```

### Emergency Stop:

```
In Telegram: /close
In Terminal: Ctrl+C
```

---

# 🎯 YOUR ACTION PLAN:

## TODAY (30 min):

1. ✅ Open Codespaces
2. ✅ Copy .env.example → .env
3. ✅ Add API keys
4. ✅ Set TRADING_ENABLED=false
5. ✅ npm test
6. ✅ npm start
7. ✅ Check Telegram: /start

## Week 1-2 (Alert-Only):

- 📱 Monitor Telegram Alerts
- 📊 Check if signals are good
- ⚙️ Optimize MIN_CONFIDENCE
- 📈 Track performance mentally

## When Ready (Auto-Trading):

- ✅ Change TRADING_ENABLED=true
- ✅ AUTO_WRAP_SOL=true
- ✅ Restart bot
- 💰 Start making profits!

---

**KEINE SIMULATOREN! NUR MAINNET! SMART TESTING MIT ALERTS ERST! 🔥**
