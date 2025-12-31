# 🔔 Helius Webhook Setup Guide

## Übersicht

Dieser Guide zeigt dir, wie du Helius Webhooks für **Echtzeit-Trading** mit automatischem Stop-Loss und Take-Profit einrichtest.

## 🎯 Features

- ✅ **Echtzeit Transaction Monitoring** - Keine API-Polls mehr nötig
- ✅ **Automatischer Stop-Loss** - Verluste automatisch begrenzen
- ✅ **Automatischer Take-Profit** - Gewinne sichern (auch partial)
- ✅ **Trailing Stop-Loss** - Gewinne laufen lassen
- ✅ **Emergency Stop** - Hard-Stop bei kritischen Verlusten
- ✅ **Telegram Benachrichtigungen** - Sofortige Updates
- ✅ **Balance Tracking** - Portfolio in Echtzeit

## 📋 Voraussetzungen

1. Helius Account mit API Key: [helius.dev](https://helius.dev)
2. VPS oder Server mit öffentlicher IP (für Webhook-Empfang)
3. Node.js 20+ installiert
4. Dein Solana Trading Wallet

## 🚀 Setup in 5 Schritten

### Schritt 1: Environment Variables

Füge diese zu deiner `.env` hinzu:

```bash
# Helius Webhook Config
WEBHOOK_PORT=3000
WEBHOOK_SECRET=dein_sehr_geheimer_webhook_schluessel_hier

# Existierende Variablen (solltest du schon haben)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=dein-api-key
WALLET_PRIVATE_KEY=dein_wallet_private_key
WALLET_PUBLIC_KEY=dein_wallet_public_key
```

**Webhook Secret generieren:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Schritt 2: Helius Dashboard Konfiguration

1. Gehe zu [Helius Dashboard → Webhooks](https://dashboard.helius.dev/webhooks)
2. Klicke auf **"Create Webhook"**
3. Konfiguriere:

#### Transaction Webhook (Haupt-Webhook)
```json
{
  "webhookURL": "https://deine-vps-ip:3000/webhook/helius",
  "webhookType": "enhanced",
  "transactionTypes": ["ANY"],
  "accountAddresses": ["DEINE_WALLET_PUBLIC_KEY_HIER"],
  "authHeader": "dein_webhook_secret_hier"
}
```

#### Optional: Account Updates Webhook
```json
{
  "webhookURL": "https://deine-vps-ip:3000/webhook/accounts",
  "webhookType": "accountWebhook",
  "accountAddresses": ["DEINE_WALLET_PUBLIC_KEY_HIER"],
  "authHeader": "dein_webhook_secret_hier"
}
```

### Schritt 3: Port freigeben (VPS/Firewall)

Wenn du einen VPS nutzt:

```bash
# UFW Firewall
sudo ufw allow 3000/tcp

# Oder direkt iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### Schritt 4: Webhook Server starten

**Option A: Standalone Webhook Server**
```bash
npm run webhook
```

**Option B: Mit kompletter Bot Integration**
```bash
node examples/webhook-trading-example.js
```

**Option C: In deinen bestehenden Bot integrieren**
```javascript
import { WebhookIntegration } from './src/integrations/webhook-integration.js';
import { WebhookRiskManager } from './src/trading/webhook-risk-manager.js';

// In deinem Bot
const riskManager = new WebhookRiskManager({
    connection: yourConnection,
    wallet: yourWallet,
    defaultStopLoss: -10,      // -10%
    defaultTakeProfit: 25,     // +25%
    trailingStopLoss: true,
    dryRun: false              // true für Tests
});

const webhooks = new WebhookIntegration(tradingBot, telegramBot);
await webhooks.start(3000);

// Events verbinden
webhooks.on('balance_updated', (data) => riskManager.handleBalanceUpdate(data));
webhooks.on('swap_detected', (data) => riskManager.handleSwapEvent(data));
```

### Schritt 5: Position nach Kauf registrieren

Nach jedem erfolgreichen Trade:

```javascript
// Nach Jupiter Swap
const swapResult = await jupiterSwap(...);

if (swapResult.success) {
    riskManager.registerPosition(
        tokenMintAddress,
        {
            entryPrice: swapResult.executionPrice,
            amount: swapResult.outputAmount,
            signature: swapResult.txid
        }
    );
}
```

## ⚙️ Konfiguration

### Risk Management Settings

```javascript
const config = {
    // Basis Settings
    defaultStopLoss: -10,        // -10% Stop Loss
    defaultTakeProfit: 25,       // +25% Take Profit
    emergencyStopLoss: -20,      // -20% Hard Stop
    
    // Trailing Stop
    trailingStopLoss: true,      // Aktivieren
    trailingStopDistance: 5,     // 5% unter Höchststand
    
    // Partial Take Profits
    partialTakeProfitLevels: [
        { percent: 15, sellAmount: 0.3 },  // Bei +15%: 30% verkaufen
        { percent: 25, sellAmount: 0.5 },  // Bei +25%: 50% verkaufen  
        { percent: 50, sellAmount: 1.0 }   // Bei +50%: Rest verkaufen
    ],
    
    // Sicherheit
    maxSlippage: 5,              // 5% max Slippage
    dryRun: true                 // Erst testen!
};
```

### Beispiel-Szenarien

#### Szenario 1: Klassischer Stop-Loss/Take-Profit
```javascript
// Kauf bei $0.001
riskManager.registerPosition(mint, {
    entryPrice: 0.001,
    amount: 10000
});

// Automatisch:
// Stop Loss bei $0.0009 (-10%)
// Take Profit bei $0.00125 (+25%)
```

#### Szenario 2: Trailing Stop
```javascript
// Token steigt von $0.001 auf $0.002 (+100%)
// Trailing Stop passt sich an: $0.0019 (5% unter Peak)

// Wenn Preis auf $0.0019 fällt:
// ✅ Automatischer Verkauf mit +90% Gewinn
```

#### Szenario 3: Partial Take Profits
```javascript
// Bei +15%: Verkaufe 30% → Sichere ersten Gewinn
// Bei +25%: Verkaufe 50% → Sichere Hauptgewinn
// Bei +50%: Verkaufe Rest → Maximaler Profit
```

## 🧪 Testing

### 1. Webhook Server testen
```bash
curl -X POST http://localhost:3000/health
```

### 2. Mock Webhook senden
```javascript
import { HeliusWebhooks } from './src/services/helius-webhooks.js';

const webhooks = new HeliusWebhooks();
await webhooks.startServer(3000);
await webhooks.testWebhook();
```

### 3. Dry Run Mode
```javascript
// In config setzen:
dryRun: true

// Führt alle Checks aus, aber verkauft nicht wirklich
// Logs zeigen: "🧪 DRY RUN - Would sell..."
```

## 📊 Monitoring

### Webhook Stats anzeigen
```bash
curl http://localhost:3000/webhook/stats
```

### Response:
```json
{
  "received": 156,
  "processed": 154,
  "errors": 2,
  "lastEvent": "2025-12-31T12:30:00.000Z"
}
```

### Risk Manager Stats
```javascript
const stats = riskManager.getStats();
console.log(stats);

// Output:
{
  "stopLossTriggered": 3,
  "takeProfitTriggered": 7,
  "trailingStopTriggered": 2,
  "emergencyStopTriggered": 0,
  "totalProfit": 145.67,
  "activePositions": 2,
  "totalPositions": 12
}
```

## 🔒 Sicherheit

### 1. Webhook Signature Verification
Jeder Webhook wird mit HMAC-SHA256 verifiziert:
```javascript
const signature = req.headers['x-helius-signature'];
const payload = JSON.stringify(req.body);
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
const digest = hmac.update(payload).digest('hex');

if (signature !== digest) {
    throw new Error('Invalid signature');
}
```

### 2. IP Whitelist (Optional)
```javascript
const ALLOWED_IPS = ['helius-webhook-ip'];

app.use((req, res, next) => {
    if (!ALLOWED_IPS.includes(req.ip)) {
        return res.status(403).send('Forbidden');
    }
    next();
});
```

### 3. Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 Minute
    max: 100                   // Max 100 requests
});

app.use('/webhook', limiter);
```

## 🐛 Troubleshooting

### Problem: Webhooks kommen nicht an

**Lösung 1: Port prüfen**
```bash
netstat -tulpn | grep 3000
```

**Lösung 2: Firewall prüfen**
```bash
sudo ufw status
```

**Lösung 3: Public IP testen**
```bash
curl http://deine-vps-ip:3000/health
```

### Problem: Signature Verification Failed

**Lösung:** Webhook Secret muss exakt übereinstimmen
```bash
# In .env
WEBHOOK_SECRET=abc123...

# In Helius Dashboard
authHeader: "abc123..."
```

### Problem: Position wird nicht getrackt

**Lösung:** Position nach Kauf registrieren
```javascript
// WICHTIG: Nach jedem Trade
riskManager.registerPosition(mint, entryData);
```

## 📈 Performance

### Latenzen
- Webhook Empfang: < 100ms
- Event Processing: < 50ms
- Trigger Check: < 10ms
- **Total:** < 200ms vom Blockchain-Event bis zur Reaktion

vs. Polling: 1-5 Sekunden Verzögerung

### API Calls sparen
Ohne Webhooks:
- 1 Position Check alle 5 Sekunden = 720 API Calls/Stunde
- 10 Positionen = 7,200 API Calls/Stunde

Mit Webhooks:
- 0 Polling API Calls
- Nur Events = ~10-50 API Calls/Stunde

**Ersparnis: 99%+ weniger API Calls**

## 🎓 Best Practices

1. **Immer im Dry Run testen** bevor du live gehst
2. **Emergency Stop setzen** als Fail-Safe
3. **Partial Take Profits** nutzen für besseres Risk/Reward
4. **Trailing Stop** aktivieren für Moonshots
5. **Telegram Alerts** einrichten für Monitoring
6. **Regelmäßige Backups** der Position-Daten
7. **Logs monitoren** für Anomalien

## 🔗 Links

- [Helius Docs](https://docs.helius.dev/webhooks-and-websockets/webhooks)
- [Helius Dashboard](https://dashboard.helius.dev)
- [GitHub Issues](https://github.com/Timson100x/Solana-AI-Trading-Agent/issues)

## 💡 Erweiterte Features (Coming Soon)

- [ ] Multi-Wallet Support
- [ ] Advanced Position Analytics
- [ ] ML-basierte Stop-Loss Anpassung
- [ ] Portfolio Rebalancing
- [ ] Cross-DEX Arbitrage Detection
- [ ] Gas Price Optimization

## 📝 Lizenz

MIT - siehe LICENSE

---

**Happy Trading! 🚀**

Bei Fragen: [GitHub Issues](https://github.com/Timson100x/Solana-AI-Trading-Agent/issues)
