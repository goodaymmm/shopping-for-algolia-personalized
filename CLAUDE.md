# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains "Shopping for AIgolia personalized" - an AI-powered personalized shopping assistant built with Electron, React, and TypeScript. The application integrates Gemini API for image analysis, Algolia search for product discovery, SQLite for local data storage, and Model Context Protocol (MCP) for Claude Desktop integration.

## Architecture

### Multi-Process Electron Application

1. **Main Process** (`src/main/`):
   - `main.ts`: Application entry point, window management, IPC setup
   - `database.ts`: SQLite database operations and schema management
   - Node.js environment with full system access

2. **Renderer Process** (`src/renderer/`):
   - `App.tsx`: Main React application with view routing
   - `components/`: Feature-organized UI components
   - `hooks/`: Custom React hooks (useTheme, useSettings, useChatSessions)
   - `types.ts`: Frontend-specific TypeScript types
   - Browser environment with restricted access

3. **Preload Script** (`src/preload/`):
   - `index.ts`: Secure IPC bridge between main and renderer
   - Context isolation enabled for security

4. **Shared Code** (`src/shared/`):
   - `types.ts`: Common TypeScript interfaces used across processes

### Key Features

- **AI-Powered Image Analysis**: Gemini API integration for product image recognition
- **Product Search**: Algolia search with Best Buy demo dataset
- **Discovery Mode**: Configurable outlier percentage (0%, 5%, 10%) for diverse recommendations
- **Chat Interface**: Persistent conversation history with image upload support
- **Local Database**: SQLite storage for chat history, products, and ML training data
- **Multi-View Interface**: Chat, History, Database, Settings views
- **Theme System**: Light/dark mode with system preference detection
- **MCP Integration**: Claude Desktop compatibility through Model Context Protocol

## Development Commands

### Primary Project (`shopping-for-algolia-personalized/`)

```bash
# Development
npm run dev                # Start Vite dev server (renderer only, port 5173)
npm run build:dev         # Build all components for development
npm run electron:dev      # Run Electron app (after building)

# Building
npm run build            # Full production build with electron-builder
npm run build:win        # Build Windows executable
npm run build:main       # Build Electron main process only
npm run build:renderer   # Build React renderer only
npm run build:all        # Build both main and renderer

# Maintenance
npm run clean            # Clean dist and release directories
npm run lint            # ESLint TypeScript files
npm run type-check      # TypeScript type checking
npm run preview         # Preview built renderer
```

