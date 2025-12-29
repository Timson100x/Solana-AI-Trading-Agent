# 🚀 CONTABO VPS DEPLOYMENT GUIDE

## 📋 Was du brauchst

### 1. Contabo VPS Bestellung

- **Empfohlen**: VPS M (4 vCPU, 16GB RAM, 400GB SSD)
- **Minimum**: VPS S (2 vCPU, 8GB RAM, 200GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Standort**: Deutschland (niedrige Latenz)

### 2. Notiere diese Infos:

- ✅ IP-Adresse des Servers
- ✅ Root Passwort (aus Contabo Email)
- ✅ SSH Port (normalerweise 22)

---

## 🔧 SETUP IN 5 MINUTEN

### Schritt 1: Verbinde dich mit dem VPS

```bash
# Mit SSH verbinden (Windows: PuTTY, Mac/Linux: Terminal)
ssh root@DEINE-VPS-IP

# Bei erster Verbindung: "yes" eingeben
```

### Schritt 2: Erstelle einen User (nicht als root laufen!)

```bash
# Neuen User erstellen
adduser trader
usermod -aG sudo trader

# Zu trader User wechseln
su - trader
```

### Schritt 3: Auto-Setup (ALLES IN EINEM BEFEHL!)

```bash
# Dieser Befehl installiert ALLES automatisch:
# - Node.js 20.x
# - Git
# - PM2
# - Bot Source Code
# - npm Packages

curl -sL https://raw.githubusercontent.com/Timson100x/Solana-AI-Trading-Agent/main/vps-setup.sh | bash
```

**Das wars! Setup läuft automatisch 2-3 Minuten.**

---

## ⚙️ KONFIGURATION

### Schritt 4: .env Datei bearbeiten

```bash
cd ~/Solana-AI-Trading-Agent
nano .env
```

**Pflicht-Felder (aus GitHub Codespace kopieren):**

```bash
# RPC (Helius kostenlos: https://helius.dev)
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=...

# Wallet (gleiche wie in Codespace)
WALLET_PRIVATE_KEY=deine_private_key_base58

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789

# APIs
BIRDEYE_API_KEY=...
GROQ_API_KEY=...

# 🚨 LIVE TRADING AKTIVIEREN
TRADING_ENABLED=true
MIN_POSITION_SIZE_SOL=0.006
SLIPPAGE_BPS=500
```

**Speichern:** `CTRL + X`, dann `Y`, dann `ENTER`

---

## 🧪 SYSTEM TESTEN

### Schritt 5: Health Check

```bash
npm run health
```

**Erwartetes Ergebnis:**

```
✅ Passed: 16
⚠️  Warnings: 0
❌ Failed: 0
📈 Success Rate: 100.0%

✅ ✅ ✅ SYSTEM READY FOR VPS DEPLOYMENT! ✅ ✅ ✅
```

---

## 🚀 BOT STARTEN

### Schritt 6: Mit PM2 starten (läuft im Hintergrund)

```bash
pm2 start ecosystem.config.js
```

**PM2 Commands:**

```bash
# Status anzeigen
pm2 status

# Live Logs sehen
pm2 logs solana-trading-bot

# Logs nur von den letzten 100 Zeilen
pm2 logs --lines 100

# Bot stoppen
pm2 stop solana-trading-bot

# Bot neu starten
pm2 restart solana-trading-bot

# Bot bei Server-Neustart auto-starten
pm2 startup
pm2 save
```

---

## 📊 MONITORING

### Telegram Alerts

Du bekommst automatisch:

- 🚨 BUY-Signale mit Token-Info
- ✅ Trade Bestätigungen mit Solscan Link
- ❌ Error Messages
- 📊 Scan-Summaries

### Logs anschauen

```bash
# Live Logs (CTRL+C zum Beenden)
pm2 logs

# Letzte 50 Zeilen
tail -n 50 logs/LIVE-TRADING-*.log

# Nach BUY suchen
grep "BUY SIGNALS" logs/*.log

# Nach Errors suchen
grep "❌" logs/*.log
```

### System Status

```bash
# RAM & CPU
htop

# Disk Space
df -h

# Uptime
uptime
```

---

## 🔒 SICHERHEIT

### Firewall Setup

```bash
# UFW Firewall aktivieren
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
sudo ufw status
```

### SSH Key statt Passwort (Optional aber empfohlen)

```bash
# Auf deinem lokalen PC:
ssh-keygen -t ed25519 -C "trader@contabo"

# Public Key auf VPS kopieren:
ssh-copy-id trader@DEINE-VPS-IP
```

---

## 🐛 TROUBLESHOOTING

### Bot crashed?

```bash
pm2 logs --lines 50    # Letzte 50 Zeilen
npm run health         # System Test
pm2 restart all        # Neu starten
```

### Jupiter API Fehler?

```bash
# Teste Netzwerk
curl -I https://quote-api.jup.ag/v6

# Wenn 200 OK: Bot funktioniert!
```

### Kein Geld mehr?

```bash
# Balance checken
node check-wallet.js
```

### Bot findet keine Tokens?

```bash
# Birdeye API testen
npm run health

# Scanner Logs
pm2 logs | grep "Tokens gefunden"
```

---

## 📈 OPTIMIERUNG

### Performance Tuning

```bash
# In .env ändern für mehr Speed:
SLIPPAGE_BPS=1000        # 10% Slippage (mehr erfolgreiche Trades)
MIN_POSITION_SIZE_SOL=0.01  # Größere Positionen
```

### Mehr Scans pro Stunde

Ändere in `src/config/trading-config.js`:

```javascript
scan: {
  intervalMinutes: 0.5,  // 30 Sekunden (120 scans/hour!)
},
```

---

## 💰 PROFIT TRACKING

### Wallet Balance live

```bash
# Alle 10 Sekunden Balance zeigen
watch -n 10 "node check-wallet.js"
```

### Trade History

```bash
# Alle erfolgreichen Trades
grep "✅ Trade executed" logs/*.log

# Signatures extrahieren
grep "Signature:" logs/*.log | cut -d':' -f4
```

---

## 🆘 SUPPORT

### Bei Problemen:

1. `pm2 logs --lines 100` kopieren
2. Screenshot von Telegram Alerts
3. GitHub Issue erstellen

### Wichtige Links:

- **Solscan**: https://solscan.io/account/DEIN_WALLET
- **Helius Dashboard**: https://dashboard.helius.dev
- **Birdeye**: https://birdeye.so/account/DEIN_WALLET

---

## ✅ FINAL CHECKLIST

Bevor du Bot alleine lässt:

- [ ] `pm2 status` zeigt "online"
- [ ] `pm2 logs` zeigt "Scan #X" ohne Errors
- [ ] Telegram sendet Alerts
- [ ] `npm run health` = 100%
- [ ] `pm2 save` ausgeführt (auto-restart)
- [ ] Backup von `.env` gemacht
- [ ] Private Key sicher gespeichert
- [ ] Firewall aktiviert

---

## 🎉 READY TO TRADE!

Wenn alles grün ist:

```bash
# Setze TRADING_ENABLED=true in .env
nano .env

# Bot neu starten
pm2 restart solana-trading-bot

# Logs live verfolgen
pm2 logs
```

**DER BOT TRADET JETZT AUTOMATISCH! 🚀💰**

Bei jedem BUY-Signal:

1. Telegram Alert mit Token-Info
2. Trade wird automatisch ausgeführt
3. Solscan Link zum verifizieren
4. Position wird getracked

---

## 📱 TELEGRAM COMMANDS (Optional)

Später kannst du Telegram Commands hinzufügen:

- `/status` - Bot Status
- `/balance` - Wallet Balance
- `/trades` - Letzte Trades
- `/stop` - Trading pausieren
- `/start` - Trading fortsetzen

(Noch nicht implementiert, aber einfach zu machen!)

---

**Viel Erfolg! 🚀🌙**
