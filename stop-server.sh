#!/bin/bash

# Sentiment Analyzer - Server Stopper Script
# This script stops the sentiment analyzer server

echo "🛑 Stopping Sentiment Analyzer Server..."

# Find and kill the process running on port 3000
PID=$(lsof -ti:3000)

if [ -z "$PID" ]; then
    echo "❌ No server found running on port 3000"
    exit 1
else
    kill $PID
    echo "✅ Server stopped (PID: $PID)"
fi
