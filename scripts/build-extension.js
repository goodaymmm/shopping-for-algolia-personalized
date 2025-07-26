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
    
    // Copy database.js and personalization.js from dist/main
    const distMainSrc = path.join(distDir, 'main');
    if (fs.existsSync(distMainSrc)) {
      const deps = ['database.js', 'personalization.js'];
      for (const dep of deps) {
        const srcPath = path.join(distMainSrc, dep);
        const destPath = path.join(libDir, dep);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied ${dep} to lib/`);
        }
      }
    } else {
      console.error('Error: dist/main directory not found. Please run build:all first.');
      process.exit(1);
    }
    
    // Copy only required node_modules
    const requiredModules = [
      '@modelcontextprotocol',
      'better-sqlite3',
      'zod'
    ];
    
    const nodeModulesSrc = path.join(rootDir, 'node_modules');
    const nodeModulesDest = path.join(buildDir, 'node_modules');
    fs.ensureDirSync(nodeModulesDest);
    
    // Copy required modules and their dependencies
    const copiedModules = new Set();
    
    function copyModuleWithDeps(moduleName, baseDir = nodeModulesSrc) {
      if (copiedModules.has(moduleName)) return;
      copiedModules.add(moduleName);
      
      const moduleSrc = path.join(baseDir, moduleName);
      const moduleDest = path.join(nodeModulesDest, moduleName);
      
      if (fs.existsSync(moduleSrc)) {
        // Copy module with filtering for better-sqlite3
        const filter = (src) => {
          // Skip problematic files in better-sqlite3
          if (moduleName === 'better-sqlite3') {
            const relativePath = path.relative(moduleSrc, src);
            // Skip build tools and python scripts
            if (relativePath.includes('node_gyp_bins') || 
                relativePath.includes('deps') ||
                relativePath.includes('.github') ||
                relativePath.endsWith('.md') ||
                relativePath.endsWith('.txt')) {
              return false;
            }
          }
          return true;
        };
        
        fs.copySync(moduleSrc, moduleDest, { filter });
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
    
    // Copy better-sqlite3 bindings
    const bindingSrc = path.join(nodeModulesSrc, 'better-sqlite3/build/Release/better_sqlite3.node');
    const bindingDest = path.join(nodeModulesDest, 'better-sqlite3/build/Release/better_sqlite3.node');
    if (fs.existsSync(bindingSrc)) {
      fs.ensureDirSync(path.dirname(bindingDest));
      fs.copyFileSync(bindingSrc, bindingDest);
      console.log('Copied better-sqlite3 native bindings');
    }
    
    
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