# 🚀 Quick Integration - NL Auto-Deploy System

## In 3 Minuten integriert!

### Schritt 1: Integration in index.js

Füge nach der Telegram Service Initialisierung hinzu:

```javascript
// Import am Anfang der Datei
import { NLTelegramBridge } from "./src/services/nl-telegram-bridge.js";

// In der TradingAgent class, nach this.telegram = new TelegramService(this):
async initialize() {
  // ... existing code ...

  this.telegram = new TelegramService(this);

  // 🤖 NEW: Natural Language Command Handler
  this.nlBridge = new NLTelegramBridge(this.telegram, this.gemini);

  // ... rest of code ...
}
```

**DAS WAR'S!** Fertig integriert! ✅

### Schritt 2: Test

```bash
npm start
```

In Telegram:

```
/listbots
→ Zeigt verfügbare Bot-Typen

/buildbot baue einen gridbot für SOL von 50-150 mit 10 levels
→ Generiert Bot Code
→ Zeigt Preview

/deploy
→ Speichert lokal (VPS Deploy wenn konfiguriert)
```

### Schritt 3 (Optional): GitHub Actions Setup

Für Auto-Deploy zu Contabo VPS:

1. **GitHub Secrets** (Settings → Secrets → Actions):

```
VPS_HOST=your-contabo-ip
VPS_USER=root
VPS_PATH=/root/Solana-AI-Trading-Agent
VPS_SSH_KEY=<your-private-key>
```

2. **SSH Key Setup**:

```bash
ssh-keygen -t ed25519 -C "github-actions"
ssh-copy-id root@your-contabo-ip
cat ~/.ssh/id_ed25519  # Copy to VPS_SSH_KEY secret
```

3. **Push zu GitHub**:

```bash
git add .
git commit -m "Add NL Auto-Deploy System"
git push origin main
```

**Fertig!** GitHub Actions deployed jetzt automatisch zu Contabo! 🚀

---

## Commands

### `/buildbot <description>` - Bot generieren

**Beispiele:**

```
/buildbot baue einen gridbot für SOL von 50-150 mit 10 levels
/buildbot erstelle dca bot für BONK alle 4h mit 0.01 SOL
/buildbot sniper bot für neue pump.fun tokens
```

### `/deploy` - Bot deployen

Deployed den zuletzt generierten Bot (lokal oder VPS)

### `/listbots` - Verfügbare Templates

Zeigt alle Bot-Typen die generiert werden können

### `/rollback` - Letzten Deploy rückgängig

Falls etwas schief geht

---

## Workflow

```
User: "/buildbot baue grid bot"
  ↓
AI parst Command
  ↓
Code generiert
  ↓
Preview in Telegram
  ↓
User: "/deploy"
  ↓
Git Commit → Push → VPS Deploy
  ↓
Bot läuft! 🔥
```

**Zeit: ~30 Sekunden von Idee zum laufenden Bot!**

---

## Full Documentation

Siehe: [NL-AUTO-DEPLOY-GUIDE.md](NL-AUTO-DEPLOY-GUIDE.md)
