#!/usr/bin/env node
/**
 * Build check - ensures extension is ready for packaging
 */

const fs = require('fs');
const path = require('path');

console.log('📦 Checking build readiness...\n');

const errors = [];
const warnings = [];
const info = [];

// Calculate total size
function getDirectorySize(dirPath) {
  let totalSize = 0;
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // Skip node_modules, .git, tests for size calculation
      if (!['node_modules', '.git', 'tests'].includes(item)) {
        totalSize += getDirectorySize(itemPath);
      }
    } else {
      totalSize += stats.size;
    }
  });

  return totalSize;
}

// Check file sizes
console.log('📏 Checking file sizes...');
const rootDir = path.join(__dirname, '..');
const filesToCheck = [
  'content.js',
  'config.js',
  'styles.css',
  'src/constants.js',
  'src/utils.js',
  'src/storage.js',
  'src/menu.js',
  'src/settings.js',
  'src/star.js'
];

let totalJsSize = 0;
filesToCheck.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    totalJsSize += size;
    console.log(`  ${file}: ${(size / 1024).toFixed(2)} KB`);

    if (size > 100000) {
      warnings.push(`${file} is quite large (${(size / 1024).toFixed(2)} KB)`);
    }
  }
});

console.log(`  Total JS/CSS: ${(totalJsSize / 1024).toFixed(2)} KB`);

// Check for missing icons
console.log('\n🎨 Checking assets...');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const iconSizes = ['16', '48', '128'];

iconSizes.forEach(size => {
  const iconFile = `icon${size}.png`;
  if (!fs.existsSync(path.join(rootDir, iconFile))) {
    warnings.push(`Missing icon: ${iconFile}`);
  } else {
    const iconSize = fs.statSync(path.join(rootDir, iconFile)).size;
    console.log(`  icon${size}.png: ${(iconSize / 1024).toFixed(2)} KB`);
  }
});

// Check for development files that shouldn't be in production
console.log('\n🧹 Checking for development artifacts...');
const devFiles = [
  '.eslintrc.json',
  '.prettierrc.json',
  'package.json',
  'package-lock.json',
  'node_modules',
  '.git'
];

devFiles.forEach(file => {
  if (fs.existsSync(path.join(rootDir, file))) {
    info.push(`Development file present: ${file} (exclude from distribution)`);
  }
});

// Check manifest version
console.log('\n📋 Checking manifest...');
console.log(`  Name: ${manifest.name}`);
console.log(`  Version: ${manifest.version}`);
console.log(`  Manifest Version: ${manifest.manifest_version}`);

if (manifest.manifest_version !== 3) {
  errors.push('Must use Manifest V3');
}

// Estimate final extension size
const extensionSize = getDirectorySize(rootDir);
console.log(`\n📊 Total extension size: ${(extensionSize / 1024).toFixed(2)} KB`);

if (extensionSize > 5 * 1024 * 1024) {
  warnings.push('Extension size exceeds 5 MB');
} else if (extensionSize > 1 * 1024 * 1024) {
  info.push('Extension size is over 1 MB');
}

// Check for common issues
console.log('\n🔍 Checking for common issues...');

// Check for console.log in production code (should use log function)
filesToCheck.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const consoleMatches = content.match(/console\.(log|warn|error)/g);
    if (consoleMatches && !file.includes('utils.js')) {
      // utils.js is allowed since it has the log function
      warnings.push(`${file} contains ${consoleMatches.length} console statements`);
    }
  }
});

// Distribution recommendations
console.log('\n📦 Distribution recommendations:');
console.log('  • Exclude: node_modules/, tests/, .git/, .eslintrc.json, .prettierrc.json');
console.log('  • Exclude: package.json, package-lock.json, *.md files');
console.log('  • Include: src/, manifest.json, config.js, content.js, styles.css, icons');

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Build Check Summary\n');

if (errors.length > 0) {
  console.log(`❌ ${errors.length} error(s):\n`);
  errors.forEach(err => console.log(`  • ${err}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
  warnings.forEach(warn => console.log(`  • ${warn}`));
}

if (info.length > 0) {
  console.log(`\nℹ️  ${info.length} info item(s):\n`);
  info.forEach(i => console.log(`  • ${i}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Extension is ready for packaging!');
}

console.log('\n' + '='.repeat(50));
process.exit(errors.length > 0 ? 1 : 0);
