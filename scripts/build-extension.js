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
    
    // Copy dist/main directory
    const distMainSrc = path.join(distDir, 'main');
    const distMainDest = path.join(buildDir, 'dist', 'main');
    if (fs.existsSync(distMainSrc)) {
      fs.copySync(distMainSrc, distMainDest);
      console.log('Copied dist/main directory');
    } else {
      console.error('Error: dist/main directory not found. Please run build:all first.');
      process.exit(1);
    }
    
    // Copy only required node_modules
    const requiredModules = [
      '@modelcontextprotocol',
      'better-sqlite3',
      'keytar',
      'ajv',
      'zod'
    ];
    
    const nodeModulesSrc = path.join(rootDir, 'node_modules');
    const nodeModulesDest = path.join(buildDir, 'node_modules');
    fs.ensureDirSync(nodeModulesDest);
    
    for (const moduleName of requiredModules) {
      const moduleSrc = path.join(nodeModulesSrc, moduleName);
      const moduleDest = path.join(nodeModulesDest, moduleName);
      
      if (fs.existsSync(moduleSrc)) {
        fs.copySync(moduleSrc, moduleDest);
        console.log(`Copied node_modules/${moduleName}`);
      }
    }
    
    // Copy better-sqlite3 bindings
    const bindingSrc = path.join(nodeModulesSrc, 'better-sqlite3/build/Release/better_sqlite3.node');
    const bindingDest = path.join(nodeModulesDest, 'better-sqlite3/build/Release/better_sqlite3.node');
    if (fs.existsSync(bindingSrc)) {
      fs.ensureDirSync(path.dirname(bindingDest));
      fs.copyFileSync(bindingSrc, bindingDest);
      console.log('Copied better-sqlite3 native bindings');
    }
    
    // Copy keytar bindings
    const keytarSrc = path.join(nodeModulesSrc, 'keytar/build/Release/keytar.node');
    const keytarDest = path.join(nodeModulesDest, 'keytar/build/Release/keytar.node');
    if (fs.existsSync(keytarSrc)) {
      fs.ensureDirSync(path.dirname(keytarDest));
      fs.copyFileSync(keytarSrc, keytarDest);
      console.log('Copied keytar native bindings');
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