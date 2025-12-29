#!/bin/bash

###############################################################################
# 🚀 Contabo VPS Setup Script - Solana AI Trading Bot
# Ubuntu 22.04/24.04 LTS
# Run: curl -sL https://raw.githubusercontent.com/Timson100x/Solana-AI-Trading-Agent/main/vps-setup.sh | bash
###############################################################################

set -e  # Exit on error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================================================"
echo "🚀 SOLANA AI TRADING BOT - VPS SETUP"
echo "========================================================================"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Do not run as root! Run as normal user with sudo rights.${NC}"
   exit 1
fi

echo -e "${GREEN}✅ Step 1/8: Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

echo -e "${GREEN}✅ Step 2/8: Installing dependencies...${NC}"
sudo apt install -y curl git build-essential

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Step 3/8: Installing Node.js 20.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${YELLOW}⚠️  Node.js already installed: $(node --version)${NC}"
fi

# Verify Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version must be 20 or higher!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Step 4/8: Installing PM2 (Process Manager)...${NC}"
sudo npm install -g pm2

echo -e "${GREEN}✅ Step 5/8: Cloning repository...${NC}"
cd ~
if [ -d "Solana-AI-Trading-Agent" ]; then
    echo -e "${YELLOW}⚠️  Repository already exists, pulling latest...${NC}"
    cd Solana-AI-Trading-Agent
    git pull
else
    git clone https://github.com/Timson100x/Solana-AI-Trading-Agent.git
    cd Solana-AI-Trading-Agent
fi

echo -e "${GREEN}✅ Step 6/8: Installing npm packages...${NC}"
npm install

echo -e "${GREEN}✅ Step 7/8: Creating .env file...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}"
    echo "========================================================================"
    echo "⚠️  IMPORTANT: Edit .env file with your API keys and wallet!"
    echo "========================================================================"
    echo "Run: nano .env"
    echo ""
    echo "Required fields:"
    echo "  - RPC_ENDPOINT (Helius/QuickNode)"
    echo "  - WALLET_PRIVATE_KEY"
    echo "  - TELEGRAM_BOT_TOKEN"
    echo "  - TELEGRAM_CHAT_ID"
    echo "  - BIRDEYE_API_KEY"
    echo "  - GROQ_API_KEY"
    echo "  - TRADING_ENABLED=true  (for live trading!)"
    echo "========================================================================"
    echo -e "${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi

echo -e "${GREEN}✅ Step 8/8: Setting up PM2...${NC}"
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'solana-trading-bot',
    script: 'src/scheduler.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }]
};
EOF

echo ""
echo -e "${BLUE}"
echo "========================================================================"
echo "🎉 INSTALLATION COMPLETE!"
echo "========================================================================"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Edit configuration:"
echo "   ${YELLOW}nano .env${NC}"
echo ""
echo "2. Test system health:"
echo "   ${YELLOW}npm run health${NC}"
echo ""
echo "3. Start the bot:"
echo "   ${YELLOW}pm2 start ecosystem.config.js${NC}"
echo ""
echo "4. View logs:"
echo "   ${YELLOW}pm2 logs solana-trading-bot${NC}"
echo ""
echo "5. Monitor status:"
echo "   ${YELLOW}pm2 status${NC}"
echo ""
echo "6. Stop the bot:"
echo "   ${YELLOW}pm2 stop solana-trading-bot${NC}"
echo ""
echo "7. Restart the bot:"
echo "   ${YELLOW}pm2 restart solana-trading-bot${NC}"
echo ""
echo "8. Auto-start on reboot:"
echo "   ${YELLOW}pm2 startup${NC}"
echo "   ${YELLOW}pm2 save${NC}"
echo ""
echo -e "${BLUE}"
echo "========================================================================"
echo "📚 Documentation: https://github.com/Timson100x/Solana-AI-Trading-Agent"
echo "========================================================================"
echo -e "${NC}"
