#!/bin/bash

# Sentiment Analyzer - Server Starter Script
# This script starts the sentiment analyzer server

echo "🚀 Starting Sentiment Analyzer Server..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "   Please edit .env and add your ANTHROPIC_API_KEY"
    echo ""
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting server on http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo ""

npm start
