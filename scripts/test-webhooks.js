#!/usr/bin/env node
/**
 * Test Helius Webhook Configuration
 * Run this to validate webhook setup
 */

import 'dotenv/config';
import { HeliusWebhooks } from '../src/services/helius-webhooks.js';
import express from 'express';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🔔 HELIUS WEBHOOK CONFIGURATION TEST${RESET}\n`);
console.log('='.repeat(60));

// Mock agent for testing
const mockAgent = {
  async loadWallets() {
    return [
      { address: 'test-wallet-1' },
      { address: 'test-wallet-2' }
    ];
  }
};

const app = express();

// Test 1: Configuration Check
console.log(`\n${BLUE}1. Configuration Check${RESET}\n`);

const webhookService = new HeliusWebhooks(mockAgent);
const status = webhookService.getStatus();

console.log(`Enabled: ${status.enabled ? `${GREEN}✅ Yes${RESET}` : `${YELLOW}⚠️ No (polling mode)${RESET}`}`);
console.log(`API Key: ${status.configured && webhookService.apiKey ? `${GREEN}✅ Set${RESET}` : `${RED}❌ Missing${RESET}`}`);
console.log(`Public URL: ${status.configured && webhookService.publicUrl ? `${GREEN}✅ ${webhookService.publicUrl}${RESET}` : `${RED}❌ Missing${RESET}`}`);
console.log(`Transaction Types: ${YELLOW}${status.transactionTypes.join(', ')}${RESET}`);

// Test 2: Endpoint Setup
console.log(`\n${BLUE}2. Endpoint Setup${RESET}\n`);

try {
  webhookService.setup(app);
  console.log(`${GREEN}✅ Webhook endpoint configured successfully${RESET}`);
} catch (error) {
  console.log(`${RED}❌ Endpoint setup failed: ${error.message}${RESET}`);
}

// Test 3: List Existing Webhooks (if API key provided)
if (webhookService.apiKey && webhookService.apiKey !== 'your_helius_api_key_here') {
  console.log(`\n${BLUE}3. API Connection Test${RESET}\n`);
  
  try {
    const webhooks = await webhookService.listWebhooks();
    console.log(`${GREEN}✅ Connected to Helius API${RESET}`);
    console.log(`${YELLOW}Found ${webhooks.length} existing webhook(s)${RESET}`);
    
    if (webhooks.length > 0) {
      console.log('\nExisting webhooks:');
      webhooks.forEach((wh, i) => {
        console.log(`  ${i + 1}. ID: ${wh.webhookID}`);
        console.log(`     URL: ${wh.webhookURL}`);
        console.log(`     Addresses: ${wh.accountAddresses?.length || 0}`);
      });
    }
  } catch (error) {
    console.log(`${RED}❌ API connection failed: ${error.message}${RESET}`);
  }
} else {
  console.log(`\n${BLUE}3. API Connection Test${RESET}\n`);
  console.log(`${YELLOW}⏭️ Skipped (API key not configured)${RESET}`);
}

// Test 4: Test Webhook Endpoint
console.log(`\n${BLUE}4. Webhook Endpoint Test${RESET}\n`);

const PORT = 3456; // Use different port for testing
const server = app.listen(PORT, async () => {
  console.log(`${GREEN}✅ Test server started on port ${PORT}${RESET}`);
  
  // Send test request
  try {
    const testPayload = [{
      signature: 'test-signature-123',
      type: 'SWAP',
      accountData: [{
        account: 'test-wallet-1',
        nativeBalanceChange: -100000000
      }]
    }];
    
    const response = await fetch(`http://localhost:${PORT}/webhooks/helius`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`${GREEN}✅ Webhook endpoint responds correctly${RESET}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Processed: ${data.processed || 0} transaction(s)`);
    } else {
      console.log(`${RED}❌ Webhook endpoint returned error: ${response.status}${RESET}`);
    }
  } catch (error) {
    console.log(`${RED}❌ Failed to test endpoint: ${error.message}${RESET}`);
  }
  
  server.close();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n${BLUE}📊 SUMMARY${RESET}\n`);
  
  if (status.enabled && status.configured) {
    console.log(`${GREEN}✅ Webhook system is configured and ready!${RESET}\n`);
    console.log('Next steps:');
    console.log('1. Start your bot: npm start');
    console.log('2. Ensure ngrok/tunnel is running');
    console.log('3. Monitor logs for webhook activity');
    console.log(`4. Check ${YELLOW}http://localhost:3000/stats${RESET} for webhook status`);
  } else if (!status.enabled) {
    console.log(`${YELLOW}⚠️ Webhooks are disabled (using polling mode)${RESET}\n`);
    console.log('To enable webhooks:');
    console.log('1. Set HELIUS_WEBHOOKS=true in .env');
    console.log('2. Set PUBLIC_URL (your ngrok/tunnel URL)');
    console.log('3. Restart the bot');
    console.log(`4. See ${YELLOW}HELIUS-WEBHOOK-GUIDE.md${RESET} for full instructions`);
  } else {
    console.log(`${RED}❌ Webhook configuration incomplete${RESET}\n`);
    if (!webhookService.apiKey || webhookService.apiKey === 'your_helius_api_key_here') {
      console.log('Missing: HELIUS_API_KEY');
    }
    if (!webhookService.publicUrl) {
      console.log('Missing: PUBLIC_URL');
    }
    console.log(`\nSee ${YELLOW}HELIUS-WEBHOOK-GUIDE.md${RESET} for setup instructions`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
});
