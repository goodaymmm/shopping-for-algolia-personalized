# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Phase C AI Integration

### Added
- Comprehensive logging throughout Gemini API integration
- Enhanced error handling with detailed error messages
- Troubleshooting guide in documentation
- README.md with setup instructions
- GitHub Actions workflow optimizations

### Fixed
- **Critical**: Gemini API module not found in production builds
  - Moved `@google/generative-ai` from devDependencies to dependencies
  - Fixed package import from `@google/genai` to `@google/generative-ai`
  - Corrected API initialization: `new GoogleGenerativeAI(apiKey)`
  - Updated API calls to use `getGenerativeModel()` method
  - Fixed response handling to use `response.response.text()`
- Converted Japanese prompts to English as per specifications
- Enhanced database API key operations with logging

### Changed
- Updated CLAUDE.md with recent fixes and troubleshooting guide
- Improved error messages for better debugging

### Technical Details

#### Gemini API Integration (2025-07-18)
- **Issue**: Production builds failed with module not found error
- **Root Cause**: Package in wrong dependency section
- **Files Modified**:
  - `package.json` - Dependency management
  - `src/main/gemini-service.ts` - API implementation
  - `src/renderer/services/gemini.ts` - Frontend service
  - `src/main/main.ts` - IPC handlers
  - `src/main/database.ts` - Storage operations

#### GitHub Actions Optimization
- **Issue**: Artifact storage quota exceeded (500MB limit)
- **Solutions**:
  - Documentation for manual artifact cleanup
  - Recommendations for retention period reduction
  - Workflow optimization strategies

## [1.0.0] - 2025-07-16

### Phase B Completed
- Full UI/UX implementation
- Chat interface with image upload
- Database integration
- Settings panel with API key management
- Discovery mode implementation
- Theme system (light/dark mode)

### Phase A Completed
- Initial project setup
- Electron + React + TypeScript foundation
- Basic project structure