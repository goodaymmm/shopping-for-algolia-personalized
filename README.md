# Shopping for Algolia Personalized

*Submission for the [Algolia MCP Server Challenge](https://dev.to/challenges/algolia-2025-07-09)*

AI-powered personalized shopping assistant with advanced image recognition and smart search capabilities, demonstrating the power of Algolia MCP Server integration.

## Demo

### Video Walkthrough
📹 **Demo Video**: *Coming Soon - Video walkthrough showing key features and Algolia MCP Server integration*

**Demo Highlights:**
- Real-time product search with natural language queries
- AI image analysis for visual product discovery
- Personalized recommendations based on user behavior
- MCP Server integration with Claude Desktop
- Progressive search strategies and intelligent fallbacks

## Features

- 🤖 **AI Image Analysis**: Advanced product recognition using Google Gemini API
- 🔍 **Smart Search**: Multi-index Algolia search with intelligent fallback strategies
- 🧠 **ML Personalization**: Learns your preferences and recommends products tailored to you
- 📊 **Search History**: Track and review past searches with collapsible sections
- 🎯 **Smart Query**: Progressive query simplification for better search results
- 🔗 **MCP Integration**: Compatible with Claude Desktop for AI-enhanced shopping
- 🎨 **Modern UI**: Clean interface with dark mode support
- 🔒 **Secure**: Your data stays local, API keys are securely stored

## Architecture Overview

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
│  │   Gemini    │  │   Algolia    │  │  Personalization│   │
│  │   Service   │  │   Service    │  │     Engine      │   │
│  │ - Image AI  │  │ - Multi-idx  │  │ - ML Tracking   │   │
│  │ - Analysis  │  │ - Fallback   │  │ - Scoring       │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
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
│  │              MCP Server Interface                     │  │
│  │  - Exposed to Claude Desktop via --mcp-server flag   │  │
│  │  - Provides personalized search & profile access     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                    External Services
┌─────────────────────┐  ┌─────────────────┐  ┌──────────────┐
│   Algolia Search    │  │  Google Gemini  │  │Claude Desktop│
│   - fashion index   │  │  - gemini-1.5   │  │ - MCP Client │
│   - electronics idx │  │  - Image API    │  │ - Search API │
│   - products index  │  │                 │  │              │
└─────────────────────┘  └─────────────────┘  └──────────────┘
```

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

### AI & Search Integration
- **@google/generative-ai 0.24.1** - Gemini API for advanced image analysis
- **algoliasearch 5.32.0** - Official Algolia client for search operations
- **@modelcontextprotocol/sdk 1.15.1** - MCP server for Claude Desktop

### Key Technologies & Patterns
- **IPC Architecture** - Secure communication between renderer and main process
- **Context Isolation** - Enhanced security with preload scripts
- **Multi-Index Search** - Optimized category-specific search indices
- **Progressive Enhancement** - Fallback strategies for better search results
- **Weighted ML Scoring** - Personalization engine with interaction tracking
- **Real-time Feedback** - Progress updates during image analysis
- **Hot Module Replacement** - Fast development with Vite HMR

## How I Utilized the Algolia MCP Server

This project leverages **Algolia MCP Server** to create a seamless AI-powered shopping experience:

### 1. **Natural Language Processing**
- MCP Server translates complex user queries into optimized Algolia searches
- Supports context-aware product discovery ("shoes like this photo but in red")
- Intelligent query expansion and refinement

### 2. **Advanced Search Strategies**
```typescript
// Multi-index search with intelligent fallback
const searchStrategies = [
  { index: 'fashion', filters: 'category:shoes' },
  { index: 'electronics', filters: 'price<500' },
  { index: 'products', query: simplifiedQuery }
];
```

### 3. **Multi-Index Architecture**
Our Algolia implementation uses specialized indices for optimal search performance:
- **fashion**: Clothing, shoes, accessories (3,000+ products)
- **electronics**: Devices, gadgets, tech gear (2,000+ products)  
- **products**: Universal fallback index for cross-category search
- Auto-created indices for beauty, sports, books, home, and food categories

### 4. **Real-time Personalization**
- User interaction tracking with weighted preferences
- ML-powered recommendation engine using Algolia's analytics
- Dynamic search result ranking based on user behavior

### 5. **Claude Desktop Integration**
```json
{
  "mcpServers": {
    "shopping-ai": {
      "command": "path/to/app",
      "args": ["--mcp-server"]
    }
  }
}
```

## Technical Implementation Details

### Search Architecture

Our multi-layered search approach ensures users always find relevant products:

```typescript
// 1. Primary Search - Direct query with filters
const primarySearch = await algolia.search({
  query: userQuery,
  filters: buildFilters(context),
  hitsPerPage: 20
});

// 2. Fallback Strategy - Progressive simplification
if (primarySearch.hits.length === 0) {
  const strategies = [
    removeModelNumbers(query),    // "iPhone 15 Pro" → "iPhone"
    extractBrandCategory(query),  // "Nike Air Max" → "Nike shoes"
    extractKeyTerms(query)        // First 3 meaningful words
  ];
}

// 3. Cross-Index Search - Category exploration
const indices = ['fashion', 'electronics', 'products'];
const multiIndexResults = await Promise.all(
  indices.map(index => searchIndex(index, query))
);
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
  - macOS 10.14+ (limited testing)
- **Memory**: 4GB RAM minimum
- **Storage**: 500MB free space
- **Internet**: Required for AI features

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