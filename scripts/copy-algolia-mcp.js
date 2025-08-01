#!/usr/bin/env node
/**
 * Script to copy official Algolia MCP Server source files
 * This ensures we're using the actual official implementation
 */

const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '..', 'AIgolia-mcp-node-main');
const targetDir = path.join(__dirname, '..', 'resources', 'algolia-mcp', 'algolia-mcp-source');

async function copyAlgoliaMcpSource() {
  console.log('Copying official Algolia MCP Server source files...');
  
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Warning: Algolia MCP Server source not found at ${sourceDir}`);
    console.warn('This is expected for non-Windows builds or when using pre-built binaries.');
    console.log('Skipping Algolia MCP source copy.');
    return; // Exit gracefully without error
  }
  
  try {
    // Ensure target directory exists
    await fs.ensureDir(targetDir);
    
    // Copy essential directories and files
    const itemsToCopy = [
      'src',
      'package.json',
      'tsconfig.json',
      'LICENSE',
      'README.md'
    ];
    
    for (const item of itemsToCopy) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      
      if (fs.existsSync(sourcePath)) {
        await fs.copy(sourcePath, targetPath, {
          overwrite: true,
          filter: (src) => {
            // Skip test files and dev dependencies
            return !src.includes('.test.') && 
                   !src.includes('__tests__') &&
                   !src.includes('.spec.');
          }
        });
        console.log(`Copied ${item}`);
      } else {
        console.warn(`Warning: ${item} not found in source directory`);
      }
    }
    
    // Create a minimal package.json for the bundled version
    const originalPackageJson = await fs.readJson(path.join(sourceDir, 'package.json'));
    const minimalPackageJson = {
      name: originalPackageJson.name,
      version: originalPackageJson.version,
      type: 'module',
      dependencies: originalPackageJson.dependencies,
      engines: originalPackageJson.engines
    };
    
    await fs.writeJson(
      path.join(targetDir, 'package.json'), 
      minimalPackageJson, 
      { spaces: 2 }
    );
    
    // Copy node_modules if it exists
    const nodeModulesSource = path.join(sourceDir, 'node_modules');
    const nodeModulesTarget = path.join(targetDir, 'node_modules');
    
    if (fs.existsSync(nodeModulesSource)) {
      console.log('Copying node_modules...');
      await fs.copy(nodeModulesSource, nodeModulesTarget, {
        overwrite: true,
        filter: (src) => {
          // Skip development dependencies and unnecessary files
          const relativePath = path.relative(nodeModulesSource, src);
          if (relativePath.includes('.bin') || 
              relativePath.includes('@types') || 
              relativePath.includes('@eslint') ||
              relativePath.includes('@vitest') ||
              relativePath.includes('eslint') ||
              relativePath.includes('vitest') ||
              relativePath.includes('typescript')) {
            return false;
          }
          return true;
        }
      });
      console.log('Copied node_modules (production dependencies only)');
    } else {
      console.warn('Warning: node_modules not found in source directory');
      console.warn('Make sure to run "npm install" in the Algolia MCP Server directory first');
    }
    
    console.log('Official Algolia MCP Server source copied successfully!');
    console.log(`Target directory: ${targetDir}`);
    
  } catch (error) {
    console.error('Error copying Algolia MCP Server source:', error);
    process.exit(1);
  }
}

// Run the copy operation
copyAlgoliaMcpSource();