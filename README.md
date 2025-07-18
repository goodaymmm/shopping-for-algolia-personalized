# Shopping for AIgolia Personalized

An AI-powered personalized shopping assistant built with Electron, React, and TypeScript. This application integrates Gemini API for image analysis, Algolia search for product discovery, and includes a unique discovery mode for exploring diverse recommendations.

## 🚀 Features

- **AI-Powered Image Analysis**: Upload product images for instant recognition and search
- **Smart Product Search**: Algolia-powered search with personalization
- **Discovery Mode**: Configurable outlier percentage (0%, 5%, 10%) for diverse recommendations
- **Chat Interface**: Persistent conversation history with image support
- **Local Database**: SQLite storage for chat history and personalization data
- **Theme Support**: Light/dark mode with system preference detection
- **MCP Integration**: Compatible with Claude Desktop through Model Context Protocol

## 📋 Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- API Keys (see [API Configuration](#api-configuration))

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/goodaymmm/shopping-for-algolia-personalized.git
cd shopping-for-algolia-personalized
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
# Start Vite dev server (renderer only)
npm run dev

# Or run full Electron app
npm run build:dev && npm run electron:dev
```

## 🔑 API Configuration

This application requires API keys for full functionality:

### Gemini API (Google)
- **Purpose**: Image analysis for product recognition
- **Get API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Configuration**: Settings → API Keys → Enter Gemini API key

### Algolia Search API
- **Purpose**: Product search and discovery
- **Get API Key**: [Algolia.com](https://www.algolia.com/)
- **Configuration**: Settings → API Keys → Enter Application ID and Search API Key
- **Default**: Demo API with Best Buy dataset (limited functionality)

## 📦 Building

### Local Build
```bash
npm run build
```

### GitHub Actions
The project uses GitHub Actions for automated builds. Builds are triggered on:
- Push to main, master, or phase-c-ai-integration branches
- Pull requests
- Manual workflow dispatch

**Note**: If you encounter artifact storage quota errors, see [Troubleshooting](#troubleshooting).

## 🔧 Development Commands

```bash
# Development
npm run dev                # Start Vite dev server
npm run build:dev         # Build for development
npm run electron:dev      # Run Electron app

# Building
npm run build            # Full production build
npm run build:main       # Build main process only
npm run build:renderer   # Build renderer only

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
npm run clean           # Clean build directories
```

## 🐛 Troubleshooting

### Module Not Found in Production
If you see "Cannot find module" errors:
1. Ensure the package is in `dependencies`, not `devDependencies`
2. Clean install: `rm -rf node_modules package-lock.json && npm install`
3. Rebuild the application

### Gemini API Issues
- Verify API key is correctly entered in Settings
- Check console logs for detailed error messages
- Ensure using correct model: `gemini-2.5-flash`

### GitHub Actions Storage Quota
If builds fail due to storage limits:
1. Delete old artifacts from Actions tab
2. Reduce retention in Settings → Actions → General
3. See CLAUDE.md for workflow optimization tips

### UI/Styling Issues
- Ensure Tailwind CSS v3.4.1 is installed (not v4)
- Keep `postcss.config.js` in CommonJS format
- Check for slate color class compatibility

## 🏗️ Architecture

- **Main Process** (`src/main/`): Electron main process with Node.js access
- **Renderer Process** (`src/renderer/`): React frontend
- **Preload Script** (`src/preload/`): Secure IPC bridge
- **Shared Types** (`src/shared/`): Common TypeScript interfaces

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Search powered by [Algolia](https://www.algolia.com/)
- AI analysis by [Google Gemini](https://ai.google.dev/)
- Icons by [Lucide](https://lucide.dev/)

## 📚 Documentation

For detailed development documentation and troubleshooting, see [CLAUDE.md](./CLAUDE.md)