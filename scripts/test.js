/**
 * System Validation Script - Test before go-live
 */

import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n🧪 SYSTEM VALIDATION TEST\n');
console.log('='+ '='.repeat(59));

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(message) {
  console.log(`${GREEN}✅ ${message}${RESET}`);
  passed++;
}

function fail(message) {
  console.log(`${RED}❌ ${message}${RESET}`);
  failed++;
}

function warn(message) {
  console.log(`${YELLOW}⚠️  ${message}${RESET}`);
  warnings++;
}

// Test 1: Environment Variables
console.log('\n📋 Testing Environment Variables...\n');

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== '') {
  pass('GEMINI_API_KEY is set');
} else {
  fail('GEMINI_API_KEY is missing');
}

if (process.env.HELIUS_API_KEY && process.env.HELIUS_API_KEY !== '') {
  pass('HELIUS_API_KEY is set');
} else {
  fail('HELIUS_API_KEY is missing');
}

// Test Webhook Configuration (if enabled)
if (process.env.HELIUS_WEBHOOKS === 'true') {
  console.log('\n🔔 Testing Webhook Configuration...\n');
  
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL !== '') {
    pass('PUBLIC_URL is set for webhooks');
    
    // Validate URL format
    try {
      const url = new URL(process.env.PUBLIC_URL);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        pass(`PUBLIC_URL format is valid: ${url.protocol}//${url.host}`);
      } else {
        fail('PUBLIC_URL must use http:// or https://');
      }
    } catch {
      fail('PUBLIC_URL is not a valid URL');
    }
  } else {
    fail('PUBLIC_URL is required when HELIUS_WEBHOOKS=true');
  }
  
  // Check webhook types
  const webhookTypes = process.env.HELIUS_WEBHOOK_TYPES || 'SWAP,TRANSFER';
  pass(`Webhook types configured: ${webhookTypes}`);
} else {
  warn('Webhooks disabled - using polling mode (slower)');
  warn('💡 Enable with: HELIUS_WEBHOOKS=true + PUBLIC_URL in .env');
}

if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== '') {
  pass('TELEGRAM_BOT_TOKEN is set');
} else {
  fail('TELEGRAM_BOT_TOKEN is missing');
}

if (process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_CHAT_ID !== '') {
  pass('TELEGRAM_CHAT_ID is set');
} else {
  fail('TELEGRAM_CHAT_ID is missing');
}

if (process.env.WALLET_PRIVATE_KEY && process.env.WALLET_PRIVATE_KEY !== '') {
  pass('WALLET_PRIVATE_KEY is set');

  try {
    const decoded = bs58.decode(process.env.WALLET_PRIVATE_KEY);
    if (decoded.length === 64) {
      pass('WALLET_PRIVATE_KEY format is valid (Base58, 64 bytes)');
    } else {
      fail(`WALLET_PRIVATE_KEY has wrong length: ${decoded.length} (expected 64)`);
    }
  } catch {
    fail('WALLET_PRIVATE_KEY is not valid Base58');
  }
} else {
  fail('WALLET_PRIVATE_KEY is missing');
}

// Test 2: Configuration Values
console.log('\n⚙️  Testing Configuration...\n');

const capital = parseFloat(process.env.TOTAL_CAPITAL_SOL || 0);
if (capital > 0 && capital <= 10) {
  pass(`TOTAL_CAPITAL_SOL: ${capital} SOL (reasonable)`);
} else if (capital > 10) {
  warn(`TOTAL_CAPITAL_SOL: ${capital} SOL (very high, risky!)`);
} else {
  fail('TOTAL_CAPITAL_SOL is not set or invalid');
}

const maxPos = parseFloat(process.env.MAX_POSITION_PERCENT || 0);
if (maxPos >= 20 && maxPos <= 60) {
  pass(`MAX_POSITION_PERCENT: ${maxPos}% (reasonable)`);
} else if (maxPos > 60) {
  warn(`MAX_POSITION_PERCENT: ${maxPos}% (risky!)`);
} else {
  fail('MAX_POSITION_PERCENT too low or invalid');
}

const stopLoss = parseFloat(process.env.STOP_LOSS_PERCENT || 0);
if (stopLoss >= 10 && stopLoss <= 25) {
  pass(`STOP_LOSS_PERCENT: ${stopLoss}% (reasonable)`);
} else {
  warn(`STOP_LOSS_PERCENT: ${stopLoss}% (check if intentional)`);
}

// Test 3: Solana Connection
console.log('\n⛓️  Testing Solana Connection...\n');

try {
  const connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
  const version = await connection.getVersion();
  pass(`Solana RPC connected (version: ${version['solana-core']})`);

  // Test wallet balance
  if (process.env.WALLET_PRIVATE_KEY) {
    try {
      const secretKey = bs58.decode(process.env.WALLET_PRIVATE_KEY);
      const keypair = { publicKey: PublicKey.createFromBytes(secretKey.slice(32)) };
      const balance = await connection.getBalance(keypair.publicKey);
      const solBalance = balance / 1e9;

      if (solBalance >= 0.1) {
        pass(`Wallet balance: ${solBalance.toFixed(4)} SOL (sufficient)`);
      } else {
        warn(`Wallet balance: ${solBalance.toFixed(4)} SOL (might be too low)`);
      }
    } catch (err) {
      fail(`Wallet check failed: ${err.message}`);
    }
  }
} catch (error) {
  fail(`Solana RPC connection failed: ${error.message}`);
}

// Test 4: API Keys
console.log('\n🔑 Testing API Keys...\n');

// Test Gemini
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent('Say "OK" if you can read this.');
    const response = await result.response;
    const text = response.text();

    if (text.includes('OK') || text.includes('ok')) {
      pass('Gemini API key is valid and working');
    } else {
      warn('Gemini API responded but output unexpected');
    }
  } catch (error) {
    fail(`Gemini API test failed: ${error.message}`);
  }
}

// Test Telegram
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    const me = await bot.getMe();
    pass(`Telegram bot is valid: @${me.username}`);
  } catch (error) {
    fail(`Telegram bot test failed: ${error.message}`);
  }
}

// Test 5: File Structure
console.log('\n📁 Testing File Structure...\n');

import { access } from 'fs/promises';

const requiredFiles = [
  'package.json',
  'index.js',
  '.env',
  'config/smart-wallets.json',
  'src/services/wallet.js',
  'src/services/jupiter.js',
  'src/services/telegram.js',
  'src/services/gemini.js',
  'src/utils/logger.js'
];

for (const file of requiredFiles) {
  try {
    await access(file);
    pass(`${file} exists`);
  } catch {
    fail(`${file} is missing`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 TEST SUMMARY\n');
console.log(`${GREEN}Passed: ${passed}${RESET}`);
console.log(`${RED}Failed: ${failed}${RESET}`);
console.log(`${YELLOW}Warnings: ${warnings}${RESET}`);

console.log('\n' + '='.repeat(60));

if (failed === 0 && warnings === 0) {
  console.log(`\n${GREEN}✅ ALL TESTS PASSED! System is ready to go!${RESET}\n`);
  process.exit(0);
} else if (failed === 0) {
  console.log(`\n${YELLOW}⚠️  Tests passed with warnings. Review before proceeding.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}❌ TESTS FAILED! Fix issues before running the agent.${RESET}\n`);
  process.exit(1);
}
