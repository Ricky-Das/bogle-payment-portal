#!/bin/bash

echo "🚀 Starting Bogle Payment Portal Development Environment"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🔧 Development Options:"
echo "1. Local development with mock API (recommended for frontend work)"
echo "2. Connect to deployed AWS API (requires AWS deployment)"
echo ""

read -p "Choose option (1 or 2): " choice

case $choice in
    1)
        echo "🎯 Starting with mock API server..."
        echo "VITE_API_URL=http://localhost:3001" > .env.local
        echo "VITE_ENVIRONMENT=development" >> .env.local
        npm run dev:mock
        ;;
    2)
        echo "☁️ Connecting to AWS API..."
        if [ -f ".env" ]; then
            cp .env .env.local
        else
            echo "❌ No .env file found with AWS API URL"
            echo "Please create .env file with your AWS API Gateway URL"
            exit 1
        fi
        npm run dev
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac