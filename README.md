# Shopping for Algolia Personalized

*Submission for the [Algolia MCP Server Challenge](https://dev.to/challenges/algolia-2025-07-09)*

> **🔗 Algolia MCP Server Application** - All search operations use the official [Algolia MCP Server](https://github.com/algolia/mcp-node) via Model Context Protocol.

AI-powered shopping assistant with image search, ML personalization, and Claude Desktop integration.

## Demo

📹 **Demo Video**: [Watch on YouTube](https://youtu.be/_AIdSyxy_T0)

*Note: English is not the author's native language, so the English narration is AI-generated.*

**Key Features:**
- AI image analysis with Gemini 2.5 Flash
- ML-powered personalization
- Claude Desktop MCP integration
- Multi-index Algolia search via MCP

## Features

- 🔗 **Algolia MCP Server**: All search operations via MCP protocol
- 🤖 **AI Image Search**: Gemini 2.5 Flash for product recognition
- 🧠 **ML Personalization**: Category and brand learning
- 📊 **8 MCP Tools**: Full suite for Claude Desktop integration
- 🎨 **Modern UI**: React + TypeScript with dark mode
- 🔒 **Secure Storage**: OS keychain for API credentials

### AI-Powered Image Search
![Gemini Image Analysis](SS/01Gemini_Analyze.png)
*Upload any product image and get instant AI analysis with relevant search results*

### Personalized Search Results
![Search Results with Discovery Mode](SS/02Result.png)
*Smart search results combining personalized recommendations with discovery items*

## Architecture

```mermaid
graph TD
    UI[React UI/Frontend]
    UI -->|Initial Setup Only|ALGOLIA_RESTAPI[Algolia REST API]
    UI <-->|All Operations| MCP_SERVICE
  
    MCP_SERVICE[AlgoliaMCPService<br/>Bridge Service]
    MCP_SERVICE <--> DB[(SQLite<br/>Local DB)]
    MCP_SERVICE <--> ALGOLIA_MCP
    
    MCP_SERVICE <--> GEMINI_API[Gemini API<br/>2.5 Flash]
    
    DB <--> SHOPPING_MCP[Shopping AI MCP Server<br/>8 tools for Claude]
    SHOPPING_MCP <--> CLAUDE[Claude Desktop]
    
    ALGOLIA_MCP[Algolia MCP Server]
    ALGOLIA_MCP <--> ALGOLIA[Algolia]
    
    style UI fill:#ff6b35,stroke:#333,stroke-width:2px,color:#fff
    style MCP_SERVICE fill:#4a90e2,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#50c878,stroke:#333,stroke-width:2px,color:#fff
    style ALGOLIA_MCP fill:#003dff,stroke:#333,stroke-width:2px,color:#fff

    style CLAUDE fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
    style GEMINI_API fill:#ea4335,stroke:#333,stroke-width:2px,color:#fff
    style ALGOLIA fill:#003dff,stroke:#333,stroke-width:2px,color:#fff
    style SHOPPING_MCP fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
```

### Integration Strategy

- **Initial Setup**: Direct Algolia API for index creation and data upload (one-time)
- **All Operations**: Algolia MCP Server for searches, settings, and updates
- **Personalization**: Local SQLite + custom MCP tools for Claude Desktop

## Tech Stack

- **Frontend**: React 18.3 + TypeScript + Tailwind CSS + Vite
- **Backend**: Electron 37.2 + SQLite + Node.js
- **AI/MCP**: Algolia MCP Server + Gemini 2.5 Flash + MCP SDK
- **Security**: keytar (OS keychain) + Context Isolation

## How I Used Algolia MCP Server

### 1. **All Search Operations via MCP**
```typescript
// Every search goes through Algolia MCP Server
await mcpClient.searchSingleIndex({
  indexName: 'fashion',
  query: userQuery,
  hitsPerPage: 20
});
```

### 2. **Dual MCP Architecture**
- **Algolia MCP Server**: Official server for all Algolia operations
- **Shopping AI MCP Server**: 8 custom tools for Claude Desktop

### 3. **Claude Desktop Setup**

1. Install the app or use `.dxt` file from [Releases](https://github.com/goodaymmm/shopping-for-algolia-personalized/releases)

2. Add to Claude Desktop config:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/.config/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "shopping-ai": {
         "command": "C:\\Program Files\\Shopping for Algolia Personalized\\resources\\app\\mcp-server.bat"
       }
     }
   }
   ```

3. Restart Claude Desktop

4. **Available Tools** (8 total):
   - `get_personalization_summary` - Shopping profile overview
   - `get_user_preferences` - Category and brand preferences
   - `get_saved_products` - All saved products with details
   - `get_shopping_insights` - Comprehensive analysis
   - `get_product_comparisons` - Compare by category
   - `get_interaction_analytics` - Engagement metrics
   - `suggest_products` - AI recommendations
   - `search_products` - Product search (placeholder)

5. **Example Prompts**:
   - "Show me my shopping trends"
   - "Compare my saved products"
   - "Create a shopping analysis report"

### Claude Desktop Integration in Action
![Claude Desktop MCP Integration](SS/005Claude_Desktop.png)
*Claude Desktop analyzing your shopping patterns and providing personalized insights through MCP tools*

## Quick Start

1. **Install**: Download from [Releases](https://github.com/goodaymmm/shopping-for-algolia-personalized/releases)
2. **Configure API Keys**: Settings → API Keys
   - Algolia: App ID, Search Key, Write Key
   - Gemini: API Key
3. **Search**: Upload image or type query
4. **Personalize**: Click/save products to train ML

## Known Limitations

### Search Result Filtering
- **Follow-up queries** (e.g., "Can you find one for under $100?") use an in-memory cache that expires after 5 minutes
- **After app restart**, filtered searches need to be performed as new searches with complete context
- Example:
  - ✅ Initial: "Nike shoes" → Follow-up: "under $100" (works within 5 minutes)
  - ❌ After restart: "under $100" alone (no context, returns no results)
  - ✅ After restart: "Nike shoes under $100" (complete query works)

## Installation

1. Download from [Releases](https://github.com/goodaymmm/shopping-for-algolia-personalized/releases)
2. Run installer
3. Configure API keys in Settings
   
   ![API Key Configuration](SS/03APIKEY_Apply.png)
   
   **Note**: When setting up API keys for the first time, the app will upload datasets to Algolia. Please wait a moment for this process to complete.

4. Verify indices creation in your Algolia Dashboard
   
   ![Algolia Indices Created](SS/04Algolia_index.png)
   *Three indices (fashion, electronics, other) will be created automatically*

## Platform Support

- **Windows**: ✅ Fully tested
- **macOS**: ⚠️ Build provided but untested

## License

This project is licensed under the MIT License.

### Additional Licenses & Acknowledgments

**Dependencies:**
- React, TypeScript, Electron: MIT License
- Algolia JavaScript Client: MIT License
- Google Generative AI SDK: Apache 2.0 License
- Lucide React: ISC License

**Dataset:**
- Amazon Reviews 2023 (McAuley Lab, UCSD): Used for research and educational purposes only
- No commercial redistribution or resale of original dataset

**Third-party Services:**
- Algolia Search API: Subject to Algolia Terms of Service
- Google Gemini API: Subject to Google AI Terms of Service

**Disclaimer:** This project is created for educational and research purposes as part of the Algolia MCP Server Challenge. Not intended for commercial use.