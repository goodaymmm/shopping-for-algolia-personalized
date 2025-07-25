# MCP Server Setup for Claude Desktop

## Prerequisites
1. Node.js installed (v18 or higher)
2. Shopping for Algolia app built (`npm run build:all`)

## Building the MCP Server
```bash
npm run mcp:build
```

## Running the MCP Server

### Windows
```bash
mcp-server.bat
```

### macOS/Linux
```bash
npm run mcp:start
```

## Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

### Windows
```json
{
  "mcpServers": {
    "shopping-algolia": {
      "command": "M:\\workContest\\shopping-for-algolia-personalized\\mcp-server.bat"
    }
  }
}
```

### macOS/Linux
```json
{
  "mcpServers": {
    "shopping-algolia": {
      "command": "node",
      "args": ["/path/to/shopping-for-algolia-personalized/dist/main/mcp-entry.js"]
    }
  }
}
```

## Troubleshooting

1. **Module not found errors**: Run `npm run mcp:build` to compile TypeScript files
2. **Database path issues**: The MCP server uses `~/.shopping-algolia/shopping-data.db` by default
3. **Connection errors**: Check Claude Desktop logs for detailed error messages

## Available MCP Functions

The MCP server exposes a `get_personalization_profile` function that returns:
- Category affinities
- Brand preferences  
- Search patterns
- Product interaction history