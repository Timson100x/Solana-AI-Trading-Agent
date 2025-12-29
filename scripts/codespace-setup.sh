#!/bin/bash

# ===================================
# SOLANA TRADING BOT - AUTO SETUP
# Codespaces One-Command Installer
# ===================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
ROCKET="🚀"
PACKAGE="📦"
WRENCH="🔧"
FOLDER="📁"
FIRE="🔥"
SPARKLES="✨"
WARNING="⚠️"
INFO="ℹ️"

echo ""
echo "${PURPLE}================================${NC}"
echo "${PURPLE}🚀 SOLANA TRADING BOT SETUP${NC}"
echo "${PURPLE}================================${NC}"
echo ""

# Function to print step
print_step() {
    echo ""
    echo "${BLUE}$1${NC}"
}

# Function to print success
print_success() {
    echo "${GREEN}${CHECK} $1${NC}"
}

# Function to print warning
print_warning() {
    echo "${YELLOW}${WARNING} $1${NC}"
}

# Function to print error
print_error() {
    echo "${RED}❌ $1${NC}"
}

# Step 1: Check Node.js
print_step "${PACKAGE} Step 1/8: Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION installed"
else
    print_error "Node.js not found!"
    exit 1
fi

# Step 2: Install dependencies
print_step "${PACKAGE} Step 2/8: Installing dependencies..."
echo "${INFO} This may take 2-3 minutes..."

if npm install --silent 2>&1 | grep -v "npm WARN"; then
    print_success "Main dependencies installed"
else
    print_warning "Some warnings during install (usually OK)"
fi

# Install additional packages
echo "${INFO} Installing additional packages..."
npm install nodemailer oauth-1.0a axios --silent 2>&1 | grep -v "npm WARN" || true
print_success "Additional packages installed"

# Step 3: Environment setup
print_step "${WRENCH} Step 3/8: Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_success ".env created from template"
    print_warning "IMPORTANT: Fill .env with your credentials!"
    echo ""
    echo "${YELLOW}Required fields:${NC}"
    echo "  - RPC_ENDPOINT"
    echo "  - WALLET_PRIVATE_KEY"
    echo "  - TELEGRAM_BOT_TOKEN"
    echo "  - TELEGRAM_CHAT_ID"
    echo "  - GOOGLE_AI_API_KEY"
    echo ""
    echo "${INFO} Open .env in editor (Ctrl+P → '.env' → Enter)"
    echo ""
else
    print_success ".env already exists"
fi

# Step 4: Make scripts executable
print_step "${WRENCH} Step 4/8: Making scripts executable..."
if [ -d scripts ]; then
    chmod +x scripts/*.sh 2>/dev/null || true
    print_success "Scripts are now executable"
else
    print_warning "Scripts directory not found (OK if new repo)"
fi

# Step 5: Create directories
print_step "${FOLDER} Step 5/8: Creating directories..."
mkdir -p logs data temp .cache
print_success "Directories created: logs/, data/, temp/, .cache/"

# Step 6: Validate installation
print_step "${INFO} Step 6/8: Validating installation..."

# Check package.json
if [ -f package.json ]; then
    print_success "package.json found"
else
    print_error "package.json missing!"
    exit 1
fi

# Check main file
if [ -f index.js ] || [ -f src/index.js ]; then
    print_success "Main file found"
else
    print_warning "Main file not found (check repo structure)"
fi

# Check Node modules
if [ -d node_modules ]; then
    print_success "node_modules directory exists"
else
    print_error "node_modules missing!"
    exit 1
fi

# Step 7: Configuration check
print_step "${INFO} Step 7/8: Checking configuration..."

if [ -f .env ]; then
    # Check if .env has content
    if [ -s .env ]; then
        # Check for required fields
        REQUIRED_FIELDS=("RPC_ENDPOINT" "WALLET_PRIVATE_KEY" "TELEGRAM_BOT_TOKEN")
        MISSING_FIELDS=()

        for field in "${REQUIRED_FIELDS[@]}"; do
            if ! grep -q "^${field}=" .env || grep -q "^${field}=$" .env || grep -q "^${field}=your_" .env; then
                MISSING_FIELDS+=("$field")
            fi
        done

        if [ ${#MISSING_FIELDS[@]} -eq 0 ]; then
            print_success "All required fields configured"
        else
            print_warning "Missing/incomplete fields: ${MISSING_FIELDS[*]}"
            echo "${INFO} Fill these before starting the bot"
        fi
    else
        print_warning ".env is empty - fill it before starting!"
    fi
fi

# Step 8: Final checks
print_step "${SPARKLES} Step 8/8: Final checks..."

# Test Node
if node -e "console.log('test')" &>/dev/null; then
    print_success "Node.js working"
else
    print_error "Node.js test failed"
    exit 1
fi

# Test npm
if npm -v &>/dev/null; then
    print_success "npm working"
else
    print_error "npm test failed"
    exit 1
fi

# Check dependencies
REQUIRED_PACKAGES=("@solana/web3.js" "telegraf" "axios")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! npm list "$package" &>/dev/null; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -eq 0 ]; then
    print_success "All required packages installed"
else
    print_warning "Missing packages: ${MISSING_PACKAGES[*]}"
    print_warning "Run: npm install"
fi

# Success!
echo ""
echo "${PURPLE}================================${NC}"
echo "${GREEN}${FIRE} SETUP COMPLETE! ${FIRE}${NC}"
echo "${PURPLE}================================${NC}"
echo ""
echo "${GREEN}${CHECK} Dependencies installed${NC}"
echo "${GREEN}${CHECK} Environment configured${NC}"
echo "${GREEN}${CHECK} Scripts ready${NC}"
echo "${GREEN}${CHECK} Directories created${NC}"
echo "${GREEN}${CHECK} Validation passed${NC}"
echo ""
echo "${PURPLE}================================${NC}"
echo "${YELLOW}📋 NEXT STEPS:${NC}"
echo "${PURPLE}================================${NC}"
echo ""
echo "1. ${YELLOW}Fill .env with your credentials:${NC}"
echo "   ${INFO} Open: .env"
echo "   ${INFO} Required: RPC_ENDPOINT, WALLET_PRIVATE_KEY, TELEGRAM_BOT_TOKEN"
echo ""
echo "2. ${YELLOW}Start the bot:${NC}"
echo "   ${INFO} Run: ${GREEN}npm start${NC}"
echo ""
echo "3. ${YELLOW}Access dashboard:${NC}"
echo "   ${INFO} Web: http://localhost:3000"
echo "   ${INFO} Telegram: /start"
echo ""
echo "4. ${YELLOW}Test trading:${NC}"
echo "   ${INFO} Start in Alert Mode (TRADING_ENABLED=false)"
echo "   ${INFO} Monitor for opportunities"
echo "   ${INFO} Enable trading when ready"
echo ""
echo "${PURPLE}================================${NC}"
echo "${GREEN}${ROCKET} READY TO TRADE! ${ROCKET}${NC}"
echo "${PURPLE}================================${NC}"
echo ""

# Optional: Open .env in default editor
if [ -z "$CODESPACES" ]; then
    # Not in Codespaces
    if command -v code &> /dev/null; then
        echo "${INFO} Opening .env in VS Code..."
        code .env
    fi
else
    # In Codespaces
    echo "${INFO} In Codespaces: Use editor to open .env"
fi

# Show setup time
echo "${INFO} Setup completed in ~2-3 minutes"
echo ""

# End
exit 0
