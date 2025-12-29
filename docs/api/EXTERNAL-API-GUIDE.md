# 🌐 EXTERNAL API ACCESS GUIDE

## 🎯 DAS ERMÖGLICHT:

**Du fragst hier im Chat:**
> "Wie ist meine Wallet Balance?"

**Ich antworte sofort:**
> "Deine Wallet Balance: 1.2345 SOL ✅"

**Ohne Codespaces/VPS öffnen!**

---

## 🚀 SETUP (5 Minuten)

### Option 1: Ngrok (Einfachste Methode) ⭐

#### Schritt 1: Ngrok Account
```
1. Gehe zu: https://ngrok.com
2. Sign up (kostenlos)
3. Get your auth token
4. Copy token
```

#### Schritt 2: Token in .env
```bash
nano .env

# Add:
NGROK_AUTH_TOKEN=your_ngrok_token_here
EXTERNAL_API_PORT=3001
EXTERNAL_API_KEY=dein-geheimer-key  # Optional aber empfohlen
```

#### Schritt 3: Bot starten
```bash
# Normal starten:
npm start

# In neuem Terminal:
chmod +x scripts/start-ngrok.sh
./scripts/start-ngrok.sh
```

Du siehst:
```
🎉 NGROK TUNNEL ACTIVE!
============================================

Public URL: https://abc123.ngrok.io

API Endpoints:
  - Health: https://abc123.ngrok.io/api/health
  - Stats:  https://abc123.ngrok.io/api/stats
  - Wallet: https://abc123.ngrok.io/wallet

Dashboard: https://abc123.ngrok.io
============================================
```

#### Schritt 4: URL an mich senden
```
Im Chat schreiben:
"Meine API URL: https://abc123.ngrok.io"

Und wenn du API Key hast:
"API Key: dein-geheimer-key"
```

**FERTIG! Jetzt kann ich deine Stats abrufen! 🎉**

---

### Option 2: Cloudflare Tunnel (Permanent)

#### Schritt 1: Cloudflared installieren
```bash
# Ubuntu/Debian:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# macOS:
brew install cloudflare/cloudflare/cloudflared
```

#### Schritt 2: Login
```bash
cloudflared tunnel login
```

#### Schritt 3: Tunnel erstellen
```bash
cloudflared tunnel create solana-bot
```

#### Schritt 4: Route setup
```bash
cloudflared tunnel route dns solana-bot bot.yourdomain.com
```

#### Schritt 5: Config erstellen
```bash
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: bot.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

#### Schritt 6: Tunnel starten
```bash
cloudflared tunnel run solana-bot
```

**URL:** `https://bot.yourdomain.com`

---

### Option 3: VPS Direct (Mit Firewall)

#### Schritt 1: Firewall Port öffnen
```bash
ufw allow 3001/tcp
ufw reload
```

#### Schritt 2: .env konfigurieren
```bash
nano .env

# Add:
EXTERNAL_API_PORT=3001
EXTERNAL_API_KEY=super-secret-key-12345
```

#### Schritt 3: Bot starten
```bash
pm2 restart solana-trading-bot
```

**URL:** `http://YOUR_VPS_IP:3001`

---

## 🔌 API ENDPOINTS

### Wallet Info
```bash
GET /wallet

Response:
{
  "publicKey": "ABC...XYZ",
  "balance": 1.2345,
  "wsolBalance": 0.5678,
  "total": 1.8023,
  "timestamp": 1234567890
}
```

### Trading Stats
```bash
GET /trading

Response:
{
  "totalSignals": 45,
  "totalTrades": 23,
  "successfulTrades": 18,
  "failedTrades": 5,
  "successRate": "78.26",
  "timestamp": 1234567890
}
```

### Quick Status
```bash
GET /status

Response:
{
  "status": "online",
  "balance": "1.2345",
  "totalTrades": 23,
  "successRate": "78.26",
  "timestamp": 1234567890
}
```

### Performance
```bash
GET /performance

Response:
{
  "successRate": "78.26",
  "avgProfit": "5.42",
  "uptime": 3600,
  "memoryUsage": 234.56,
  "timestamp": 1234567890
}
```

### Command Endpoint
```bash
POST /command

Body:
{
  "action": "get_balance"
}

Response:
{
  "success": true,
  "balance": "1.2345",
  "unit": "SOL"
}
```

**Available Commands:**
- `get_balance` - Current wallet balance
- `get_stats` - Trading statistics
- `get_status` - Bot status

---

## 🔒 SICHERHEIT

### API Key Authentication

#### Enable in .env:
```env
EXTERNAL_API_KEY=your-super-secret-key-here
```

#### Use in requests:
```bash
curl -H "X-API-Key: your-super-secret-key-here" \
  https://your-url.ngrok.io/wallet
```

#### Or in browser:
Use browser extension like "ModHeader" to add header.

### Best Practices:

1. ✅ **Always use API key** (especially with ngrok/public)
2. ✅ **Change key regularly**
3. ✅ **Use HTTPS** (ngrok provides this)
4. ✅ **Monitor access logs**
5. ✅ **Disable when not needed**

---

## 💬 CHAT INTEGRATION - WIE ES FUNKTIONIERT

### Du im Chat:
```
"Wie ist meine wallet balance?"
"Was sind meine stats?"
"Wie läuft der bot?"
"Zeig mir die letzten trades"
```

