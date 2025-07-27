const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

console.log('Building Desktop Extension (.dxt)...');

const rootDir = path.join(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');

// Ensure directories exist
fs.ensureDirSync(extensionDir);
fs.ensureDirSync(releaseDir);

// Create a temporary build directory
const buildDir = path.join(extensionDir, 'build');
fs.ensureDirSync(buildDir);

async function buildExtension() {
  try {
    // Clean build directory
    fs.emptyDirSync(buildDir);
    
    // Copy manifest.json
    const manifestSrc = path.join(extensionDir, 'manifest.json');
    const manifestDest = path.join(buildDir, 'manifest.json');
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('Copied manifest.json');
    
    // Copy icon if exists
    const iconSrc = path.join(extensionDir, 'icon.png');
    if (fs.existsSync(iconSrc)) {
      const iconDest = path.join(buildDir, 'icon.png');
      fs.copyFileSync(iconSrc, iconDest);
      console.log('Copied icon.png');
    }
    
    // Create server directory and copy the simplified server
    const serverDir = path.join(buildDir, 'server');
    fs.ensureDirSync(serverDir);
    
    // Copy mcp-minimal.js as index.js
    const minimalSrcPath = path.join(rootDir, 'src', 'main', 'mcp-minimal.js');
    const serverDestPath = path.join(serverDir, 'index.js');
    if (fs.existsSync(minimalSrcPath)) {
      // Copy the minimal server without modifications
      fs.copyFileSync(minimalSrcPath, serverDestPath);
      console.log('Created server/index.js from mcp-minimal.js');
    } else {
      console.error('Error: mcp-minimal.js not found.');
      process.exit(1);
    }
    
    // Create lib directory and copy dependencies
    const libDir = path.join(buildDir, 'lib');
    fs.ensureDirSync(libDir);
    
    // Copy MCP versions of database and personalization modules
    const distMainSrc = path.join(distDir, 'main');
    if (fs.existsSync(distMainSrc)) {
      // Copy database-mcp.js as database.js
      const dbMcpSrc = path.join(distMainSrc, 'database-mcp.js');
      const dbDest = path.join(libDir, 'database.js');
      if (fs.existsSync(dbMcpSrc)) {
        fs.copyFileSync(dbMcpSrc, dbDest);
        console.log('Copied database-mcp.js as database.js to lib/');
      } else {
        // Fallback to regular database.js if MCP version not found
        const dbSrc = path.join(distMainSrc, 'database.js');
        if (fs.existsSync(dbSrc)) {
          fs.copyFileSync(dbSrc, dbDest);
          console.log('Warning: database-mcp.js not found, copied regular database.js');
        }
      }
      
      // Copy personalization-mcp.js as personalization.js
      const persMcpSrc = path.join(distMainSrc, 'personalization-mcp.js');
      const persDest = path.join(libDir, 'personalization.js');
      if (fs.existsSync(persMcpSrc)) {
        fs.copyFileSync(persMcpSrc, persDest);
        console.log('Copied personalization-mcp.js as personalization.js to lib/');
      } else {
        // Fallback to regular personalization.js if MCP version not found
        const persSrc = path.join(distMainSrc, 'personalization.js');
        if (fs.existsSync(persSrc)) {
          fs.copyFileSync(persSrc, persDest);
          console.log('Warning: personalization-mcp.js not found, copied regular personalization.js');
        }
      }
    } else {
      console.error('Error: dist/main directory not found. Please run build:all first.');
      process.exit(1);
    }
    
    // Copy Algolia MCP Server executable
    const algoliaMcpDir = path.join(buildDir, 'resources', 'algolia-mcp');
    fs.ensureDirSync(algoliaMcpDir);
    
    const platform = process.platform;
    let algoliaMcpSrc, algoliaMcpDest;
    
    if (platform === 'win32') {
      // Copy Windows wrapper files
      const windowsFiles = ['algolia-mcp.bat', 'algolia-mcp-windows.js'];
      windowsFiles.forEach(file => {
        const src = path.join(rootDir, 'resources', 'algolia-mcp', file);
        const dest = path.join(algoliaMcpDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} to resources/algolia-mcp/`);
        }
      });
      
      // Copy official Algolia MCP Server source
      const officialMcpSrc = path.join(rootDir, '..', 'AIgolia-mcp-node-main');
      const officialMcpDest = path.join(algoliaMcpDir, 'algolia-mcp-source');
      
      if (fs.existsSync(officialMcpSrc)) {
        fs.ensureDirSync(officialMcpDest);
        
        // Copy essential directories
        const itemsToCopy = ['src', 'package.json', 'tsconfig.json'];
        itemsToCopy.forEach(item => {
          const srcPath = path.join(officialMcpSrc, item);
          const destPath = path.join(officialMcpDest, item);
          if (fs.existsSync(srcPath)) {
            fs.copySync(srcPath, destPath, {
              filter: (src) => !src.includes('.test.') && !src.includes('__tests__')
            });
          }
        });
        
        console.log('Copied official Algolia MCP Server source for Windows');
      } else {
        console.warn('Warning: Official Algolia MCP Server source not found');
        console.warn('Windows users will need to ensure Node.js 22+ is installed');
      }
    } else {
      // macOS and Linux
      algoliaMcpSrc = path.join(rootDir, 'resources', 'algolia-mcp', 'algolia-mcp');
      algoliaMcpDest = path.join(algoliaMcpDir, 'algolia-mcp');
      
      if (fs.existsSync(algoliaMcpSrc)) {
        fs.copyFileSync(algoliaMcpSrc, algoliaMcpDest);
        console.log(`Copied Algolia MCP Server to resources/algolia-mcp/`);
        fs.chmodSync(algoliaMcpDest, '755');
      } else {
        console.warn('Warning: Algolia MCP Server executable not found for', platform);
        console.warn('Download it from: https://github.com/algolia/mcp-node/releases');
      }
    }
    
    // Copy only required node_modules
    const requiredModules = [
      '@modelcontextprotocol',
      // 'better-sqlite3', // Skipped due to binary compatibility issues
      'zod',
      'zod-to-json-schema',
      'ajv',
      'uri-js',
      'fast-deep-equal',
      'fast-json-stable-stringify',
      'json-schema-traverse'
    ];
    
    const nodeModulesSrc = path.join(rootDir, 'node_modules');
    const nodeModulesDest = path.join(buildDir, 'node_modules');
    fs.ensureDirSync(nodeModulesDest);
    
    // Copy required modules and their dependencies
    const copiedModules = new Set();
    
    function copyModuleWithDeps(moduleName, baseDir = nodeModulesSrc) {
      if (copiedModules.has(moduleName)) return;
      copiedModules.add(moduleName);
      
      // Skip better-sqlite3 entirely to avoid binary compatibility issues
      if (moduleName === 'better-sqlite3') {
        console.log(`Skipping ${moduleName} to avoid binary compatibility issues`);
        return;
      }
      
      const moduleSrc = path.join(baseDir, moduleName);
      const moduleDest = path.join(nodeModulesDest, moduleName);
      
      if (fs.existsSync(moduleSrc)) {
        fs.copySync(moduleSrc, moduleDest);
        console.log(`Copied node_modules/${moduleName}`);
        
        // Check for dependencies
        const packageJsonPath = path.join(moduleSrc, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const deps = Object.keys(packageJson.dependencies || {});
            deps.forEach(dep => copyModuleWithDeps(dep));
          } catch (e) {
            // Ignore errors reading package.json
          }
        }
      }
    }
    
    for (const moduleName of requiredModules) {
      copyModuleWithDeps(moduleName);
    }
    
    // Skip copying better-sqlite3 bindings to avoid compatibility issues
    console.log('Skipping better-sqlite3 native bindings - will use fallback mode');
    
    
    // Create .dxt file (ZIP archive)
    const outputPath = path.join(releaseDir, 'shopping-for-algolia-personalized.dxt');
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      console.log(`Desktop Extension created: ${outputPath}`);
      console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      
      // Clean up build directory
      fs.removeSync(buildDir);
      console.log('Build directory cleaned up');
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    // Add all files from build directory
    archive.directory(buildDir, false);
    
    // Finalize the archive
    await archive.finalize();
    
  } catch (error) {
    console.error('Error building extension:', error);
    process.exit(1);
  }
}

// Check if archiver is installed
try {
  require.resolve('archiver');
} catch (e) {
  console.error('archiver package not found. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install --save-dev archiver', { stdio: 'inherit' });
}

// Run the build
buildExtension();