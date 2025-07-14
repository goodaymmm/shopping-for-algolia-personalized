# GitHub Actions Build Guide

This project uses GitHub Actions to build native Electron applications for Windows, macOS, and Linux.

## Why GitHub Actions?

Building Electron apps with native modules (like `better-sqlite3`) requires compiling on the target platform. GitHub Actions provides free CI/CD that runs on actual Windows, macOS, and Linux machines, ensuring proper native module compilation.

## How to Use

### 1. Push to GitHub

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

### 2. Monitor Build

1. Go to your GitHub repository
2. Click on the "Actions" tab
3. Watch the build progress

### 3. Download Artifacts

Once the build completes:

1. Click on the completed workflow run
2. Scroll down to "Artifacts"
3. Download the build for your platform:
   - `windows-build` - Contains .exe installer
   - `linux-build` - Contains .AppImage
   - `macos-build` - Contains .dmg installer

### Manual Trigger

You can also trigger builds manually:

1. Go to Actions tab
2. Select "Build Electron App"
3. Click "Run workflow"
4. Choose branch and click "Run workflow"

## Automatic Releases

When you create a version tag, the workflow automatically creates a GitHub Release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will:
1. Build for all platforms
2. Create a new GitHub Release
3. Upload all installers to the release

## Build Configuration

The workflow is configured in `.github/workflows/build.yml` and:

- Uses Node.js 20.x
- Builds on latest versions of Windows, Ubuntu, and macOS
- Uploads artifacts that are retained for 7 days
- Automatically creates releases for version tags

## Troubleshooting

### Build Failures

- Check the Actions tab for error logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles locally with `npm run build:dev`

### Native Module Issues

The workflow handles native modules automatically by:
- Running `npm ci` to install dependencies
- Using `npmRebuild: true` in electron-builder config
- Building on the actual target platform

## Local Development

Continue using WSL/Linux/Mac for development. GitHub Actions handles platform-specific builds automatically.