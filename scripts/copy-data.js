const fs = require('fs-extra');
const path = require('path');

console.log('Copying data files to dist directory...');

// src/data を dist/data にコピー
const srcPath = path.join(__dirname, '../src/data');
const destPath = path.join(__dirname, '../dist/data');

// ディレクトリが存在するか確認
if (!fs.existsSync(srcPath)) {
  console.error('Source data directory not found:', srcPath);
  console.log('Creating empty data directory...');
  fs.ensureDirSync(srcPath);
}

// コピー先ディレクトリを作成
fs.ensureDirSync(destPath);

// データファイルをコピー
try {
  fs.copySync(srcPath, destPath, { overwrite: true });
  console.log('Data files copied successfully to:', destPath);
  
  // コピーされたファイルを確認
  const copiedFiles = fs.readdirSync(destPath);
  console.log('Copied files:', copiedFiles.join(', '));
  
  // ファイルサイズを表示
  copiedFiles.forEach(file => {
    const filePath = path.join(destPath, file);
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  - ${file}: ${sizeInMB}MB`);
  });
} catch (error) {
  console.error('Error copying data files:', error);
  process.exit(1);
}