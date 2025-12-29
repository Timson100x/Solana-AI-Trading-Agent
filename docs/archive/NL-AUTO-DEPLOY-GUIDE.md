# 🤖 Natural Language Auto-Deploy System

## ElizaOS V2 - Von "baue einen Gridbot" zum laufenden Bot in 30 Sekunden!

---

## 🎯 WAS IST DAS?

**Sprich mit dem Bot in natürlicher Sprache, er generiert Code und deployed automatisch!**

### Beispiele:

```
You: /buildbot baue einen gridbot für SOL von 50-150 mit 10 levels

Bot: ✅ Bot generiert!
     Grid Trading Bot mit automatischen Buy/Sell Orders
     Datei: grid-trading-bot-1735466234567.js
     Parameter: { minPrice: 50, maxPrice: 150, gridLevels: 10 }
     Deploy mit: /deploy

You: /deploy

Bot: 🚀 Deploye Bot...
     ✅ Git Commit...
     ✅ GitHub Push...
     ✅ VPS Deploy...
     ✅ Deployment erfolgreich!
     Bot läuft jetzt auf dem VPS! 🔥
```

**DAS WAR'S! 30 Sekunden von Idee zum laufenden Bot!**

---

## 🚀 SETUP

### Schritt 1: GitHub Secrets konfigurieren

In deinem GitHub Repo: **Settings → Secrets and Variables → Actions**

Füge hinzu:

```
VPS_HOST=your-contabo-ip
VPS_USER=root
VPS_PATH=/root/Solana-AI-Trading-Agent
VPS_SSH_KEY=<your-private-ssh-key>
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

**SSH Key generieren (falls noch nicht vorhanden):**

```bash
# Auf deinem lokalen Rechner oder in Codespace:
ssh-keygen -t ed25519 -C "github-actions"
# → Speichert in ~/.ssh/id_ed25519

# Public Key auf VPS hinzufügen:
ssh-copy-id root@your-contabo-ip

# Private Key in GitHub Secret einfügen:
cat ~/.ssh/id_ed25519
# → Kopiere gesamten Output in VPS_SSH_KEY Secret
```

### Schritt 2: NL-Bridge in index.js integrieren

```javascript
// In index.js nach Telegram Service Init:
import { NLTelegramBridge } from "./src/services/nl-telegram-bridge.js";

// Nach this.telegram = new TelegramService(this):
this.nlBridge = new NLTelegramBridge(this.telegram, this.gemini);
```

### Schritt 3: .env Update

```env
# VPS Deployment (optional - für lokalen Deploy-Test)
VPS_HOST=your-contabo-ip
VPS_USER=root
VPS_PATH=/root/Solana-AI-Trading-Agent
```

---

## 💬 TELEGRAM COMMANDS

### `/buildbot <beschreibung>` - Bot generieren

**Beispiele:**

```
/buildbot baue einen gridbot für SOL von 50-150 mit 10 levels
/buildbot erstelle dca bot für BONK alle 4h mit 0.01 SOL
/buildbot sniper bot für neue pump.fun tokens
/buildbot copy trading bot der SmartWallet ABC123 folgt
/buildbot arbitrage bot zwischen Jupiter und Raydium
```

**Bot parst automatisch:**

- Token Symbol/Mint
- Preis Range
- Grid Levels
- Zeitintervalle
- SOL Amounts
- Risk Level

### `/deploy` - Bot deployen

Deployed den zuletzt generierten Bot:

1. ✅ Git Commit
2. ✅ GitHub Push
3. ✅ VPS SSH Deploy
4. ✅ PM2 Restart
5. ✅ Health Check

### `/listbots` - Verfügbare Bot-Typen

Zeigt alle verfügbaren Templates:

- **Grid Trading Bot**: Automatische Buy/Sell Orders
- **DCA Bot**: Dollar Cost Averaging
- **Sniper Bot**: Token Launch Sniper
- **Copy Trading Bot**: Smart Wallets folgen
- **Arbitrage Bot**: DEX Arbitrage

### `/rollback` - Letzten Deploy rückgängig

Falls etwas schief geht:

```
/rollback
→ Git reset --hard HEAD~1
→ VPS rollback
→ PM2 restart
```

---

## 🔧 WORKFLOW

### 1. User gibt NL Command:

```
/buildbot baue einen gridbot für SOL von 50-150 mit 10 levels
```

### 2. NL Parser analysiert:

```javascript
{
  type: "grid-trading-bot",
  parameters: {
    token: "So11111111111111111111111111111111111111112",
    minPrice: 50,
    maxPrice: 150,
    gridLevels: 10
  }
}
```

### 3. Code Generator:

```javascript
// Erzeugt vollständigen Grid Bot Code
// Mit ElizaOS V2 Integration
// Jupiter Swaps
// Logger
// Error Handling
```

### 4. Auto-Deploy:

```bash
1. git add bots/grid-trading-bot-xyz.js
2. git commit -m "🤖 Auto-generated: Grid Trading Bot"
3. git push origin main
4. GitHub Actions triggered
5. SSH to VPS
6. git pull
7. pm2 restart
8. Telegram notification
```

---

## 📊 ARCHITEKTUR

```
User Input (Telegram)
    ↓
