# 🌐 WEB DASHBOARD GUIDE

## 🎯 Quick Access

### URL:
```
http://localhost:3000
```

### Or from VPS:
```
http://YOUR_VPS_IP:3000
```

---

## 🚀 FEATURES

### Real-Time Monitoring
- ✅ Live wallet balance
- ✅ Trading statistics
- ✅ Success rate tracking
- ✅ System health
- ✅ Jupiter V2 performance
- ✅ Recent trades table
- ✅ AI performance metrics

### Auto-Refresh
- 📊 Updates every 10 seconds
- 🔄 Manual refresh button
- ⚡ Real-time status badge

### Professional UI
- 💎 Modern gradient design
- 📱 Mobile responsive
- 🎨 Color-coded stats
- ✨ Smooth animations

---

## ⚙️ CONFIGURATION

### 1. Enable in .env:
```env
ENABLE_WEB_DASHBOARD=true
WEB_PORT=3000
```

### 2. Start Bot:
```bash
npm start
```

You'll see:
```
🌐 Web Dashboard: http://localhost:3000
📊 API: http://localhost:3000/api/stats
```

### 3. Open Browser:
```
http://localhost:3000
```

---

## 🖥️ VPS ACCESS

### Enable External Access:

#### 1. Open Firewall Port:
```bash
ufw allow 3000/tcp
ufw reload
```

#### 2. Access from Anywhere:
```
http://YOUR_VPS_IP:3000
```

### Security (Recommended):

#### Use SSH Tunnel Instead:
```bash
# On your local machine:
ssh -L 3000:localhost:3000 root@YOUR_VPS_IP

# Then access:
http://localhost:3000
```

This keeps dashboard private!

---

## 📊 DASHBOARD SECTIONS

### 1. Header
- Bot status (Online/Offline)
- Version info
- Refresh button

### 2. Stats Grid

#### Wallet Card:
```
- SOL Balance (real-time)
- Wallet Address
```

#### Trading Card:
```
- Success Rate
- Total Trades
- Successful Trades
- Failed Trades
```

#### System Card:
```
- Uptime
- Version (ElizaOS V2)
- Memory Usage
```

#### Jupiter V2 Card:
```
- Success Rate
- Total Swaps
- Average Execution Time
```

### 3. Configuration
```
- Trading Enabled/Disabled
- Min Confidence
- Max Trade Amount
- Slippage Settings
```

### 4. Performance
```
- Average Profit
- Total Signals
- AI Requests
- AI Response Time
```

### 5. Recent Trades Table
```
- Last 10 trades
- Time, Token, Type
- Amount, Price
- Profit/Loss
- Status
```

---

## 🔌 API ENDPOINTS

### Available APIs:

#### Health Check:
```
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": 1234567890,
  "uptime": 3600,
  "version": "2.1.0"
}
```

#### System Stats:
```
GET /api/stats

Response:
{
  "system": { uptime, memory, version },
  "trading": { totalTrades, success, failed },
  "jupiter": { successRate, swaps, avgTime },
  "wallet": { publicKey, balance },
  "ai": { requests, avgResponseTime },
  "performance": { successRate, avgProfit }
}
```

#### Recent Trades:
```
GET /api/trades

Response:
{
  "total": 50,
  "trades": [...]
}
```

#### Active Positions:
```
GET /api/positions

Response:
{
  "total": 5,
  "positions": [...]
}
```

#### Configuration:
```
GET /api/config

Response:
{
  "tradingEnabled": true,
  "minConfidence": 75,
  "maxTradeAmount": 0.1,
  ...
}
```

---

## 🎨 CUSTOMIZATION

### Change Port:

In .env:
```env
WEB_PORT=8080
```

Restart bot to apply.

### Disable Dashboard:

In .env:
```env
ENABLE_WEB_DASHBOARD=false
```

---

## 🔒 SECURITY

### Production Recommendations:

#### 1. Use SSH Tunnel (Best):
```bash
ssh -L 3000:localhost:3000 user@vps
```
Dashboard only accessible through tunnel.

#### 2. Use Reverse Proxy (Advanced):
```nginx
# Nginx config
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Add Authentication (Advanced):
Coming in future update!

### Current Security:

⚠️ Dashboard has NO authentication currently!

**Recommendations:**
- Don't expose to public internet
- Use SSH tunnel
- Or use firewall to restrict access
- Or disable if not needed

---

## 📱 MOBILE ACCESS

Dashboard is fully responsive!

### Access from Phone:
```
http://YOUR_VPS_IP:3000
```

(Make sure port is open and secure)

---

## 🚨 TROUBLESHOOTING

### Dashboard Not Loading:

#### 1. Check Bot Running:
```bash
pm2 status
pm2 logs solana-trading-bot
```

#### 2. Check Port:
```bash
netstat -tuln | grep 3000
```

#### 3. Check Firewall:
```bash
ufw status
```

#### 4. Check .env:
```env
ENABLE_WEB_DASHBOARD=true
WEB_PORT=3000
```

### Port Already in Use:

Bot will auto-increment to 3001, 3002, etc.

Check logs:
```bash
pm2 logs
```

Look for: "Web Dashboard: http://localhost:XXXX"

### Stats Not Updating:

- Check bot is running
- Check /api/stats endpoint
- Check browser console (F12)
- Try manual refresh

---

## 💡 TIPS

### Monitor Multiple Instances:

Run multiple bots on different ports:
```
Bot 1: http://localhost:3000
Bot 2: http://localhost:3001
Bot 3: http://localhost:3002
```

### Bookmark Important Pages:
```
Main Dashboard: http://vps:3000
API Stats: http://vps:3000/api/stats
Trades: http://vps:3000/api/trades
```

### Use Second Monitor:

Keep dashboard open on second monitor while trading!

---

## 🎯 BEST PRACTICES

### During Active Trading:

1. ✅ Keep dashboard open
2. ✅ Monitor success rate
3. ✅ Watch for errors
4. ✅ Check balance regularly
5. ✅ Review recent trades

### Performance Monitoring:

Watch these metrics:
- Success Rate (target: >70%)
- Avg Profit (target: >5%)
- System Uptime (target: 99%+)
- Jupiter Success (target: >85%)
- AI Response Time (target: <2s)

---

## 📊 INTERPRETING STATS

### Success Rate:
```
>80%: Excellent! ✅
70-80%: Good! 👍
60-70%: Acceptable ⚠️
<60%: Needs optimization ❌
```

### Avg Profit:
```
>10%: Excellent! 💎
5-10%: Good! 💰
2-5%: Okay ⚠️
<2%: Too low ❌
```

### System Health:
```
Online + Green: All good! ✅
Offline + Red: Check bot! ❌
High memory: Consider restart ⚠️
```

---

## 🔮 COMING SOON

### Planned Features:
- 🔐 Authentication system
- 📊 Advanced charts
- 📈 Profit/Loss graphs
- 🔔 Browser notifications
- 💾 Export trades to CSV
- 📱 Mobile app
- 🌙 Dark mode
- ⚙️ Live config editing

---

## 🎉 ENJOY YOUR DASHBOARD!

**Your trading bot now has a professional web interface! 🌐💎**

Monitor trades, track performance, and make data-driven decisions!

**Access:** http://localhost:3000 or http://YOUR_VPS_IP:3000

**Docs:** WEB-DASHBOARD-GUIDE.md (this file)

**Support:** Check main README.md

---

**🚀 HAPPY MONITORING! 📊💰**
