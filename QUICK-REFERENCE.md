# ⚡ QUICK REFERENCE CARD

## 🚀 FASTEST CODESPACE SETUP (Copy & Paste)

### OPTION 1: One cURL Command (FASTEST! ⚡)
```bash
curl -fsSL https://raw.githubusercontent.com/Timson100x/Solana-AI-Trading-Agent/main/scripts/codespace-setup.sh | bash
```
**Time: 2 minutes | Auto-everything!**

---

### OPTION 2: Copilot Chat (Interactive)
```
@workspace Setup complete Solana trading bot: install all dependencies (npm install, nodemailer, oauth-1.0a, axios), create .env from .env.example, make all scripts executable (chmod +x scripts/*.sh), validate all configurations, install Solana CLI if missing, setup PM2 globally, create all necessary directories (logs/, data/, temp/), initialize git hooks, run health checks, and start the bot in development mode. Show progress for each step with emojis. Do not ask for confirmations, proceed automatically with sensible defaults. If .env is empty, show a notification to fill it but continue with setup.
```
**Time: 7-8 minutes | Guided setup**

---

### OPTION 3: Manual Commands (If above fail)
```bash
npm install && \
npm install nodemailer oauth-1.0a axios && \
cp .env.example .env && \
chmod +x scripts/*.sh && \
mkdir -p logs data temp && \
echo "✅ Done! Fill .env and run: npm start"
```
**Time: 3 minutes | Reliable**

---

## 📋 .env MINIMUM (Fill while setup runs)

```env
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WALLET_PRIVATE_KEY=your_base58_private_key
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
GOOGLE_AI_API_KEY=AIza...
```

---

## 🎯 START BOT

```bash
npm start
```

---

## 📊 ACCESS DASHBOARD

- Web: http://localhost:3000
- Telegram: /start
- Ports tab → Open port 3000

---

## 💡 COMPLETE WORKFLOW

```
1. Open Codespace
2. Paste ONE command (Option 1 recommended)
3. While it runs: Fill .env
4. Run: npm start
5. Access dashboard
6. Trade! 💰
```

---

## 🔔 WEBHOOK SETUP (Optional - Better Performance!)

### Enable Real-Time Notifications:
```env
# Add to .env
HELIUS_WEBHOOKS=true
HELIUS_API_KEY=your_key
PUBLIC_URL=https://your-url.ngrok.io
```

### Quick Test:
```bash
npm run test:webhooks
```

**Benefits:** 
- ⚡ Instant notifications (1-3s vs 30-60s)
- 💰 90% lower RPC costs
- 📈 Better for production

**Full guide:** HELIUS-WEBHOOK-GUIDE.md

---

## 🔥 EVEN FASTER: Codespace Secrets

Set secrets in GitHub:
- Settings → Secrets → Codespaces
- Add all your keys
- Auto-fills .env! ⚡

---

## 📚 Full Guides

- COPILOT-AUTO-SETUP.md → Complete instructions
- SETUP-GUIDE.md → Manual setup
- README.md → Overview

---

**SAVE THIS CARD! 📌**
