# Shopping for Algolia Personalized

*Submission for the [Algolia MCP Server Challenge](https://dev.to/challenges/algolia-2025-07-09)*

> **🔗 This is an Algolia MCP Server Application**  
> All Algolia operations in this app are performed through the official **[Algolia MCP Server](https://github.com/algolia/mcp-node)** using the Model Context Protocol. No direct Algolia REST API calls are made - everything goes through MCP for natural language understanding and enhanced search capabilities.

An innovative **Algolia MCP Server-powered** shopping assistant that demonstrates advanced integration patterns for natural language search, personalization, and AI-driven product discovery through the Model Context Protocol (MCP).

## Demo

### Video Walkthrough
📹 **Demo Video**: *Coming Soon - Video walkthrough showing key features and Algolia MCP Server integration*

**Demo Highlights:**
- **Algolia MCP Server Integration**: All search operations are routed through MCP for natural language understanding
- **MCP-Powered Product Discovery**: Leverages MCP tools for intelligent query transformation
- **AI Image Analysis**: Combines Gemini API with Algolia MCP for visual search
- **MCP Personalization Tools**: Custom MCP tools for user preferences and analytics
- **Claude Desktop Compatible**: Seamlessly extends Claude with shopping capabilities

## Features

- 🔗 **Algolia MCP Server Core**: All Algolia operations are performed through MCP, not direct API calls
- 🤖 **MCP + AI Integration**: Combines Algolia MCP with Gemini API for intelligent product discovery
- 🧠 **MCP Personalization Tools**: Custom MCP tools (`get_user_preferences`, `suggest_products`) for AI agents
- 🔍 **MCP Multi-Index Search**: Leverages MCP's `searchSingleIndex` across multiple product categories
- 📊 **MCP Analytics**: `get_interaction_analytics` tool provides insights to AI assistants
- 🎯 **Natural Language Processing**: MCP Server translates queries into optimized Algolia searches
- 🎨 **Modern UI**: Clean interface with dark mode support
- 🔒 **Secure MCP Auth**: API keys passed securely to MCP Server via stdio protocol

## Architecture Overview: Algolia MCP Server Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (React)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Chat View   │  │ Search Panel │  │ Product Sidebar │   │
│  │ - Messages  │  │ - Text Input │  │ - Results List  │   │
│  │ - AI Resp.  │  │ - Image Up.  │  │ - Filters       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ IPC (Inter-Process Communication)
┌────────────────────────────┴────────────────────────────────┐
│                    Main Process (Electron)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Gemini    │  │AlgoliaMCP    │  │  Personalization│   │
│  │   Service   │  │  Service     │  │     Engine      │   │
│  │ - Image AI  │  │ - MCP Client │  │ - ML Tracking   │   │
│  │ - Analysis  │  │ - stdio IPC  │  │ - Scoring       │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                 │                    │             │
│         │          ┌──────┴───────┐            │             │
│         │          │ Algolia MCP  │            │             │
│         │          │   Server      │            │             │
│         │          │ - JSON-RPC   │            │             │
│         │          │ - Auth: API  │            │             │
│         │          └──────┬───────┘            │             │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴────────┐  │
│  │                  SQLite Database                      │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │  │
│  │  │ Products │  │ ML Training  │  │ Chat Sessions  │ │  │
│  │  │  Table   │  │    Data      │  │   & Messages   │ │  │
│  │  └──────────┘  └──────────────┘  └────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Shopping AI MCP Server (This App)            │  │
│  │  Tools: - get_personalization_summary               │  │
│  │         - get_user_preferences                      │  │
│  │         - get_interaction_analytics                 │  │
│  │         - suggest_products                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
              External Services & Protocols
┌─────────────────────┐  ┌─────────────────┐  ┌──────────────┐
│  Algolia MCP Server │  │  Google Gemini  │  │Claude Desktop│
│  - searchSingleIndex│  │  - gemini-1.5   │  │ - MCP Client │
│  - setSettings      │  │  - Image API    │  │ - Uses our   │
│  - saveObject       │  │  (Direct API)   │  │   MCP Tools  │
│  - listIndices      │  │                 │  │              │
└─────────────────────┘  └─────────────────┘  └──────────────┘
```

### Algolia Integration Strategy

This application uses a hybrid approach for Algolia integration:

#### Initial Setup (One-time, API Direct)
When API keys are first configured, the application uses the **Algolia JavaScript API directly** to:
- Create all required indices (fashion, electronics, products, beauty, sports, books, home, food)
- Upload the pre-processed dataset (Best Buy + Amazon ESCI data)
- Configure index settings for optimal search performance

This ensures reliable initial data population with clear logging marked as `[API Direct]`.

#### Ongoing Operations (MCP Server)
After initial setup, all Algolia operations use the **official Algolia MCP Server**:
- Product searches across multiple indices
- Saving user interactions
- Real-time personalization
- All search operations from the UI

This approach ensures MCP server utilization while maintaining setup reliability. All MCP operations are logged with `[MCP]` prefix for transparency.

## Technical Stack

### Frontend (Renderer Process)
- **React 18.3.1** - UI framework with hooks and functional components
- **TypeScript 5.6.2** - Type safety and modern JavaScript features
- **Tailwind CSS 3.4.1** - Utility-first CSS framework for responsive design
- **Vite 5.4.2** - Lightning-fast build tool and dev server
- **Lucide React** - Modern icon library for consistent UI

### Backend (Main Process)
- **Electron 37.2.1** - Cross-platform desktop app framework
- **Node.js** - JavaScript runtime for desktop integration
- **SQLite3** - Local database for user data and ML training
- **keytar** - Native OS keychain integration for secure API storage

### AI & MCP Integration
- **Algolia MCP Server** - Core search infrastructure, all Algolia operations go through MCP
- **@google/generative-ai 0.24.1** - Gemini API for advanced image analysis (direct API)
- **@modelcontextprotocol/sdk 1.15.1** - MCP SDK for building custom tools
- **stdio Protocol** - JSON-RPC communication with Algolia MCP Server

### Key Technologies & Patterns
- **IPC Architecture** - Secure communication between renderer and main process
- **Context Isolation** - Enhanced security with preload scripts
- **Multi-Index Search** - Optimized category-specific search indices
- **Progressive Enhancement** - Fallback strategies for better search results
- **Weighted ML Scoring** - Personalization engine with interaction tracking
- **Real-time Feedback** - Progress updates during image analysis
- **Hot Module Replacement** - Fast development with Vite HMR

## How I Utilized the Algolia MCP Server

This project is built entirely around **Algolia MCP Server**, replacing traditional REST API calls with MCP-based communication:

### 1. **Complete MCP Integration**
```typescript
// All Algolia operations go through MCP Server
class AlgoliaMCPClient {
  async searchSingleIndex(params) {
    // Communicates with Algolia MCP Server via stdio
    return this.callTool('searchSingleIndex', params);
  }
}
```
- **NO Direct API Calls**: All search, indexing, and settings operations use MCP
- **stdio Protocol**: JSON-RPC communication with Algolia MCP Server process
- **API Key Authentication**: Secure credentials passed via `--credentials` flag

### 2. **MCP Tools Implementation**
We've created custom MCP tools that extend the shopping experience:
- `get_personalization_summary`: Provides AI agents with user shopping insights
- `get_user_preferences`: Exposes category affinities and brand preferences
- `get_interaction_analytics`: Delivers engagement metrics for AI analysis
- `suggest_products`: Generates personalized recommendations based on context

### 3. **Multi-Index Search via MCP**
```typescript
// Parallel MCP searches across category indices
const searchPromises = indicesToSearch.map(indexName => 
  this.mcpClient.searchSingleIndex({
    indexName,
    query,
    ...additionalParams
  })
);
```
- All index operations (create, configure, search) go through MCP
- Leverages MCP's `searchSingleIndex` for category-specific searches
- Index settings configured via MCP's `setSettings` tool

### 4. **MCP-Powered Personalization Flow**
1. **User Action** → Saved to local SQLite database
2. **ML Processing** → PersonalizationEngine calculates preferences
3. **MCP Tools** → Expose data to AI assistants (Claude Desktop)
4. **Search Enhancement** → Results filtered through personalization layer

### 5. **Dual MCP Architecture**

This app implements a unique **dual MCP architecture**:

1. **Algolia MCP Server (External)**: Handles all Algolia API operations
   - Downloaded from official Algolia releases
   - Provides tools like `searchSingleIndex`, `setSettings`, `saveObject`
   - Authenticates via API keys

2. **Shopping AI MCP Server (This App)**: Extends Claude Desktop with shopping capabilities
   - Built into the application
   - Provides personalization and analytics tools
   - Accesses local SQLite data

### 6. **Claude Desktop Integration**

To use this app's MCP server with Claude Desktop:

1. **For installed app users**: The MCP server is already included in your installation.

2. **For developers**: Build the MCP server from source:
   ```bash
   npm install
   npm run mcp:build
   ```

3. Add to your Claude Desktop configuration file:
   
   **Finding the config file:**
   - Windows: Press `Win+R`, type `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: Open Terminal, type `open ~/.config/Claude/claude_desktop_config.json`

   **Windows configuration**:
   ```json
   {
     "mcpServers": {
       "shopping-ai": {
         "command": "C:\\Program Files\\Shopping for Algolia Personalized\\resources\\app\\mcp-server.bat"
       }
     }
   }
   ```
   
   If you installed from source code:
   ```json
   {
     "mcpServers": {
       "shopping-ai": {
         "command": "C:\\Users\\YourUsername\\shopping-for-algolia-personalized\\mcp-server.bat"
       }
     }
   }
   ```

   **macOS configuration**:
   ```json
   {
     "mcpServers": {
       "shopping-ai": {
         "command": "/Applications/Shopping for Algolia Personalized.app/Contents/Resources/app/mcp-server.sh"
       }
     }
   }
   ```
   
   If you installed from source code:
   ```json
   {
     "mcpServers": {
       "shopping-ai": {
         "command": "/Users/YourUsername/shopping-for-algolia-personalized/mcp-server.sh"
       }
     }
   }
   ```

4. Restart Claude Desktop to load the MCP server.

5. Test the connection: In Claude Desktop, you should see "shopping-ai" listed in the MCP servers when everything is configured correctly.

6. Available MCP tools in Claude:
   - `shopping-ai.get_personalization_summary` - View your shopping profile
   - `shopping-ai.get_user_preferences` - Access category and brand preferences
   - `shopping-ai.get_interaction_analytics` - Analyze shopping behavior
   - `shopping-ai.suggest_products` - Get AI-powered product recommendations

## Technical Implementation Details

### MCP-Based Search Architecture

All search operations are performed through **Algolia MCP Server**, ensuring natural language understanding:

```typescript
// 1. MCP Search - All queries go through Algolia MCP Server
const searchResults = await this.mcpClient.searchSingleIndex({
  indexName: 'fashion',
  query: userQuery,
  hitsPerPage: 20,
  facetFilters: buildFilters(context)
});

// 2. Multi-Index MCP Search - Parallel searches via MCP
const searchPromises = ['fashion', 'electronics', 'products'].map(
  indexName => this.mcpClient.searchSingleIndex({ indexName, query })
);
const results = await Promise.all(searchPromises);

// 3. MCP Index Management - Settings configured via MCP
await this.mcpClient.setSettings(indexName, {
  searchableAttributes: ['brand', 'name', 'description'],
  attributesForFaceting: ['searchable(brand)', 'searchable(categories)'],
  customRanking: ['desc(popularity)', 'desc(rating)']
});
```

### ML Personalization Engine

The personalization system uses weighted interactions to learn preferences:

```typescript
// Interaction Weights
const WEIGHTS = {
  VIEW: 0.1,      // Passive interest (time-based)
  CLICK: 0.5,     // Active interest
  SAVE: 1.0,      // Strong positive signal
  REMOVE: -0.8    // Negative feedback
};

// Personalization Scoring
function calculatePersonalizedScore(product, userProfile) {
  const categoryScore = userProfile.categories[product.category] || 0;
  const brandScore = userProfile.brands[product.brand] || 0;
  const priceScore = calculatePriceAffinity(product.price, userProfile);
  
  return baseScore * (1 + categoryScore + brandScore + priceScore);
}
```

### Discovery Mode Algorithm

Balances personalization with exploration:

```typescript
// Discovery mixing for diverse recommendations
function mixDiscoveryResults(personalizedResults, discoveryPercentage) {
  const discoveryCount = Math.ceil(results.length * discoveryPercentage / 100);
  const outliers = findOutlierProducts(personalizedResults);
  
  // Insert discovery items at strategic positions
  return interleaveResults(personalizedResults, outliers, discoveryCount);
}
```

### Security & Privacy

- **API Key Storage**: Uses OS-native keychain (Windows Credential Manager / macOS Keychain)
- **Context Isolation**: Renderer process has no direct access to Node.js APIs
- **Input Validation**: All user inputs sanitized before processing
- **Local-First**: All personalization data stored locally, never transmitted

### Performance Optimizations

- **Lazy Loading**: Products loaded on-demand with virtual scrolling
- **Image Optimization**: WebP format with fallback, progressive loading
- **Search Debouncing**: 300ms delay to reduce API calls
- **Result Caching**: 15-minute cache for repeated searches
- **Batch Operations**: Database writes batched for efficiency
- **Web Workers**: Heavy computations offloaded from main thread

## Data Sources & Acknowledgments

This project uses real-world e-commerce data for research and educational purposes:

**Dataset:** Amazon Reviews 2023  
**Source:** McAuley Lab, University of California San Diego  
**Purpose:** Research and educational demonstration only  
**Link:** https://amazon-reviews-2023.github.io/

**Citation:**
```bibtex
@article{hou2024bridging,
  title={Bridging Language and Items for Retrieval and Recommendation},
  author={Hou, Yupeng and Li, Jiacheng and He, Zhankui and Yan, An and Chen, Xiusi and McAuley, Julian},
  journal={arXiv preprint arXiv:2403.03952},
  year={2024}
}
```

**Data Processing:**
- Preprocessed ~100,000 products from Amazon Reviews 2023
- Categorized into Fashion (3,000), Electronics (2,000), and Other (2,000)
- Optimized for search performance and user experience
- No redistribution of original dataset - only processed search indices

## Installation

### Recommended: Pre-built Executable

1. Download the latest release from [Releases](https://github.com/goodaymmm/shopping-for-algolia-personalized/releases)
   - **Windows**: `Shopping-for-Algolia-Personalized-Setup-x.x.x.exe`
   - **macOS**: `Shopping-for-Algolia-Personalized-x.x.x.dmg` (limited testing)
2. Run the installer
3. Launch the application

**Note**: This application has been tested primarily on Windows. Mac builds are provided but may have limited testing.

### System Requirements

- **Operating System**: 
  - Windows 10/11 (fully tested)
  - macOS 10.14+ (build provided but untested - no Mac environment available)
- **Memory**: 4GB RAM minimum
- **Storage**: 500MB free space
- **Internet**: Required for AI features
- **Node.js**: Version 22+ required for Windows (for running official Algolia MCP Server)
- **Algolia MCP Server**: 
  - Windows: Runs official Algolia MCP Server TypeScript source via Node.js wrapper
  - macOS: Official binary included (untested due to lack of Mac environment)

## Algolia MCP Server Setup

This application requires **Algolia MCP Server** for all search operations:

### For Pre-built Release Users
The Algolia MCP Server executable is **already included** in the application bundle. No additional setup required!

### For Developers Building from Source

1. **Algolia MCP Server Setup**:
   
   **Windows**: Uses official Algolia MCP Server source code
   - Source files automatically copied during build
   - Requires Node.js 22+ installed on the system
   
   **macOS**: Download official binary
   ```bash
   curl -L https://github.com/algolia/mcp-node/releases/latest/download/algolia-mcp-macos -o resources/algolia-mcp/algolia-mcp
   chmod +x resources/algolia-mcp/algolia-mcp
   ```
   
   **Linux**: Official support coming soon
   - Use the Node.js wrapper approach similar to Windows

2. **Verify Installation**:
   ```bash
   # Test that Algolia MCP Server is working
   ./resources/algolia-mcp/algolia-mcp --version
   ```

### How It Works
- The app spawns Algolia MCP Server as a child process
- Communication happens via stdio using JSON-RPC protocol
- API keys are passed securely via the `--credentials` flag
- All Algolia operations (search, indexing, settings) go through MCP

### Platform-Specific Notes
- **Windows**: Runs the official Algolia MCP Server TypeScript source code directly using Node.js with `--experimental-strip-types` flag. This ensures full compatibility with the official implementation until a Windows binary is released.
- **macOS**: Uses the official Algolia MCP Server binary. Note: macOS functionality has not been tested due to lack of Mac development environment.

## Getting Started

### 1. Configure API Keys

On first launch, you'll need to set up your API keys:

1. Click the **Settings** icon (⚙️) in the sidebar
2. Navigate to the **API Keys** tab
3. Enter your credentials:
   - **Algolia Application ID**: Your Algolia app ID
   - **Algolia Search API Key**: Your search-only API key
   - **Algolia Write API Key**: Your write API key (for data management)
   - **Google Gemini API Key**: For AI image analysis
4. Click **Save API Keys**

### 2. Start Shopping

- **Text Search**: Type any product query in the chat
- **Image Search**: Click the image icon to upload a product photo
- **Filters**: Use natural language like "under $50" or "in black"
- **Discovery Mode**: Enable to get inspiration beyond your usual preferences

### 3. Personalization

The app learns from your interactions:
- Viewing products (low weight)
- Clicking products (medium weight)
- Saving products (high weight)
- Removing products (negative weight)

Over time, search results will be tailored to your preferences.

## Sharing the Application

### For Windows Users
1. Go to [Releases](https://github.com/goodaymmm/shopping-for-algolia-personalized/releases)
2. Download the `.exe` installer
3. Share the direct download link or the installer file
4. Users can install without technical knowledge

### For Mac Users
1. Download the `.dmg` file from Releases
2. Mount the DMG and drag to Applications
3. Note: Mac version has limited testing

## Privacy & Security

- **Local Storage**: All your data is stored locally on your device
- **Secure API Keys**: Credentials are encrypted using your system's keychain
- **No Tracking**: We don't collect or share your shopping data
- **Research Use Only**: Dataset used for educational demonstration purposes
- **Open Source**: Review our code on [GitHub](https://github.com/goodaymmm/shopping-for-algolia-personalized)

## Troubleshooting

### Search Returns No Results
- Ensure API keys are correctly configured
- Try searching for known brands like "Adidas" or "Samsung"
- Check your internet connection

### Image Analysis Not Working
- Verify your Gemini API key is valid
- Ensure the image is clear and shows the product
- Try with a different image format (JPG, PNG)

### Products Don't Match Preferences
- The ML system needs time to learn (5-10 interactions minimum)
- Check if Discovery Mode is set too high (try 0-5%)
- Clear ML data in Settings → Database if needed

## Development Journey with Algolia MCP Server

### Key Learnings

Building this application around **Algolia MCP Server** provided unique insights:

1. **MCP Architecture Benefits**:
   - Natural language understanding built into the search pipeline
   - Consistent API across different Algolia operations
   - Clean separation of concerns between UI and search logic

2. **Implementation Challenges Solved**:
   - **Child Process Management**: Spawning and managing Algolia MCP Server lifecycle
   - **stdio Communication**: Implementing robust JSON-RPC over stdio pipes
   - **Error Handling**: Graceful fallbacks when MCP Server is unavailable
   - **Authentication**: Secure credential passing via command-line arguments
   - **Windows Support**: Implemented Node.js wrapper that runs the official Algolia MCP Server TypeScript source directly, ensuring 100% compatibility with the official implementation

3. **MCP vs REST API Comparison**:
   ```typescript
   // Traditional REST API approach (NOT used in this app)
   const algoliaClient = algoliasearch(appId, apiKey);
   const index = algoliaClient.initIndex('products');
   const results = await index.search(query);
   
   // MCP Server approach (USED in this app)
   const results = await mcpClient.searchSingleIndex({
     indexName: 'products',
     query: query
   });
   ```

4. **Why MCP Server?**
   - **Unified Interface**: One protocol for all Algolia operations
   - **AI-Ready**: Designed for integration with AI assistants like Claude
   - **Future-Proof**: As MCP evolves, the app gains new capabilities
   - **Natural Language**: Built for conversational search experiences

## Uninstalling

### Windows
1. Use "Add or Remove Programs" in Windows Settings
2. To completely remove all application data:
   - Delete SQLite database: `C:\Users\[username]\AppData\Roaming\shopping-for-algolia-personalized\shopping-data.db`
   - Delete application folder: `C:\Users\[username]\AppData\Roaming\shopping-for-algolia-personalized\`

### macOS
1. Drag the app to Trash from Applications
2. To completely remove all application data:
   - Delete SQLite database: `~/Library/Application Support/shopping-for-algolia-personalized/shopping-data.db`
   - Delete application folder: `~/Library/Application Support/shopping-for-algolia-personalized/`

### Linux
1. Remove the application using your package manager or delete the AppImage
2. To completely remove all application data:
   - Delete SQLite database: `~/.config/shopping-for-algolia-personalized/shopping-data.db`
   - Delete application folder: `~/.config/shopping-for-algolia-personalized/`

### Application Data Transparency
The application stores the following data locally:
- **SQLite Database (`shopping-data.db`)**: Contains saved products, chat history, API keys, user settings, and ML personalization data
- **Log Files**: Application logs for debugging (can be cleared from Settings)
- **User Preferences**: Theme settings and other UI preferences

### Remove Algolia Data (Optional)
1. Log in to [Algolia Dashboard](https://www.algolia.com/dashboard)
2. Delete indices: fashion, electronics, products, etc.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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