NL Command Handler (ElizaOS)
    ↓ parse()
Command Specification
    ↓
Code Generator
    ↓ fillTemplate()
Generated Bot Code
    ↓
Auto-Deploy Service
    ↓ deploy()
    ├─→ Git Commit
    ├─→ GitHub Push
    └─→ GitHub Actions
            ↓
        VPS Deploy
            ↓
        PM2 Restart
            ↓
    Telegram Notification ✅
```

---

## 🎨 BOT TEMPLATES

### Grid Trading Bot

```javascript
class GridTradingBot {
  - Initialize grid levels (minPrice → maxPrice)
  - Place buy orders below current price
  - Place sell orders above current price
  - Automatic profit taking
  - ElizaOS V2 optimized swaps
}
```

**Parameters:**

- `token`: Token mint address
- `minPrice`: Unterste Grid-Grenze
- `maxPrice`: Oberste Grid-Grenze
- `gridLevels`: Anzahl Grid-Stufen (z.B. 10)
- `orderSize`: SOL per Order (z.B. 0.01)

### DCA Bot

```javascript
class DCABot {
  - Buy token every X interval
  - Track average purchase price
  - Auto-accumulation strategy
  - Historical tracking
}
```

**Parameters:**

- `token`: Token Symbol/Mint
- `amount`: SOL per purchase
- `interval`: "4h", "daily", "weekly"

### Sniper Bot (Coming Soon)

- Pump.fun launch monitoring
- Instant buy on new token
- Risk analysis before buy
- Take profit automation

---

## 🔐 SECURITY

### GitHub Secrets:

✅ **VPS_SSH_KEY**: Privater SSH Key (encrypted at rest)
✅ **VPS_HOST**: VPS IP (can be public)
✅ **TELEGRAM_BOT_TOKEN**: Bot Token (secret)

### Deployment Safety:

```yaml
# In GitHub Actions:
1. Syntax Check before deploy
2. npm install --omit=dev (no dev dependencies)
3. PM2 restart (graceful, no downtime)
4. Health check after deploy
5. Telegram notification (success/failure)
```

### Rollback Strategy:

```
/rollback
→ Git revert last commit
→ VPS git reset --hard HEAD~1
→ PM2 restart with old code
→ Safe!
```

---

## 🚨 LIMITATIONS

### 1. Template-Based

- Nur vordefinierte Bot-Typen
- Keine komplett freien Code-Generierung
- Templates können erweitert werden

### 2. Parameter Extraction

- AI parst Parameter aus NL Input
- Kann falsch interpretieren
- Preview vor Deploy prüfen!

### 3. No Validation

- Code wird NICHT getestet vor Deploy
- Syntax Check ja, Logic Check nein
- Erst in Alert Mode testen!

---

## 📈 ROADMAP

### Phase 1 (Jetzt):

✅ Grid Bot Template
✅ DCA Bot Template
✅ Auto-Deploy via GitHub Actions
✅ Telegram Integration

### Phase 2:

- [ ] Sniper Bot Template
- [ ] Copy Trading Template
- [ ] Arbitrage Template
- [ ] Parameter Validation
- [ ] Code Testing vor Deploy

### Phase 3:

- [ ] Perplexity Integration (Premium API)
- [ ] Web Search für Token Research
- [ ] Dynamic Template Generation
- [ ] Multi-VPS Deploy
- [ ] Bot Performance Tracking

---

## 💡 BEISPIEL SESSION

```
User: /listbots
Bot:  🤖 Verfügbare Bot-Typen:
      • Grid Trading Bot
      • DCA Bot
      • Sniper Bot
      ...