### Secondary Project (`project/`)

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run lint            # ESLint checking
```

## Development Workflow

### 1. Renderer Development (Hot Reload)
```bash
npm run dev
# Navigate to http://localhost:5173
# Changes auto-reload in browser
```

### 2. Main Process Development
```bash
npm run build:main
npm run electron:dev
# Restart Electron after main process changes
```

### 3. Full Application Testing
```bash
npm run build:dev
npm run electron:dev
# Test complete Electron app with IPC communication
```

### 4. Production Build
```bash
npm run build
# Creates distributable in release/ directory
```

## Configuration Files

### Core Build Configuration
- **`vite.config.ts`**: Vite build configuration for renderer process
- **`postcss.config.js`**: PostCSS configuration (CommonJS format for Tailwind v3 compatibility)
- **`tailwind.config.js`**: Tailwind CSS configuration with dark mode
- **`scripts/postbuild.js`**: Post-build processing for Electron compatibility

### TypeScript Configuration
- **`tsconfig.json`**: Base TypeScript configuration with project references
- **`tsconfig.main.json`**: Main process config (CommonJS, Node.js environment)
- **`tsconfig.app.json`**: Renderer process config (ES modules, DOM environment)
- **`tsconfig.node.json`**: Node.js-specific configuration

### Code Quality & Formatting
- **`eslint.config.js`**: ESLint configuration with TypeScript and React support
- **`.prettierrc`**: Prettier formatting rules (single quotes, no semicolons, 2-space indentation)

### Build & Deployment
- **`package.json`**: Dependencies, scripts, and electron-builder configuration
- **`.github/workflows/build.yml`**: GitHub Actions CI/CD pipeline
- **`.gitignore`**: Git exclusion patterns including API keys and database files

### Development Environment
- **`README_GITHUB_ACTIONS.md`**: GitHub Actions workflow documentation
- **`keys.json`** (excluded): API keys storage (use Settings panel instead)

## Database Schema

SQLite database with the following tables:
- `users`: User preferences and settings
- `chat_sessions`: Chat session metadata (name, category, timestamps)
- `chat_messages`: Individual messages with image analysis results
- `saved_products`: User-saved products with Algolia data
- `ml_training_data`: Personalization data (excludes outlier interactions)
- `outlier_interactions`: Discovery feature interaction tracking
- `user_settings`: Application configuration (discovery mode, theme, etc.)

## IPC Communication

Complete IPC channels between main and renderer processes:

### Product Management
- `search-products`: Search Algolia for products with optional image data
- `save-product`: Save product to local database
- `get-products`: Retrieve all saved products
- `remove-product`: Delete product from database
- `update-product`: Update product details (custom name, tags)

### Chat System
- `get-chat-history`: Retrieve chat sessions
- `save-chat`: Save chat session and message

### Settings & Configuration
- `save-discovery-setting`/`get-discovery-setting`: Discovery mode configuration
- `get-api-keys`/`save-api-keys`: Secure API key management
- `get-app-version`: Application version information

### Database Management
- `get-database-path`: Current database file location
- `change-database-path`: Change database file location
- `reset-database`: Complete database reset
- `reset-ml-data`: Reset ML training data only

### System Integration
- `open-external`: Open URLs in system browser

## Technology Stack

### Core Dependencies
- **Electron 37.2.1**: Desktop application framework
- **React 18.3.1**: UI framework with hooks
- **TypeScript 5.5.3**: Type safety across all processes
- **Vite 5.4.2**: Build tool and development server
- **Tailwind CSS 3.4.1**: Utility-first CSS framework (downgraded from v4 for compatibility)

### AI/ML Integration
- **@google/generative-ai 0.24.1**: Gemini API for image analysis
- **algoliasearch 5.32.0**: Product search integration
- **@modelcontextprotocol/sdk 1.15.1**: Claude Desktop integration

### Data & Security
- **better-sqlite3 12.2.0**: Local SQLite database
- **keytar 7.9.0**: Secure credential storage
- **electron-builder 26.0.12**: Application packaging

### UI Components
- **lucide-react 0.525.0**: Icon library
- **clsx 2.1.1**: CSS class utilities

## File Structure Patterns

```
shopping-for-algolia-personalized/
├── src/
│   ├── main/           # Electron main process (Node.js)
│   │   ├── main.ts     # App entry point
│   │   └── database.ts # SQLite operations
│   ├── renderer/       # React frontend (Browser)
│   │   ├── App.tsx     # Main component
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # API services
│   │   └── types.ts    # Frontend types
│   ├── preload/        # Secure IPC bridge
│   └── shared/         # Common types
├── dist/               # Build output
├── release/            # Packaged applications
└── resources/          # App icons and assets
```

## Development Guidelines

### TypeScript Usage
- All new code must be fully typed
- Use interfaces from `src/shared/types.ts` for cross-process communication
- Strict mode enabled - no `any` types without explicit reasoning

### State Management
- Use existing custom hooks: `useTheme`, `useSettings`, `useChatSessions`
- Avoid external state management libraries
- Local storage for persistence where appropriate

### UI Patterns
- Follow existing component structure in `components/` directory
- Use Tailwind CSS classes with dark mode support
- Implement responsive design principles
- Use Lucide React icons consistently

### Security Considerations
- Context isolation is enabled - no direct Node.js access in renderer
- Use IPC channels for main process communication
- Store sensitive data through keytar, not localStorage
- Validate all user inputs, especially file uploads

## Discovery/Outlier System

The application includes a unique discovery feature:
- **Configurable Percentages**: 0%, 5%, 10% outlier content
- **Separate Tracking**: Outlier interactions don't affect ML training
- **Visual Distinction**: Clear labeling of inspiration vs. personalized products
- **Performance Optimized**: Minimal impact on search accuracy

## Testing & Debugging

### Mock Data
- Development environment provides mock products when Electron APIs unavailable
- Graceful fallback handling for network failures
- Error boundaries prevent UI crashes

### Common Issues
1. **Electron won't start**: Run `npm run build:dev` first
2. **IPC not working**: Check preload script is properly loaded
3. **Database errors**: Verify SQLite permissions and table schemas
4. **Build failures**: Clean with `npm run clean` and rebuild
5. **UI rendering issues**: Ensure Tailwind CSS v3.4.1 is installed (see Critical Fix History below)

## Integration Points

### Claude Desktop MCP
- Read-only access to personalization data
- No ML training from Claude Desktop searches
- Algolia search integration without image analysis
- Export format compatible with other AI tools

### Gemini API
- Image analysis for product recognition
- JSON-formatted responses for search optimization
- Rate limiting and error handling implemented
- Fallback to text-only search when unavailable

This codebase follows a sophisticated architecture designed for AI-powered personalized shopping with cross-platform compatibility and external AI tool integration.

## CI/CD Pipeline

### GitHub Actions Workflow
The project includes automated CI/CD via `.github/workflows/build.yml`:

**Triggers:**
- Push to main branch
- Version tags (v*.*.*)
- Manual workflow dispatch

**Build Process:**
- Node.js 20 environment setup
- Tailwind CSS v3 compatibility enforcement
- Full TypeScript compilation and type checking
- Electron application packaging for Windows
- Artifact generation with 7-day retention
- Automated GitHub releases for tagged versions

**Key Features:**
- Cross-platform support ready (Windows configured, macOS/Linux available)
- Native module handling (`better-sqlite3`, `keytar`)
- Secure environment variable management
- Build artifact optimization

### Build Pipeline Details
1. **Development Build**: `npm run build:dev` → `npm run electron:dev`
2. **Production Build**: `npm run build` → Creates distributable in `release/`
3. **CI Build**: GitHub Actions → Automated packaging and release

### Deployment Strategy
- **Development**: Local Electron app testing
- **Staging**: GitHub Actions build artifacts
- **Production**: GitHub releases with downloadable executables

## Code Quality Standards

### Linting & Formatting
- **ESLint**: TypeScript and React best practices enforcement
- **Prettier**: Consistent code formatting (single quotes, no semicolons)
- **TypeScript**: Strict mode enabled across all processes

### Git Workflow
- Feature branch development recommended
- CI builds must pass before merging
- Version tags trigger automated releases
- Database files and API keys excluded from commits

## Critical Fix History

### 2025-07-16: UI Rendering and Dark Mode Fix
**Problem**: GitHub Actions builds resulted in completely broken UI with collapsed layouts, missing styles, and non-functional dark mode.

**Root Cause**: Tailwind CSS v4.1.11 compatibility issues causing CSS generation failures:
- `bg-slate-50` and other slate color classes were not recognized
- `@tailwindcss/postcss` plugin was incompatible with the build process
- Dark mode styles were not being generated

**Solution Applied**:
1. **Downgraded Tailwind CSS**: v4.1.11 → v3.4.1 (matching `project/` directory)
2. **Updated PostCSS configuration**: 
   - Removed `@tailwindcss/postcss` plugin
   - Used standard `tailwindcss` plugin in `postcss.config.js`
3. **GitHub Actions fix**: Added compatibility step to ensure v3 installation
4. **Verified CSS generation**: Confirmed Tailwind styles are properly inlined in JS

**Files Modified**:
- `package.json`: Updated tailwindcss version, removed @tailwindcss/postcss
- `postcss.config.js`: Changed from ESM to CJS format with standard plugin
- `.github/workflows/build.yml`: Added Tailwind v3 compatibility step
- `package-lock.json`: Updated dependency tree

**Result**: 
- ✅ UI layouts render correctly
- ✅ Dark mode functionality restored
- ✅ All Tailwind classes (including bg-slate-*) work properly
- ✅ GitHub Actions builds produce functional Windows executables

### Important Notes for Future Development
- **Always use Tailwind CSS v3.4.1** - Do not upgrade to v4 until full compatibility is confirmed
- **Keep postcss.config.js in CJS format** - ESM format causes build issues
- **Test both local and GitHub Actions builds** before major releases
- **Reference `project/` directory** for known working configurations

### 2025-07-16: Comprehensive UI/UX Fixes and Feature Enhancements
**Problem**: Multiple UI/UX issues reported by user:
1. Image upload TypeError causing console errors and non-functional image chat
2. My Database page showing "Failed to load resource" errors with broken operations
3. Discovery settings UI placement needed improvement
4. Font size settings not applying to chat messages
5. Unwanted Database Statistics component
6. Settings panel missing essential features

**Root Cause Analysis**:
1. **Image Upload**: `createObjectURL` TypeError from data type mismatch between ChatInput and App components
2. **Database Errors**: Missing IPC channels for product operations, placeholder URLs causing 404s
3. **Discovery UI**: Discovery percentage controls separated from main toggle
4. **Font Size**: Missing CSS class application in ChatMessage component
5. **UI Organization**: Unnecessary Database Statistics cluttering navigation
6. **Settings Limitations**: Missing API key management and database controls

**Solution Applied**:
1. **Image Upload System Overhaul**:
   - Fixed data flow: ChatInput → App (data URL format)
   - Implemented Gemini API-compatible mock image analysis
   - Added category-based product suggestions (fashion, electronics, home)
   - Proper error handling and fallback mechanisms

2. **Database Integration Enhancement**:
   - Added 3 new IPC channels: `get-products`, `remove-product`, `get-app-version`
   - Implemented real-time database synchronization
   - Added loading states and error handling
   - Fixed product removal functionality

3. **Discovery Settings UI Redesign**:
   - Moved Discovery percentage controls inline with Mode toggle
   - Added persistent settings via Electron API
   - Seamless integration with existing chat interface
   - Clean, intuitive UI with proper spacing

4. **Font Size Application Fix**:
   - Applied fontSizeClasses to ChatMessage content
   - Maintained consistent typography scaling
   - Proper accessibility support

5. **Settings Panel Expansion**:
   - Added database location display and change functionality
   - Implemented secure API key management (Gemini + Algolia)
   - Database reset and ML data cleanup capabilities
   - Modern sectioned UI with proper visual hierarchy

6. **Code Cleanup**:
   - Removed DatabaseStatsPanel component entirely
   - Cleaned up orphaned imports and navigation references
   - Streamlined Sidebar structure

**Files Modified**:
- `src/main/main.ts`: Added 3 new IPC handlers
- `src/main/database.ts`: Added removeProduct method
- `src/preload/index.ts`: Added new IPC channel exposures
- `src/renderer/App.tsx`: Major refactor for image handling and discovery state
- `src/renderer/components/ChatContainer.tsx`: Added product results display
- `src/renderer/components/ChatInput.tsx`: Integrated Discovery settings inline
- `src/renderer/components/ChatMessage.tsx`: Fixed font size application
- `src/renderer/components/MyDatabase.tsx`: Added database integration
- `src/renderer/components/SettingsPanel.tsx`: Major expansion with new features
- `src/renderer/components/Sidebar.tsx`: Removed Database Statistics
- `src/renderer/components/DatabaseStatsPanel.tsx`: DELETED

**Technical Improvements**:
- Bundle size: 261.66 kB (gzip: 70.27 kB)
- Build time: 13.83s
- Zero TypeScript compilation errors
- Enhanced IPC communication architecture
- Improved type safety across all components

**Result**: 
- ✅ Image upload fully functional with mock AI analysis
- ✅ My Database page working with real-time data
- ✅ Discovery settings elegantly integrated
- ✅ Font size changes properly applied
- ✅ Settings panel with comprehensive management features
- ✅ Clean, streamlined navigation structure

### Emergency Recovery Commands
If UI issues reoccur:
```bash
# Quick fix for Tailwind CSS issues
npm uninstall @tailwindcss/postcss --force
npm install tailwindcss@3.4.1 --save-dev --force
echo "module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };" > postcss.config.js
npm run build:all
```

## Quick Reference

### Essential Commands for New Developers
```bash
# Clone and setup
git clone <repository-url>
cd shopping-for-algolia-personalized
npm install

