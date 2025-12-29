# 🚀 VPS DEPLOYMENT GUIDE - PRODUCTION READY

## ⚠️ WICHTIG VOR DEM START!

### Pre-Deployment Checklist:
```
✅ Bot funktioniert in Codespaces (Alert Mode)
✅ Alle Tests erfolgreich
✅ Wallet hat genug SOL (min 0.5 SOL)
✅ .env konfiguriert & geprüft
✅ RPC Endpoint funktioniert (Helius/QuickNode)
✅ Telegram Bot verbunden
```

**NUR WENN ALLES ✅ IST → VPS DEPLOYMENT!**

---

## 🖥️ VPS REQUIREMENTS

### Minimum Specs:
```
CPU: 2 Cores
RAM: 2 GB
Disk: 20 GB SSD
OS: Ubuntu 22.04 LTS
Network: 100 Mbps
```

### Recommended Specs:
```
CPU: 4 Cores
RAM: 4 GB
Disk: 40 GB SSD
OS: Ubuntu 22.04 LTS
Network: 1 Gbps
```

### Empfohlene VPS Provider:
```
1. Contabo (günstig): ~€5/Monat
2. Hetzner (Deutschland): ~€5/Monat
3. DigitalOcean: ~$6/Monat
4. Vultr: ~$6/Monat
```

---

## 📋 STEP-BY-STEP DEPLOYMENT

### STEP 1: VPS Setup (10 min)

#### 1.1 Connect via SSH:
```bash
ssh root@YOUR_VPS_IP
```

#### 1.2 Update System:
```bash
apt update && apt upgrade -y
```

#### 1.3 Install Node.js 20:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x
npm --version
```

#### 1.4 Install Git:
```bash
apt install -y git
```

#### 1.5 Install PM2 (Process Manager):
```bash
npm install -g pm2
pm2 --version
```

#### 1.6 Setup Firewall:
```bash
apt install -y ufw
ufw allow 22/tcp    # SSH
ufw allow 3000/tcp  # API (optional)
ufw enable
ufw status
```

---

### STEP 2: Deploy Bot (5 min)

#### 2.1 Clone Repository:
```bash
cd /root
git clone https://github.com/Timson100x/Solana-AI-Trading-Agent.git
cd Solana-AI-Trading-Agent
```

#### 2.2 Install Dependencies:
```bash
npm install
```

You should see:
```
added XXX packages
✅ @solana/web3.js@2.0.0
✅ @elizaos/plugin-solana@0.1.7-alpha.1
```

#### 2.3 Configure Environment:
```bash
nano .env
```

**IMPORTANT - PRODUCTION .env:**
```env
# === SOLANA CONFIGURATION ===
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
COMMITMENT_LEVEL=confirmed

# === WALLET (USE DEDICATED TRADING WALLET!) ===
WALLET_PRIVATE_KEY=YOUR_TRADING_WALLET_PRIVATE_KEY_BASE58

# === TELEGRAM ===
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# === GOOGLE AI ===
GOOGLE_AI_API_KEY=YOUR_GEMINI_API_KEY

# === TRADING SETTINGS - PRODUCTION! ===
TRADING_ENABLED=true
AUTO_WRAP_SOL=true
MIN_CONFIDENCE=80
MAX_TRADE_AMOUNT=0.1
KEEP_SOL_BALANCE=0.1
SLIPPAGE_BPS=150

# === RISK MANAGEMENT ===
STOP_LOSS_PERCENTAGE=15
TAKE_PROFIT_PERCENTAGE=30
MAX_DAILY_TRADES=20
MAX_POSITION_SIZE=0.2

# === MONITORING ===
ENABLE_HEALTH_CHECKS=true
ALERT_ON_ERROR=true

# === API (optional) ===
ENABLE_API=false
API_PORT=3000
```

**Save:** `CTRL+X` → `Y` → `ENTER`

#### 2.4 Validate Configuration:
```bash
node -e "
  require('dotenv').config();
  const required = ['RPC_ENDPOINT', 'WALLET_PRIVATE_KEY', 'TELEGRAM_BOT_TOKEN', 'GOOGLE_AI_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.log('❌ Missing:', missing.join(', '));
    process.exit(1);
  }
  console.log('✅ All required env vars set!');
"
```

---

### STEP 3: Start Bot with PM2 (2 min)

#### 3.1 Start Bot:
```bash
pm2 start index.js --name solana-trading-bot --time
```

#### 3.2 Check Status:
```bash
pm2 status
```

You should see:
```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ restart │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ solana-trading-bot   │ online  │ 0       │
└─────┴──────────────────────┴─────────┴─────────┘
```

#### 3.3 View Logs:
```bash
pm2 logs solana-trading-bot
```

You should see:
```
✅ Wallet V2 initialized
⚡ ElizaOS optimizations: ENABLED
✅ Jupiter V2 initialized
✅ Telegram connected
🚀 Trading Bot started!
```

#### 3.4 Enable Auto-Start on Reboot:
```bash
pm2 startup
pm2 save
```

---

### STEP 4: Monitoring (IMPORTANT!)

#### 4.1 Real-time Logs:
```bash
pm2 logs solana-trading-bot --lines 50
```

#### 4.2 Monitor Resources:
```bash
pm2 monit
```

#### 4.3 Check Health:
```bash
# Test in Telegram:
/health
/stats
```

#### 4.4 Set Up Alerts:
```bash
# PM2 will send Telegram alerts on crashes
# Already configured in bot!
```

---

## 🔒 SECURITY CHECKLIST

### CRITICAL SECURITY STEPS:

#### 1. Disable Root Login:
```bash
nano /etc/ssh/sshd_config

