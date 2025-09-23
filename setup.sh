#!/bin/bash

echo "🚀 Setting up AI Cover Letter & Resume Generator..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    echo "Then restart your terminal and run this script again."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Navigate to proxy directory
cd proxy

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: package.json not found in proxy directory"
    exit 1
fi

# Install proxy dependencies
echo "📦 Installing dependencies..."
if ! npm install; then
    echo "❌ ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔑 NEXT STEPS - API Key Setup:"
echo "1. Get your OpenAI API key from https://platform.openai.com/api-keys"
echo "2. Rename 'proxy/env.example' to 'proxy/.env'"
echo "3. Edit 'proxy/.env' and add your API key"
echo "4. Run './start-proxy.sh' to start the server"
echo "5. Load the Chrome extension from the 'extension' folder"
echo ""
echo "📖 See README.md for detailed instructions!"
