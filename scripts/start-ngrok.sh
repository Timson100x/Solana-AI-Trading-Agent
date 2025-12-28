#!/bin/bash

# 🌐 Ngrok Integration for External API Access
# Allows external monitoring and control

echo "🌐 Setting up Ngrok tunnel..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "📦 Installing ngrok..."

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
            sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
            sudo tee /etc/apt/sources.list.d/ngrok.list
        sudo apt update && sudo apt install ngrok
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ngrok/ngrok/ngrok
    fi
fi

# Get auth token from .env
if [ -f .env ]; then
    source .env
    if [ ! -z "$NGROK_AUTH_TOKEN" ]; then
        ngrok config add-authtoken $NGROK_AUTH_TOKEN
    fi
fi

# Get port from .env or default
PORT=${WEB_PORT:-3000}

echo "✅ Ngrok installed!"
echo ""
echo "🚀 Starting ngrok tunnel on port $PORT..."
echo ""

# Start ngrok in background
ngrok http $PORT --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get public URL
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$PUBLIC_URL" ]; then
    echo "============================================"
    echo "🎉 NGROK TUNNEL ACTIVE!"
    echo "============================================"
    echo ""
    echo "Public URL: $PUBLIC_URL"
    echo ""
    echo "API Endpoints:"
    echo "  - Health: $PUBLIC_URL/api/health"
    echo "  - Stats:  $PUBLIC_URL/api/stats"
    echo "  - Trades: $PUBLIC_URL/api/trades"
    echo ""
    echo "Dashboard: $PUBLIC_URL"
    echo ""
    echo "Ngrok PID: $NGROK_PID"
    echo "Ngrok Admin: http://localhost:4040"
    echo ""
    echo "============================================"
    echo ""
    echo "⚠️  KEEP THIS TERMINAL OPEN!"
    echo "To stop: kill $NGROK_PID"
    echo ""

    # Save URL to file
    echo "$PUBLIC_URL" > .ngrok_url

    # Wait for Ctrl+C
    echo "Press Ctrl+C to stop..."
    wait $NGROK_PID
else
    echo "❌ Failed to start ngrok tunnel"
    echo "Check ngrok.log for details"
    exit 1
fi