# Change:
PermitRootLogin no
PasswordAuthentication no

# Restart SSH:
systemctl restart sshd
```

#### 2. Create Non-Root User:
```bash
adduser trader
usermod -aG sudo trader
su - trader
```

#### 3. Setup SSH Keys:
```bash
# On your local machine:
ssh-keygen -t ed25519
ssh-copy-id trader@YOUR_VPS_IP
```

#### 4. Secure .env File:
```bash
chmod 600 .env
chown trader:trader .env
```

#### 5. Enable Fail2Ban:
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 MONITORING & MAINTENANCE

### Daily Checks:

#### Check Status:
```bash
pm2 status
```

#### Check Logs:
```bash
pm2 logs solana-trading-bot --lines 100
```

#### Check Performance:
```bash
# In Telegram:
/stats
/health
/wallet
```

### Weekly Maintenance:

#### Update System:
```bash
apt update && apt upgrade -y
```

#### Update Bot:
```bash
cd /root/Solana-AI-Trading-Agent
git pull
npm install
pm2 restart solana-trading-bot
```

#### Check Disk Space:
```bash
df -h
```

#### Rotate Logs:
```bash
pm2 flush
```

---

## 🚨 TROUBLESHOOTING

### Bot Won't Start:

```bash
# Check logs:
pm2 logs solana-trading-bot --err

# Common issues:
1. Missing env vars → Check .env
2. Node modules → rm -rf node_modules && npm install
3. Port in use → pm2 delete all && pm2 start index.js
```

### Bot Keeps Restarting:

```bash
# Check error logs:
pm2 logs solana-trading-bot --err --lines 50

# Common causes:
1. Invalid private key
2. RPC endpoint down
3. Out of memory → Upgrade VPS
4. Rate limiting → Check RPC limits
```

### Transactions Failing:

```bash
# In Telegram: /health

# Check:
1. Wallet balance (need > 0.1 SOL)
2. RPC status
3. Network congestion
4. Slippage settings
```

### High CPU/RAM Usage:

```bash
# Check:
pm2 monit

# If too high:
pm2 restart solana-trading-bot
```

---

## 🔄 UPDATES & UPGRADES

### Updating Bot:

```bash
# 1. Stop bot
pm2 stop solana-trading-bot

# 2. Backup
cp .env .env.backup
git stash

# 3. Pull updates
git pull origin main

# 4. Restore config
git stash pop
# or: cp .env.backup .env

# 5. Install dependencies
npm install

# 6. Restart
pm2 restart solana-trading-bot

# 7. Verify
pm2 logs solana-trading-bot
```

---

## 💰 TRADING SAFETY

### Start Small:

```env
# Week 1 Settings:
TRADING_ENABLED=true
MAX_TRADE_AMOUNT=0.05  # Start with 0.05 SOL
MIN_CONFIDENCE=85       # High confidence only
MAX_DAILY_TRADES=5      # Max 5 trades/day
```

### After 1 Week Success:

```env
# Increase gradually:
MAX_TRADE_AMOUNT=0.1
MIN_CONFIDENCE=80
MAX_DAILY_TRADES=10
```

### After 1 Month Success:

```env
# Full production:
MAX_TRADE_AMOUNT=0.2
MIN_CONFIDENCE=75
MAX_DAILY_TRADES=20
```

---

## 📈 PERFORMANCE OPTIMIZATION

### PM2 Cluster Mode (Advanced):

```bash
# Use multiple CPU cores:
pm2 start index.js --name solana-bot -i 2
```

### Memory Optimization:

```bash
# Set memory limit:
pm2 start index.js --name solana-bot --max-memory-restart 500M
```

### Log Rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🎯 PRODUCTION CHECKLIST

### Before Going Live:

```
✅ VPS secured (firewall, SSH keys)
✅ Bot tested in alert mode
✅ .env configured correctly
✅ PM2 auto-restart enabled
✅ Monitoring setup (Telegram)
✅ Backup wallet keys safely
✅ Start with small amounts
✅ Set stop-loss limits
✅ Monitor first 24h closely
✅ Have emergency stop plan
```

---

## 🆘 EMERGENCY PROCEDURES

### Stop Trading Immediately:

```bash
# Method 1: Telegram
/stop

# Method 2: SSH
pm2 stop solana-trading-bot

# Method 3: Disable trading
nano .env
# Set: TRADING_ENABLED=false
pm2 restart solana-trading-bot
```

### Withdraw Funds:

```bash
# Use Phantom/Solflare with your wallet key
# Or use Solana CLI:
solana transfer DESTINATION_ADDRESS ALL --allow-unfunded-recipient
```

---

## 📞 SUPPORT

### Issues?

1. Check logs: `pm2 logs solana-trading-bot --err`
2. Check health: `/health` in Telegram
3. Check .env configuration
4. Restart bot: `pm2 restart solana-trading-bot`

### Critical Issues:

```bash
# Stop immediately:
pm2 stop solana-trading-bot

# Check what went wrong:
pm2 logs solana-trading-bot --err --lines 200

# Fix issue, then restart:
pm2 restart solana-trading-bot
```

---

## 🎉 DEPLOYMENT COMPLETE!

### Your Bot is Now:

```
✅ Running 24/7 on VPS
✅ Auto-restarting on crashes
✅ ElizaOS V2 optimized
✅ Production-ready
✅ Monitored via Telegram
✅ Secured
```

### Next Steps:

1. Monitor first 24h closely
2. Check /stats every hour
3. Verify trades are profitable
4. Adjust settings as needed
5. Scale up after success

---

## 💎 PROFIT TIME!

**Your production trading bot is LIVE! 🚀🔥**

Monitor via Telegram and watch it trade! 💰
