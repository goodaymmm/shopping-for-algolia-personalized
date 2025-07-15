const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Running post-build script...');

// Find the generated JS file
const jsFiles = glob.sync('dist/renderer/assets/main-*.js');
if (jsFiles.length === 0) {
  console.error('No main JS file found!');
  process.exit(1);
}

const jsFile = path.basename(jsFiles[0]);
console.log('Found JS file:', jsFile);

// Read and modify index.html
const htmlPath = path.join(__dirname, '../dist/renderer/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove any existing script tags and add our own
html = html.replace(/<script[^>]*><\/script>/g, '');
html = html.replace('</body>', `  <script src="./assets/${jsFile}" defer></script>\n</body>`);

// Write the modified HTML
fs.writeFileSync(htmlPath, html);
console.log('Updated index.html with script tag');