# Start development
npm run dev  # Hot reload development (renderer only)
# OR
npm run build:dev && npm run electron:dev  # Full Electron app

# Before committing
npm run lint && npm run type-check

# Production build
npm run build
```

### Environment Setup Checklist
- [ ] Node.js 20+ installed
- [ ] Git configured with SSH keys
- [ ] API keys configured via Settings panel (not environment files)
- [ ] Database permissions verified (SQLite write access)
- [ ] Tailwind CSS v3.4.1 confirmed in package.json

### Project Context
This is a **multi-directory workspace**:
- **Primary**: `/shopping-for-algolia-personalized/` (main Electron app)
- **Secondary**: `/project/` (additional React app)
- **Backup**: `/shopping-backup/` (legacy version)

Always work in the primary project directory unless specifically instructed otherwise.

## Project-Specific Patterns and Conventions

### Component Organization
Components are organized by feature rather than type:
- Chat-related components in `/components/` (flat structure)
- Shared utilities in `/hooks/` and `/services/`
- All components use TypeScript with proper interfaces

### IPC Communication Patterns
All IPC communication follows a request-response pattern:
- Main process handlers return promises
- Renderer uses `window.electronAPI` for type-safe communication
- Error handling implemented at both process levels

### Database Design Philosophy
- SQLite used for local-first approach
- Separate tables for ML training data vs. outlier interactions
- Database schema designed for future MCP integration

### Discovery System Implementation
The unique "outlier" system is implemented as:
- UI controls in chat interface for immediate feedback
- Separate data tracking (not mixed with personalization)
- Clear visual distinction between types of recommendations

### State Management Approach
Custom hooks pattern instead of external state management:
- `useTheme` for theme persistence
- `useSettings` for app configuration
- `useChatSessions` for chat history management
- Local storage used selectively for UI preferences

### Build System Specifics
- Vite for renderer process (fast dev server)
- TypeScript compilation for main process
- Electron-builder for cross-platform packaging
- GitHub Actions for automated CI/CD

### Security Implementation
- Context isolation enabled for security
- Keytar for secure credential storage
- No direct Node.js access from renderer
- All file system operations through IPC

This documentation reflects the current state as of the critical fixes implemented on 2025-07-16.

## Current Development Status (2025-07-16)

### **Phase A & B Completed ✅**
- **Phase A**: Environment setup and project foundation - **COMPLETED**
- **Phase B**: Prototype development with full UI/UX - **COMPLETED**
- **Phase C**: AI integration (Gemini API, MCP) - **IN DEVELOPMENT** (branch: phase-c-ai-integration)

### **Current Branch**: `phase-c-ai-integration`
All Phase C AI integration features are being developed in the dedicated branch.

## API Configuration Requirements

### **IMPORTANT: User-Provided API Keys Required**

This application requires users to provide their own API keys for full functionality:

#### **1. Gemini API (Google)**
- **Purpose**: Image analysis for product recognition
- **Required for**: Photo upload and AI-powered product search
- **How to get**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Configuration**: Settings panel → API Keys → Enter Gemini API key
- **Storage**: Securely stored using Electron's keytar (OS keychain)

#### **2. Algolia Search API**
- **Purpose**: Product search and discovery
- **Required for**: Product search functionality
- **How to get**: Create account at [Algolia.com](https://www.algolia.com/)
- **Configuration**: Settings panel → API Keys → Enter Algolia Application ID and Search API Key
- **Default**: Currently uses demo API with Best Buy dataset (limited functionality)

#### **3. API Key Management**
- **Location**: Settings panel → API Keys section
- **Security**: Keys are encrypted and stored in OS keychain via keytar
- **Validation**: Built-in API connection testing
- **Fallback**: Application provides mock/demo functionality when APIs are not configured

### **Development vs Production API Usage**

#### **Development Mode**
- **Gemini API**: Mock image analysis with predefined responses
- **Algolia**: Demo API with Best Buy dataset (no key required)
- **Functionality**: Full UI/UX testing without API keys

#### **Production Mode** 
- **Gemini API**: Real image analysis (requires user API key)
- **Algolia**: Full search functionality (requires user API key)
- **Enhanced Features**: Personalization, ML training, advanced search

### **API Setup Instructions for End Users**

1. **Launch the application**
2. **Navigate to Settings** (gear icon in sidebar)
3. **Go to API Keys section**
4. **Enter your API keys**:
   - Gemini API Key (from Google AI Studio)
   - Algolia Application ID and Search API Key
5. **Test connections** using the built-in validation
6. **Restart application** for full functionality

### **For Developers**

```bash
# Development without API keys (uses mocks)
npm run dev

# Test with real API keys
# 1. Set up keys in Settings panel
# 2. Restart application
npm run electron:dev
```

This documentation reflects the current state as of Phase C development start on 2025-07-16.