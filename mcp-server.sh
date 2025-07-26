#!/bin/bash

# MCP Server Launcher for Unix/macOS
cd "$(dirname "$0")"
echo "Starting MCP Server..."
node dist/main/mcp-server-simple.js