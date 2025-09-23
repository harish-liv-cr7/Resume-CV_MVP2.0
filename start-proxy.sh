#!/bin/bash

echo "🚀 Starting AI Cover Letter & Resume Generator Server..."
echo ""
echo "✅ Server will run on http://localhost:8787"
echo "✅ Keep this terminal window open while using the extension"
echo "✅ Press Ctrl+C to stop the server when done"
echo ""

cd proxy

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please rename 'env.example' to '.env' and add your OpenAI API key"
    echo "See README.md for detailed instructions"
    exit 1
fi

npm start
