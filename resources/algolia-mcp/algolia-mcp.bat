@echo off
REM Windows batch file to run Algolia MCP Server
REM This wraps the Node.js implementation for Windows compatibility

node "%~dp0algolia-mcp-windows.js" %*