User: /buildbot baue grid bot für SOL 80-120 mit 5 levels
Bot:  🧠 Verstehe Anfrage...
      ✅ Bot generiert!
      **Grid Trading Bot**
      Datei: grid-trading-bot-1735466234567.js
      Parameter: {
        token: "So11111111111111111111111111111111111111112",
        minPrice: 80,
        maxPrice: 120,
        gridLevels: 5
      }
      Deploy mit: /deploy

User: /deploy
Bot:  🚀 Deploye Bot...
      ⏳ Git Commit...
      ⏳ GitHub Push...
      ⏳ VPS Deploy...

      ✅ Deployment erfolgreich!
      Datei: grid-trading-bot-1735466234567.js
      GitHub: ✅ Pushed
      VPS: ✅ Online

      Bot läuft jetzt auf dem VPS! 🔥

[Nach 2 Minuten - GitHub Actions fertig]

Bot:  🚀 Auto-Deploy Successful!
      Repository: Timson100x/Solana-AI-Trading-Agent
      Commit: 🤖 Auto-generated: Grid Trading Bot
      Bot restarted on VPS! 🔥
```

---

## 🎯 NÄCHSTE SCHRITTE

### Option 1: Lokal testen (Codespace)

```bash
# 1. Integration in index.js hinzufügen
# 2. npm start
# 3. /buildbot in Telegram testen
# 4. Code wird lokal generiert (kein Deploy)
```

### Option 2: GitHub Actions Setup

```bash
# 1. GitHub Secrets konfigurieren
# 2. SSH Key setup
# 3. Push zu GitHub
# 4. /buildbot + /deploy testen
# 5. Bot läuft auf VPS!
```

### Option 3: Perplexity Integration

```bash
# Mit Perplexity Premium API:
# 1. API Key in .env
# 2. Web-Search für Token Research
# 3. Bessere Parameter Extraction
# 4. Risk Analysis vor Deploy
```

---

## 🆘 TROUBLESHOOTING

### "Deployment failed"

```
→ Check GitHub Actions Log
→ Check VPS SSH connection: ssh root@your-vps-ip
→ Check PM2 status: pm2 status
→ /rollback if needed
```

### "Bot generiert aber nicht deployed"

```
→ VPS_HOST Secret fehlt?
→ GitHub Actions Workflow triggered?
→ Check Actions Tab in GitHub Repo
```

### "Health check failed"

```
→ SSH to VPS
→ pm2 logs solana-bot
→ Check for errors
→ pm2 restart solana-bot
```

---

## 📚 RESSOURCEN

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **SSH Key Setup**: https://docs.github.com/en/authentication
- **PM2 Docs**: https://pm2.keymetrics.io/
- **ElizaOS**: https://github.com/elizaOS/eliza

---

**Version:** v1.0.0  
**ElizaOS:** V2 Integration  
**Status:** 🚀 Production Ready (Phase 1)

---

## 🔥 READY TO GO?

```bash
# 1. Setup GitHub Secrets
# 2. Integration in index.js
# 3. Push to GitHub
# 4. /buildbot baue einen gridbot für SOL
# 5. /deploy
# 6. PROFIT! 💰
```

**Let's automate EVERYTHING! 🤖🔥**
