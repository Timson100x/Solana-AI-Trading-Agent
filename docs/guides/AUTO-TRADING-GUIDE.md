# 🤖 AUTO-TRADING SYSTEM - QUICK START

## ✅ WAS WURDE IMPLEMENTIERT

### 1. **Token Verifier** (`src/verifiers/token-verifier.js`)

- Prüft Token-Sicherheit NACH AI-Analyse
- Nutzt DEXScreener für Liquidität/Volume
- Berechnet Risk Score (0-100)
- ✅ Ready to use

### 2. **Risk Manager** (`src/trading/risk-manager.js`)

- Max 5% Portfolio pro Trade
- Position Sizing basierend auf Risk Score
- Portfolio Exposure Tracking (max 30%)
- Stop-Loss: -25% | Take-Profit: +100%/+300%
- ✅ Ready to use

### 3. **Auto Trader** (`src/trading/auto-trader.js`)

- Kompletter Trade-Flow:
  1. Token Verification
  2. Position Sizing
  3. Risk Check
  4. Jupiter Quote
  5. Swap Execution
  6. Telegram Notification
- ✅ Ready to use

### 4. **Position Monitor** (`src/monitoring/position-monitor.js`)

- Läuft alle 30 Sekunden
- Überwacht P&L via Birdeye
- Auto Stop-Loss/Take-Profit
- Trailing Stop bei +50%
- ✅ Ready to use

### 5. **Enhanced Bot Integration**

- Auto-Trading in `enhanced-bot.js` integriert
- Startet Position Monitor automatisch
- Zeigt Trading Stats nach jedem Scan
- ✅ Ready to use

---

## 🚀 AKTIVIERUNG

### Option 1: Test-Modus (empfohlen)

```bash
# 1. Test-Script ausführen
npm run test-auto

# Prüft:
# - Solana Connection
# - Wallet Balance
# - Alle Services (DEXScreener, Jupiter)
# - Token Verification
# - Position Sizing
# - Risk Management
```

### Option 2: Live Trading aktivieren

```bash
# .env bearbeiten:
TRADING_ENABLED=true
# oder
AUTO_TRADING_ENABLED=true

# Scanner neu starten:
pkill -f "node src/scheduler.js"
npm run scanner &
```

---

## 📊 WIE ES FUNKTIONIERT

### Kompletter Flow (pro BUY Signal):

```
1. Enhanced Bot findet Token (Birdeye + AI)
   ↓
2. TokenVerifier prüft Sicherheit
   - DEXScreener: Liquidity, Volume, Price
   - Risk Score berechnen
   ↓
3. RiskManager berechnet Position Size
   - Max 5% Portfolio
   - Abhängig von Risk Score
   ↓
4. Auto Trader führt aus
   - Jupiter Quote holen
   - Swap ausführen
   - Position speichern
   ↓
5. Position Monitor überwacht
   - Alle 30s: P&L Update
   - Auto-Close bei Stop-Loss/Take-Profit
   - Trailing Stop ab +50%
```

### Telegram Nachrichten:

- **BUY Signal**: "🚀 TRADE EXECUTED" mit Details
- **Position Monitor**: "💰 POSITION CLOSED" mit P&L
- **Fehler**: "❌ Trade Failed" mit Grund

---

## ⚙️ KONFIGURATION

### In `.env`:

```bash
# Trading Status
TRADING_ENABLED=true          # Hauptschalter
AUTO_TRADING_ENABLED=true     # Alternative

# Wallet (mindestens 0.1 SOL empfohlen)
WALLET_PRIVATE_KEY=dein_key_hier
```

### In `src/config/trading-config.js`:

```javascript
autoTrading: {
  enabled: process.env.TRADING_ENABLED === "true",
  maxPortfolioExposure: 0.3,    // 30% max in Positionen
  maxSinglePosition: 0.05,      // 5% max pro Trade
  minPositionSize: 0.01,        // 0.01 SOL minimum
  riskScoreThreshold: 70,       // Max Risk Score
  positionMonitorInterval: 30000 // 30 Sekunden
}
```

---

## 🔒 SICHERHEIT

### Risk Limits:

- ✅ Max 5% Portfolio pro Trade
- ✅ Max 30% Portfolio insgesamt
- ✅ Risk Score < 70 erforderlich
- ✅ Mindest-Liquidität geprüft
- ✅ DEXScreener Validation

### Stop-Loss / Take-Profit:

- Stop-Loss: **-25%** (automatisch)
- Take-Profit 1: **+100%** (automatisch)
- Take-Profit 2: **+300%** (automatisch)
- Trailing Stop: Ab **+50%**, Close bei **-30%** vom Peak

### Error Handling:

- ✅ Alle Trades in try-catch
- ✅ 3x Retry bei Jupiter Swaps
- ✅ Telegram Notifications bei Fehlern
- ✅ Logging für alle Operationen

---

## 📈 MONITORING

### Live Stats im Terminal:

```
📊 STATISTIK
============================================================
Gesamt analysiert: 50
BUY: 4
HOLD: 12
SKIP: 34

Auto-Trading:
  Executed: 2
  Failed: 1
  Success Rate: 66.7%

Portfolio:
  Open Positions: 2
  Total Invested: 0.08 SOL
============================================================
```

### Position Monitor Output:

```
📊 Checking 2 open positions...
BONK: +15.32% (+0.0012 SOL)
PEPE: -5.21% (-0.0004 SOL)
```

---

## 🧪 TESTING

### Vor Live Trading:

1. **Balance Check**: Mind. 0.1 SOL empfohlen
2. **Test-Script**: `npm run test-auto`
3. **Alert-Modus**: Erst mit `TRADING_ENABLED=false` testen
4. **Kleine Position**: Beginne mit Min Position Size

### Test Commands:

```bash
# Alle Komponenten testen
npm run test-auto

# Scanner im Alert-Modus
TRADING_ENABLED=false npm run scanner

# Einmaliger Enhanced-Scan
npm run enhanced
```

---

## 📝 LOGS & DEBUGGING

### Log Levels:

- `logger.info()` - Normale Operationen
- `logger.success()` - ✅ Erfolgreiche Trades
- `logger.warn()` - ⚠️ Warnungen (z.B. Skipped Trades)
- `logger.error()` - ❌ Fehler

### Log Locations:

- Terminal: Alle Outputs
- Telegram: Wichtige Events (Trades, Closes)
- `logs/` Ordner: Persistent (falls konfiguriert)

---

## 🎯 NEXT STEPS

1. **Test ausführen**:

   ```bash
   npm run test-auto
   ```

2. **Scanner stoppen** (falls läuft):

   ```bash
   pkill -f "node src/scheduler.js"
   ```

3. **Trading aktivieren** (wenn ready):

   ```bash
   # In .env:
   AUTO_TRADING_ENABLED=true

   # Scanner neu starten:
   npm run scanner &
   ```

4. **Überwachen**:
   - Terminal für Live-Stats
   - Telegram für Trade-Notifications
   - Position Monitor läuft automatisch

---

## ⚠️ WICHTIGE HINWEISE

1. **Testnet First**: Teste mit kleinem Betrag
2. **Nie mehr riskieren als du verlieren kannst**
3. **Monitor aktiv halten**: Position Monitor läuft im Hintergrund
4. **Backup Wallet Key**: Sichere deinen Private Key!
5. **Rate Limits beachten**: Birdeye = 60/hour, Groq = 30/min

---

## 🐛 TROUBLESHOOTING

### "Insufficient balance"

→ Mind. 0.05 SOL im Wallet benötigt

### "Portfolio exposure limit reached"

→ Max 30% Portfolio bereits investiert
→ Warte auf Position Closes

### "Verification failed"

→ Token zu riskant (Risk Score > 70)
→ Normal, viele Tokens werden geskippt

### "Quote failed"

→ Jupiter Issue oder Token nicht handelbar
→ Wird automatisch geskippt

---

## 📞 SUPPORT

Bei Fragen oder Problemen:

1. Logs im Terminal prüfen
2. `npm run test-auto` ausführen
3. `.env` Konfiguration überprüfen
4. Telegram Notifications checken

**VIEL ERFOLG! 🚀💰**
