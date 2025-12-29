# 🔔 Helius Webhook Setup - Quick Summary

## What Was Implemented

This update adds **real-time webhook support** via Helius API, providing instant transaction notifications instead of polling.

## Key Benefits

| Feature | Polling Mode | Webhook Mode |
|---------|-------------|--------------|
| **Response Time** | 30-60 seconds | 1-3 seconds |
| **RPC Costs** | High (60 calls/hour) | Low (0-5 calls/hour) |
| **Setup** | Simple | Requires public URL |
| **Production Ready** | Yes | Yes |
| **Scalability** | Limited (~15 wallets) | High (100+ wallets) |

## Quick Start

### 1. Current Setup (Default - Polling Mode)
Your bot works out of the box with **polling mode** - no changes needed!

### 2. Enable Webhooks (Optional - Better Performance)

Add to your `.env`:
```env
HELIUS_WEBHOOKS=true
HELIUS_API_KEY=your_helius_api_key
PUBLIC_URL=https://your-url.ngrok.io
```

### 3. Test Configuration
```bash
npm run test:webhooks
```

## Files Added/Modified

### New Files:
- `HELIUS-WEBHOOK-GUIDE.md` - Complete setup guide
- `scripts/test-webhooks.js` - Configuration test tool

### Modified Files:
- `.env.example` - Added webhook configuration variables
- `src/services/helius-webhooks.js` - Enhanced with full management API
- `index.js` - Added webhook initialization
- `README.md` - Added webhook features
- `QUICK-REFERENCE.md` - Added webhook quick start
- `scripts/test.js` - Added webhook validation

## Usage

### Check Webhook Status
```bash
# Via API
curl http://localhost:3000/stats | jq .webhooks

# Via Test Script
npm run test:webhooks
```

### Webhook Management (Programmatic)
```javascript
// List webhooks
const webhooks = await agent.helius.listWebhooks();

// Create webhook
await agent.helius.createWebhook(['wallet1', 'wallet2']);

// Update webhook
await agent.helius.updateWebhook(webhookId, updates);

// Delete webhook
await agent.helius.deleteWebhook(webhookId);
```

## When to Use Webhooks

**Use Polling (Default) If:**
- ✅ Testing or learning
- ✅ Running locally without public URL
- ✅ Monitoring < 10 wallets
- ✅ Don't want to setup ngrok/tunnel

**Use Webhooks If:**
- ✅ Production deployment
- ✅ Monitoring 10+ wallets
- ✅ Need instant notifications
- ✅ Want to minimize RPC costs
- ✅ Have public URL (VPS, ngrok, tunnel)

## Cost Comparison (Monthly)

**Polling Mode (10 wallets):**
- RPC Calls: ~432,000/month
- Free tier: Limited
- Paid tier: ~$9-19/month

**Webhook Mode (10 wallets):**
- RPC Calls: ~14,400/month (97% reduction!)
- Free tier: Sufficient
- Paid tier: Same price, 10x more wallets

## Migration Path

Already using the bot? Migrate anytime:

```bash
# 1. Add webhook config to .env
HELIUS_WEBHOOKS=true
PUBLIC_URL=https://your-ngrok-url.ngrok.io

# 2. Restart bot
npm start

# Bot automatically:
# - Detects webhook config
# - Creates webhook
# - Switches to webhook mode
# - Keeps polling as fallback
```

## Documentation

- **Quick Setup**: This file
- **Complete Guide**: `HELIUS-WEBHOOK-GUIDE.md`
- **Quick Reference**: `QUICK-REFERENCE.md`
- **Testing**: Run `npm run test:webhooks`

## Support

**Issues?**
1. Run `npm run test:webhooks` to diagnose
2. Check `HELIUS-WEBHOOK-GUIDE.md` troubleshooting section
3. Verify Helius dashboard for webhook status
4. Check bot logs for webhook activity

**Works without webhooks?** Yes! Polling mode is fully functional and requires no additional setup.

---

**Status**: ✅ Implemented & Tested  
**Version**: Added in v2.1.0  
**Backward Compatible**: Yes (webhooks are optional)  
**Ready for Production**: Yes
