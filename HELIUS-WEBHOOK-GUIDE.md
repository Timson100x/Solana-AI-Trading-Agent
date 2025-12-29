# 🔔 Helius Webhook Configuration Guide

## Overview

Helius webhooks enable **real-time transaction monitoring** without polling. Instead of checking wallets every minute, Helius pushes notifications instantly when transactions occur.

### Benefits
- ⚡ **Instant Notifications** - React to trades within seconds
- 💰 **Reduced RPC Costs** - No constant polling needed
- 🎯 **Better Performance** - Lower latency, faster execution
- 📊 **Scalable** - Monitor unlimited wallets efficiently

---

## Prerequisites

1. **Helius API Key**
   - Sign up at [https://dashboard.helius.dev](https://dashboard.helius.dev)
   - Free tier available with generous limits
   - Get your API key from the dashboard

2. **Public URL**
   - Your bot needs to be accessible from the internet
   - Options:
     - **ngrok** (easiest for local dev)
     - **Cloudflare Tunnel** (free alternative)
     - **VPS with public IP** (production)

---

## Quick Setup

### 1. Configure Environment Variables

Add to your `.env` file:

```env
# === HELIUS WEBHOOKS ===
HELIUS_WEBHOOKS=true
HELIUS_API_KEY=your_helius_api_key_here
PUBLIC_URL=https://your-public-url.ngrok.io

# Optional: Specify transaction types to monitor
HELIUS_WEBHOOK_TYPES=SWAP,TRANSFER

# Optional: Webhook authentication
WEBHOOK_AUTH_TOKEN=your-secret-token
```

### 2. Make Your Bot Publicly Accessible

#### Option A: Using ngrok (Recommended for Development)

```bash
# Install ngrok
npm install -g ngrok

# Start your bot first
npm start

# In another terminal, expose port 3000
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Add it to .env as PUBLIC_URL
```

#### Option B: Using Cloudflare Tunnel

```bash
# Install cloudflared
# Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Start tunnel
cloudflared tunnel --url http://localhost:3000

# Copy the public URL to .env
```

#### Option C: VPS with Public IP

```bash
# If running on VPS, use your public IP or domain
PUBLIC_URL=https://your-domain.com
# or
PUBLIC_URL=http://your-ip-address:3000
```

### 3. Start the Bot

```bash
npm start
```

The bot will automatically:
1. ✅ Create webhook endpoint at `/webhooks/helius`
2. ✅ Register webhook with Helius API
3. ✅ Start monitoring your tracked wallets

---

## Configuration Options

### Transaction Types

Specify which transaction types to monitor:

```env
# Monitor only swaps and transfers (default)
HELIUS_WEBHOOK_TYPES=SWAP,TRANSFER

# Monitor all transaction types
HELIUS_WEBHOOK_TYPES=SWAP,TRANSFER,NFT_SALE,NFT_MINT

# Available types:
# - SWAP: DEX trades (Jupiter, Raydium, etc.)
# - TRANSFER: Token transfers
# - NFT_SALE: NFT marketplace sales
# - NFT_MINT: NFT minting
# - NFT_AUCTION: NFT auctions
# - NFT_LISTING: NFT listings
```

### Webhook Authentication (Optional)

Add security to your webhook endpoint:

```env
WEBHOOK_AUTH_TOKEN=your-super-secret-token-here
```

Then configure Helius to send this token in headers.

---

## Usage

### Automatic Management

The bot automatically manages webhooks:

- **On Startup**: Creates or reuses existing webhook
- **Wallet Changes**: Updates webhook when you add/remove wallets
- **On Shutdown**: Webhook remains active (clean up manually if needed)

### Manual Management via Code

```javascript
// List all webhooks
const webhooks = await agent.helius.listWebhooks();
console.log(webhooks);

// Get specific webhook details
const details = await agent.helius.getWebhook('webhook-id');

// Update webhook (e.g., add more wallets)
await agent.helius.updateWebhook('webhook-id', {
  accountAddresses: ['wallet1', 'wallet2', 'wallet3']
});

// Delete webhook
await agent.helius.deleteWebhook('webhook-id');

// Check webhook status
const status = agent.helius.getStatus();
console.log(status);
```

### Check Webhook Status

Access `http://localhost:3000/stats` to see webhook status:

```json
{
  "webhooks": {
    "enabled": true,
    "configured": true,
    "webhookId": "abc-123-def",
    "webhookUrl": "https://your-url.ngrok.io/webhooks/helius",
    "transactionTypes": ["SWAP", "TRANSFER"]
  }
}
```

---

## Webhook Flow

1. **Transaction Occurs**
   - Smart trader executes a swap on Jupiter
   
2. **Helius Detects**
   - Helius monitoring detects the transaction
   
3. **Webhook Fired**
   - Helius sends POST request to your bot
   
4. **Bot Processes**
   - Your bot receives transaction data
   - Checks if wallet is tracked
   - Analyzes with AI
   - Executes trade if confidence is high

5. **Response**
   - Bot responds with 200 OK
   - Helius marks delivery as successful

---

## Troubleshooting

### Webhook Not Receiving Data

1. **Check PUBLIC_URL is correct**
   ```bash
   # Test your webhook endpoint manually
   curl https://your-url.ngrok.io/webhooks/helius
   ```

2. **Verify ngrok/tunnel is running**
   ```bash
   # Should show active tunnel
   curl http://localhost:4040/api/tunnels
   ```

3. **Check Helius dashboard**
   - Visit [https://dashboard.helius.dev](https://dashboard.helius.dev)
   - View webhook logs
   - Check delivery attempts

### Webhook Creation Failed

1. **Verify API key**
   ```bash
   # Test API key
   curl "https://api.helius.xyz/v0/webhooks?api-key=YOUR_KEY"
   ```

2. **Check webhook limit**
   - Free tier: Limited webhooks
   - Upgrade plan if needed

3. **Validate URL format**
   - Must be `https://` (http allowed for testing)
   - Must be publicly accessible
   - No localhost URLs

### Bot Not Processing Webhooks

1. **Check logs**
   ```bash
   npm start
   # Watch for: "📨 Webhook received"
   ```

2. **Test webhook manually**
   ```bash
   curl -X POST https://your-url.ngrok.io/webhooks/helius \
     -H "Content-Type: application/json" \
     -d '[{"signature":"test"}]'
   ```

3. **Verify wallet tracking**
   - Ensure wallets are in `config/smart-wallets.json`
   - Check wallet addresses match exactly

---

## Webhook vs Polling

### Polling Mode (Default)
```env
HELIUS_WEBHOOKS=false
```

- ✅ Simple setup
- ✅ Works without public URL
- ❌ 30-60 second delay
- ❌ More RPC calls
- ❌ Higher costs at scale

### Webhook Mode (Recommended)
```env
HELIUS_WEBHOOKS=true
```

- ✅ Instant notifications (1-3 sec delay)
- ✅ Lower RPC usage
- ✅ Better for production
- ❌ Requires public URL
- ❌ Slightly more complex setup

---

## Production Deployment

### 1. VPS Setup

```bash
# On your VPS
cd /var/www/solana-trading-bot

# Configure .env with your domain/IP
nano .env
```

```env
PUBLIC_URL=https://yourdomain.com
HELIUS_WEBHOOKS=true
HELIUS_API_KEY=your_key
```

### 2. Use Process Manager

```bash
# Install PM2
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name trading-bot

# Enable auto-restart
pm2 startup
pm2 save
```

### 3. SSL Certificate (if using domain)

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure nginx reverse proxy (optional)
```

### 4. Monitor Webhook Health

- Set up monitoring alerts
- Check Helius dashboard regularly
- Log webhook delivery failures
- Implement retry logic

---

## Advanced Configuration

### Custom Webhook Handler

Extend the webhook handler in `src/services/helius-webhooks.js`:

```javascript
async handleTransaction(tx) {
  // Add custom logic before standard handling
  logger.info(`Custom processing for ${tx.signature}`);
  
  // Filter by transaction type
  if (tx.type === 'SWAP') {
    // Handle swap transactions
  }
  
  // Call parent handler
  await super.handleTransaction(tx);
  
  // Add custom logic after
  await this.sendCustomAlert(tx);
}
```

### Multiple Webhooks

Create separate webhooks for different purposes:

```javascript
// Trading signals webhook
await helius.createWebhook(tradingWallets, {
  transactionTypes: ['SWAP']
});

// Portfolio monitoring webhook
await helius.createWebhook(portfolioWallets, {
  transactionTypes: ['TRANSFER']
});
```

### Webhook Filtering

Add server-side filtering:

```javascript
async handleTransaction(tx) {
  // Ignore small transactions
  if (tx.amount < 0.1) return;
  
  // Only process during trading hours
  const hour = new Date().getHours();
  if (hour < 9 || hour > 17) return;
  
  // Continue processing
  await this.processTransaction(tx);
}
```

---

## API Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HELIUS_WEBHOOKS` | No | `false` | Enable webhook mode |
| `HELIUS_API_KEY` | Yes* | - | Helius API key |
| `PUBLIC_URL` | Yes* | - | Public webhook URL |
| `HELIUS_WEBHOOK_TYPES` | No | `SWAP,TRANSFER` | Transaction types |
| `WEBHOOK_AUTH_TOKEN` | No | - | Webhook auth token |

*Required only when `HELIUS_WEBHOOKS=true`

### Webhook Endpoint

**POST** `/webhooks/helius`

Request body:
```json
[
  {
    "signature": "tx_signature",
    "type": "SWAP",
    "timestamp": 1234567890,
    "accountData": [
      {
        "account": "wallet_address",
        "nativeBalanceChange": -100000000
      }
    ]
  }
]
```

Response:
```json
{
  "status": "ok",
  "processed": 1
}
```

---

## Security Best Practices

1. **Use HTTPS**
   - Always use HTTPS in production
   - Use SSL certificates for custom domains

2. **Implement Authentication**
   - Set `WEBHOOK_AUTH_TOKEN`
   - Verify token in webhook handler

3. **Rate Limiting**
   - Implement rate limits on webhook endpoint
   - Prevent abuse/DDOS

4. **Validate Payloads**
   - Verify webhook data structure
   - Sanitize inputs

5. **Monitor Access**
   - Log all webhook requests
   - Alert on suspicious activity

---

## Cost Analysis

### Polling Mode
- ~60 RPC calls per hour per wallet
- Free tier: ~15 wallets max
- Paid tier: $9/mo for 300+ wallets

### Webhook Mode
- ~0-5 RPC calls per hour per wallet
- Free tier: ~100+ wallets
- Paid tier: Same cost, 10x more wallets

**Savings**: ~50-90% reduction in RPC costs

---

## Support & Resources

- **Helius Docs**: https://docs.helius.dev/webhooks-and-websockets/webhooks
- **Helius Dashboard**: https://dashboard.helius.dev
- **Discord Support**: https://discord.gg/helius
- **API Status**: https://status.helius.dev

---

## Example: Complete Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure .env
cat > .env << EOF
HELIUS_WEBHOOKS=true
HELIUS_API_KEY=your_key_from_dashboard
HELIUS_WEBHOOK_TYPES=SWAP,TRANSFER
PUBLIC_URL=https://abc123.ngrok.io
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_id
GOOGLE_AI_API_KEY=your_gemini_key
WALLET_PRIVATE_KEY=your_key
TRADING_ENABLED=false
EOF

# 3. Start ngrok in background
ngrok http 3000 &

# 4. Update PUBLIC_URL with ngrok URL
# (Get URL from: curl http://localhost:4040/api/tunnels)

# 5. Start bot
npm start

# 6. Check webhook status
curl http://localhost:3000/stats | jq .webhooks

# 7. Monitor logs for webhook activity
# Should see: "📨 Webhook received" when transactions occur
```

---

## Migration from Polling

Already using polling mode? Easy migration:

```bash
# 1. Setup public URL (ngrok)
ngrok http 3000

# 2. Update .env
HELIUS_WEBHOOKS=true
PUBLIC_URL=https://your-ngrok-url.ngrok.io

# 3. Restart bot
npm start

# That's it! Bot now uses webhooks instead of polling
```

The bot will automatically handle the transition.

---

## Testing

Test webhook setup without real transactions:

```bash
# 1. Start bot
npm start

# 2. Send test webhook
curl -X POST http://localhost:3000/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '[{
    "signature": "test123",
    "type": "SWAP",
    "accountData": [{
      "account": "your_wallet_address"
    }]
  }]'

# 3. Check logs for processing confirmation
# Should see: "📨 Webhook received: 1 transaction(s)"
```

---

## Summary

**Webhooks provide:**
- ⚡ Instant notifications (1-3 seconds)
- 💰 90% lower RPC costs
- 🎯 Better trading execution
- 📈 Scalable to 100+ wallets

**Setup time:** 5-10 minutes

**Recommended for:** Production deployments, serious traders

**Start now:** Add `HELIUS_WEBHOOKS=true` to `.env` and follow the guide!

---

**Need Help?** Open an issue or check the [Helius Discord](https://discord.gg/helius)
