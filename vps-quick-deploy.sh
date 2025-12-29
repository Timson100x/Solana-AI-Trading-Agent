#!/bin/bash
#######################################################
# 🚀 SOLANA AI TRADING BOT - VPS QUICK DEPLOY
# Führe dieses Script auf deinem VPS aus!
#######################################################

echo "🚀 Solana AI Trading Bot - VPS Setup"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Nicht als root ausführen! Nutze einen normalen User."
  exit 1
fi

# Update system
echo "📦 System updaten..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Node.js 20 installieren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node
echo "✅ Node.js Version: $(node -v)"
echo "✅ npm Version: $(npm -v)"

# Install PM2
echo "📦 PM2 installieren..."
sudo npm install -g pm2

# Clone repo
echo "📥 Repository klonen..."
cd ~
if [ -d "Solana-AI-Trading-Agent" ]; then
  echo "📁 Ordner existiert, aktualisiere..."
  cd Solana-AI-Trading-Agent
  git pull origin main
else
  git clone https://github.com/Timson100x/Solana-AI-Trading-Agent.git
  cd Solana-AI-Trading-Agent
fi

# Install dependencies
echo "📦 Dependencies installieren..."
npm install

# Create .env if not exists
if [ ! -f ".env" ]; then
  echo "📝 .env Datei erstellen..."
  cat > .env << 'ENVFILE'
# ===== REQUIRED =====
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
WALLET_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY_BASE58

# ===== TELEGRAM =====
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# ===== AI PROVIDERS =====
GROQ_API_KEY=YOUR_GROQ_KEY
GEMINI_API_KEY=YOUR_GEMINI_KEY

# ===== TOKEN DATA =====
BIRDEYE_API_KEY=YOUR_BIRDEYE_KEY
HELIUS_API_KEY=YOUR_HELIUS_KEY

# ===== JUPITER (optional) =====
JUPITER_API_KEY=

# ===== TRADING SETTINGS =====
TRADING_ENABLED=true
AUTO_TRADING_ENABLED=true
MIN_CONFIDENCE=70
MAX_TRADE_AMOUNT=0.02
SLIPPAGE_BPS=150
STOP_LOSS=15
TAKE_PROFIT=30

# ===== SCANNER =====
SCAN_INTERVAL=60000
MIN_LIQUIDITY=50000
ENVFILE
  echo ""
  echo "⚠️  WICHTIG: Bearbeite die .env Datei mit deinen Keys!"
  echo "   nano .env"
  echo ""
fi

echo ""
echo "✅ Installation abgeschlossen!"
echo ""
echo "===== NÄCHSTE SCHRITTE ====="
echo ""
echo "1️⃣  Bearbeite .env mit deinen Keys:"
echo "    nano .env"
echo ""
echo "2️⃣  Starte den Bot mit PM2:"
echo "    pm2 start index.js --name trading-bot"
echo ""
echo "3️⃣  Logs ansehen:"
echo "    pm2 logs trading-bot"
echo ""
echo "4️⃣  Bot Status:"
echo "    pm2 status"
echo ""
echo "5️⃣  Bot neustarten:"
echo "    pm2 restart trading-bot"
echo ""
echo "6️⃣  Auto-Start bei Reboot:"
echo "    pm2 startup && pm2 save"
echo ""