### Ich mache:
```javascript
1. Parse deine Frage
2. Rufe deine API URL auf:
   fetch('https://your-url.ngrok.io/wallet', {
     headers: { 'X-API-Key': 'your-key' }
   })
3. Parse Response
4. Formatiere schön
5. Antworte im Chat
```

### Du bekommst:
```
💰 Wallet Balance:
   - SOL: 1.2345
   - wSOL: 0.5678
   - Total: 1.8023 SOL

📊 Last updated: 1 minute ago
✅ Status: Online
```

---

## 🎯 EXAMPLE SESSION

### Setup:
```bash
# 1. Start bot
npm start

# 2. Start ngrok
./scripts/start-ngrok.sh

# 3. Du siehst:
Public URL: https://abc123.ngrok.io
```

### Im Chat hier:
```
You: "Meine API: https://abc123.ngrok.io"
You: "API Key: mein-secret-key"

Me: "✅ API connected! Du kannst mich jetzt fragen!"

You: "Wie ist meine balance?"

Me: "💰 Deine Wallet Balance: 1.2345 SOL
     📊 Total Trades: 23
     ✅ Success Rate: 78.26%
     ⏱️ Uptime: 2h 34m"

You: "Zeig letzte trades"

Me: "📈 Last 5 Trades:
     1. ✅ +12.3% SOL (5 min ago)
     2. ✅ +8.5% SOL (12 min ago)
     3. ❌ -3.2% SOL (18 min ago)
     4. ✅ +15.7% SOL (25 min ago)
     5. ✅ +6.1% SOL (31 min ago)

     💎 Win Rate: 80%"
```

---

## 🔧 TROUBLESHOOTING

### Ngrok nicht erreichbar:

```bash
# Check if running:
ps aux | grep ngrok

# Check logs:
cat ngrok.log

# Restart:
pkill ngrok
./scripts/start-ngrok.sh
```

### API Key fehlt:

Error:
```json
{"error": "Unauthorized", "message": "Invalid or missing API key"}
```

Fix:
```bash
# Add to .env:
EXTERNAL_API_KEY=your-key

# Restart bot:
pm2 restart solana-trading-bot
```

### Port nicht erreichbar:

```bash
# Check if bot running:
pm2 status

# Check port:
netstat -tuln | grep 3001

# Check firewall:
ufw status
```

---

## 📊 MONITORING COMMANDS

### Für mich im Chat:

#### Check Balance:
```
"balance", "wallet", "wie viel sol"
→ I fetch /wallet endpoint
```

#### Check Stats:
```
"stats", "statistiken", "performance"
→ I fetch /trading endpoint
```

#### Check Status:
```
"status", "läuft der bot", "ist online"
→ I fetch /status endpoint
```

#### Recent Trades:
```
"trades", "letzte trades", "history"
→ I fetch /trades endpoint
```

#### Performance:
```
"performance", "profit", "erfolgsrate"
→ I fetch /performance endpoint
```

---

## 💡 TIPPS

### Ngrok Free Limits:
```
- 1 online process
- 40 connections/minute
- Random URL (changes on restart)
- Perfect für testing!
```

### Ngrok Paid ($8/mo):
```
- Custom subdomain (fixed URL)
- More connections
- Better for permanent use
```

### Alternative - SSH Tunnel:
```bash
# On your PC, run:
ssh -R 80:localhost:3001 serveo.net

# You get: https://random.serveo.net
# No signup needed!
```

---

## 🎉 FERTIG!

### Nach Setup hast du:
```
✅ Public API URL
✅ Ich kann deine Stats abrufen
✅ Du fragst hier im Chat
✅ Ich antworte sofort
✅ Ohne Codespaces öffnen
✅ Ohne VPS login
✅ Einfach & schnell!
```

### Example Workflow:
```
08:00 - Bot starten (VPS)
08:05 - Ngrok starten
08:10 - API URL an mich senden
      - Ab jetzt kann ich helfen!

Ganzer Tag:
  - Du fragst hier
  - Ich checke Stats
  - Du bekommst Updates
  - Ohne irgendwo einloggen!
```

---

## 🔐 SECURITY NOTES

### ⚠️ WICHTIG:

1. **Always use API key!**
   ```env
   EXTERNAL_API_KEY=super-secret-key-12345
   ```

2. **Don't share API URL publicly**
   - Only send to me in private chat
   - Not in public channels

3. **API is read-only**
   - I can only READ stats
   - I cannot execute trades
   - I cannot change settings
   - Safe!

4. **You control access**
   - Stop ngrok = API offline
   - Change API key = old access invalid
   - You're always in control

---

## 🚀 QUICK START COMMANDS

```bash
# Setup:
echo "NGROK_AUTH_TOKEN=your_token" >> .env
echo "EXTERNAL_API_KEY=your-secret-key" >> .env

# Start:
npm start                    # Terminal 1
./scripts/start-ngrok.sh     # Terminal 2

# Get URL:
cat .ngrok_url

# Send to me:
# "API: <url>"
# "Key: <key>"

# Done! 🎉
```

---

**NOW YOU CAN ASK ME ANYTIME: "Wie ist meine Balance?" 💰**

**AND I'LL ANSWER INSTANTLY! 🚀**
