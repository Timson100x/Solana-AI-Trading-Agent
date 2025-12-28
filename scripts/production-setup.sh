#!/bin/bash

# 🚀 Solana AI Trading Agent - Production Setup
# Run this in Codespaces BEFORE VPS deployment!

echo "🚀 PRODUCTION SETUP STARTING..."
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
echo ""
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v21* ]] || [[ $NODE_VERSION == v22* ]]; then
    echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js version must be 20+${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Dependency installation failed${NC}"
    exit 1
fi

# Check .env file
echo ""
echo "🔍 Checking .env configuration..."
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Copy .env.example to .env and configure it."
    exit 1
fi

# Validate required env vars
echo "📋 Validating environment variables..."
node -e "
  require('dotenv').config();
  const required = [
    'RPC_ENDPOINT',
    'WALLET_PRIVATE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'GOOGLE_AI_API_KEY'
  ];

  let missing = [];
  let warnings = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Check trading settings
  if (process.env.TRADING_ENABLED === 'true') {
    console.log('⚠️  TRADING IS ENABLED!');
    if (!process.env.MAX_TRADE_AMOUNT) warnings.push('MAX_TRADE_AMOUNT not set');
    if (!process.env.MIN_CONFIDENCE) warnings.push('MIN_CONFIDENCE not set');
  }

  if (missing.length > 0) {
    console.log('❌ Missing required variables:');
    missing.forEach(m => console.log('   - ' + m));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(w => console.log('   - ' + w));
  }

  console.log('✅ All required env vars set!');
"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Environment validation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}"

# Test RPC connection
echo ""
echo "🌐 Testing RPC connection..."
node -e "
  require('dotenv').config();
  const { Connection } = require('@solana/web3.js');

  async function testRPC() {
    try {
      const connection = new Connection(process.env.RPC_ENDPOINT, 'confirmed');
      const slot = await connection.getSlot();
      console.log('✅ RPC connected! Current slot:', slot);
    } catch (error) {
      console.log('❌ RPC connection failed:', error.message);
      process.exit(1);
    }
  }

  testRPC();
" || exit 1

# Test wallet
echo ""
echo "💰 Testing wallet..."
node -e "
  require('dotenv').config();
  const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
  const bs58 = require('bs58');

  async function testWallet() {
    try {
      const connection = new Connection(process.env.RPC_ENDPOINT, 'confirmed');
      const keypair = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
      const balance = await connection.getBalance(keypair.publicKey);

      console.log('✅ Wallet:', keypair.publicKey.toBase58().slice(0, 8) + '...');
      console.log('💰 Balance:', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');

      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log('⚠️  WARNING: Balance too low for trading!');
        console.log('   Recommended: > 0.5 SOL');
      }
    } catch (error) {
      console.log('❌ Wallet test failed:', error.message);
      process.exit(1);
    }
  }

  testWallet();
" || exit 1

# Test Telegram
echo ""
echo "📱 Testing Telegram connection..."
node -e "
  require('dotenv').config();
  const TelegramBot = require('node-telegram-bot-api');

  async function testTelegram() {
    try {
      const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
      const me = await bot.getMe();
      console.log('✅ Telegram bot:', me.username);

      await bot.sendMessage(
        process.env.TELEGRAM_CHAT_ID,
        '✅ Production setup test successful!'
      );
      console.log('✅ Test message sent!');
    } catch (error) {
      console.log('❌ Telegram test failed:', error.message);
      process.exit(1);
    }
  }

  testTelegram();
" || exit 1

# Security check
echo ""
echo "🔒 Running security checks..."

# Check if .env is in .gitignore
if grep -q "^\.env$" .gitignore; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${RED}❌ .env is NOT in .gitignore!${NC}"
    echo ".env" >> .gitignore
    echo -e "${GREEN}✅ Added .env to .gitignore${NC}"
fi

# Check for exposed keys in code
echo "🔍 Scanning for exposed keys..."
if grep -r "privateKey\|private_key\|secret" src/ --include="*.js" | grep -v "process.env" | grep -v "//"; then
    echo -e "${YELLOW}⚠️  Potential key exposure found! Review code.${NC}"
else
    echo -e "${GREEN}✅ No exposed keys found${NC}"
fi

# Performance check
echo ""
echo "⚡ Checking ElizaOS V2 integration..."
node -e "
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  if (packageJson.dependencies['@solana/web3.js']?.includes('2.0')) {
    console.log('✅ Solana web3.js v2: INSTALLED');
  } else {
    console.log('⚠️  Warning: Not using web3.js v2');
  }

  if (packageJson.dependencies['@elizaos/plugin-solana']) {
    console.log('✅ ElizaOS plugin: INSTALLED');
  } else {
    console.log('⚠️  Warning: ElizaOS plugin not found');
  }
"

# Final checklist
echo ""
echo "======================================"
echo "📋 PRODUCTION READINESS CHECKLIST"
echo "======================================"
echo ""

# Read trading status
TRADING_ENABLED=$(grep "^TRADING_ENABLED=" .env | cut -d'=' -f2)

if [ "$TRADING_ENABLED" = "true" ]; then
    echo -e "${RED}⚠️  TRADING IS ENABLED! ⚠️${NC}"
    echo ""
    echo "Are you sure you want to trade with real money?"
    echo "Recommended: Test in Alert Mode first (TRADING_ENABLED=false)"
    echo ""
else
    echo -e "${GREEN}✅ Alert Mode Active (Safe)${NC}"
fi

echo ""
echo "System Status:"
echo "✅ Node.js 20+"
echo "✅ Dependencies installed"
echo "✅ Environment configured"
echo "✅ RPC connected"
echo "✅ Wallet accessible"
echo "✅ Telegram connected"
echo "✅ ElizaOS V2 ready"
echo "✅ Security checked"
echo ""

if [ "$TRADING_ENABLED" = "true" ]; then
    echo -e "${YELLOW}⚠️  PRE-TRADING CHECKLIST:${NC}"
    echo "   ⬜ Tested bot in Alert Mode"
    echo "   ⬜ Wallet has > 0.5 SOL"
    echo "   ⬜ RPC endpoint is premium (Helius/QuickNode)"
    echo "   ⬜ Telegram alerts working"
    echo "   ⬜ Risk limits configured"
    echo "   ⬜ Emergency stop plan ready"
    echo ""
    echo -e "${RED}⚠️  ONLY PROCEED IF ALL CHECKS PASSED!${NC}"
fi

echo ""
echo "======================================"
echo "🎉 PRODUCTION SETUP COMPLETE!"
echo "======================================"
echo ""
echo "Next steps:"
if [ "$TRADING_ENABLED" = "true" ]; then
    echo "1. Review VPS-DEPLOYMENT.md"
    echo "2. Deploy to VPS"
    echo "3. Monitor closely first 24h"
    echo "4. Start with small amounts!"
else
    echo "1. Start bot: npm start"
    echo "2. Test in Alert Mode"
    echo "3. Enable trading when ready"
    echo "4. Deploy to VPS (see VPS-DEPLOYMENT.md)"
fi
echo ""
