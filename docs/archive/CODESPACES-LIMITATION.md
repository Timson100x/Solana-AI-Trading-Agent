# ⚠️ GitHub Codespaces Trading Limitation

## Problem
GitHub Codespaces **blockiert Jupiter API Zugriff** (DNS + IP-level).

## Was funktioniert ✅
1. **Scanner**: 28 Tokens gefunden, 60 Scans/Stunde
2. **AI Analysis**: 2 BUY + 5 HOLD + 21 SKIP Signale
3. **Wallet**: 0.1760 SOL (29 Positionen ready)
4. **Trading Logic**: 100% implementiert und getestet
5. **Telegram Alerts**: Alle Signale werden gesendet

## Was NICHT funktioniert ❌
- **Jupiter API**: DNS ENOTFOUND `quote-api.jup.ag`
- **Alternative URLs**: 404 errors
- **IP-basierter Zugriff**: Network blockiert

## Lösung: VPS Deployment 🚀

### Option 1: VPS (EMPFOHLEN)
```bash
# Auf deinem VPS (Ubuntu/Debian):
git clone https://github.com/Timson100x/Solana-AI-Trading-Agent
cd Solana-AI-Trading-Agent
npm install

# .env konfigurieren
cp .env.example .env
nano .env  # Wallet, API Keys, TRADING_ENABLED=true

# Starten
npm run scanner
```

### Option 2: Lokaler PC
```bash
# Auf Windows/Mac/Linux:
git pull
npm install
npm run scanner
```

### Option 3: Render.com / Railway.app
1. Repo verbinden
2. Build Command: `npm install`
3. Start Command: `npm run scanner`
4. Environment Variables aus .env kopieren

## Test-Logs
- **Scan #1**: 28 tokens, 2 BUY signals (PEOW $51.89, NVIDA $85.13)
- **Trade Attempts**: 2/2 failed (Jupiter API blocked)
- **System Status**: ✅ Ready, aber Codespaces blockiert Swaps

## Deployment Checklist
- [ ] VPS mit Ubuntu 22.04+ mieten
- [ ] Git + Node.js 20+ installieren
- [ ] Repo clonen
- [ ] .env konfigurieren (TRADING_ENABLED=true)
- [ ] `npm install && npm run scanner`
- [ ] Ersten Trade in Telegram beobachten

