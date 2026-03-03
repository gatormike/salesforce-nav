#!/usr/bin/env node
/**
 * Validation script for Salesforce Setup Navigator
 * Checks manifest, config, and file structure
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

console.log('🔍 Validating Salesforce Setup Navigator...\n');

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

// Read JSON file
function readJSON(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    errors.push(`Failed to read ${filePath}: ${err.message}`);
    return null;
  }
}

// 1. Check required files
console.log('📁 Checking required files...');
const requiredFiles = [
  'manifest.json',
  'config.js',
  'content.js',
  'styles.css',
  'src/constants.js',
  'src/utils.js',
  'src/storage.js',
  'src/menu.js',
  'src/settings.js',
  'src/star.js'
];

requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    errors.push(`Missing required file: ${file}`);
  } else {
    console.log(`  ✓ ${file}`);
  }
});

// 2. Validate manifest.json
console.log('\n📋 Validating manifest.json...');
const manifest = readJSON('manifest.json');
if (manifest) {
  // Check version
  if (!manifest.manifest_version || manifest.manifest_version !== 3) {
    errors.push('manifest.json must use manifest_version 3');
  }

  // Check content scripts
  if (!manifest.content_scripts || !Array.isArray(manifest.content_scripts)) {
    errors.push('manifest.json missing content_scripts');
  } else {
    const cs = manifest.content_scripts[0];

    // Check matches
    if (!cs.matches || cs.matches.length === 0) {
      errors.push('content_scripts must have matches');
    } else {
      const validDomains = [
        'https://*.lightning.force.com/*',
        'https://*.my.salesforce.com/*',
        'https://*.cloudforce.com/*',
        'https://*.salesforce.com/*'
      ];
      const hasValidDomain = cs.matches.some(m => validDomains.includes(m));
      if (!hasValidDomain) {
        errors.push('manifest.json matches do not include common Salesforce domains');
      }
      console.log(`  ✓ Matches: ${cs.matches.join(', ')}`);
    }

    // Check JS files are in correct order
    const expectedOrder = [
      'src/constants.js',
      'src/utils.js',
      'src/storage.js',
      'config.js',
      'src/menu.js',
      'src/settings.js',
      'src/star.js',
      'content.js'
    ];
    const actualJS = cs.js || [];

    expectedOrder.forEach((file, index) => {
      if (actualJS[index] !== file) {
        warnings.push(
          `JS file order: expected ${file} at position ${index}, got ${actualJS[index] || 'nothing'}`
        );
      }
    });
    console.log(`  ✓ JS files: ${actualJS.length} files`);

    // Check CSS
    if (!cs.css || !cs.css.includes('styles.css')) {
      warnings.push('styles.css not included in content_scripts');
    }
  }

  // Check permissions
  if (!manifest.permissions || !manifest.permissions.includes('storage')) {
    errors.push('manifest.json must include "storage" permission');
  }

  console.log('  ✓ Manifest structure valid');
}

// 3. Validate config.js
console.log('\n⚙️  Validating config.js...');
try {
  const configPath = path.join(__dirname, '..', 'config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');

  if (!configContent.includes('const DEFAULT_MENU_CONFIG')) {
    errors.push('config.js must define DEFAULT_MENU_CONFIG');
  }

  if (!configContent.includes('[') || !configContent.includes(']')) {
    errors.push('DEFAULT_MENU_CONFIG must be an array');
  }

  // Try to extract and validate the config
  const match = configContent.match(/const DEFAULT_MENU_CONFIG = (\[[\s\S]*\]);/);
  if (match) {
    try {
      const config = eval(match[1]); // Safe here since it's our own code
      if (!Array.isArray(config)) {
        errors.push('DEFAULT_MENU_CONFIG must be an array');
      } else {
        console.log(`  ✓ ${config.length} menu groups defined`);

        // Validate structure
        config.forEach((group, i) => {
          if (!group.title) {
            errors.push(`Group ${i} missing title`);
          }
          if (!Array.isArray(group.items)) {
            errors.push(`Group ${i} items must be an array`);
          } else {
            group.items.forEach((item, j) => {
              if (!item.label) {
                errors.push(`Group ${i}, item ${j} missing label`);
              }
              if (!item.path) {
                errors.push(`Group ${i}, item ${j} missing path`);
              }
            });
          }
        });

        console.log('  ✓ Config structure valid');
      }
    } catch (err) {
      errors.push(`Failed to parse DEFAULT_MENU_CONFIG: ${err.message}`);
    }
  }
} catch (err) {
  errors.push(`Failed to read config.js: ${err.message}`);
}

// 4. Check for common issues
console.log('\n🔧 Checking for common issues...');

// Check for old inline styles in content.js
const contentPath = path.join(__dirname, '..', 'content.js');
if (fileExists('content.js')) {
  const content = fs.readFileSync(contentPath, 'utf8');

  if (content.includes('.style.cssText')) {
    warnings.push('content.js contains inline styles (should be in CSS)');
  }

  if (content.length > 500) {
    warnings.push(
      `content.js is ${content.length} chars (should be small orchestrator, most logic in modules)`
    );
  }

  console.log(`  ✓ content.js size: ${content.length} characters`);
}

// Check constants are defined
const constantsPath = path.join(__dirname, '..', 'src', 'constants.js');
if (fileExists('src/constants.js')) {
  const constants = fs.readFileSync(constantsPath, 'utf8');
  const requiredConstants = [
    'SF_SETUP_BASE',
    'CUSTOM_NAV_ID',
    'SETTINGS_MODAL_ID',
    'STAR_BUTTON_CONFIG'
  ];

  requiredConstants.forEach(constant => {
    if (!constants.includes(`const ${constant}`)) {
      errors.push(`Missing constant: ${constant}`);
    }
  });

  console.log('  ✓ Constants defined');
}

// 5. Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Validation Summary\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed!');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length} error(s) found:\n`);
  errors.forEach(err => console.log(`  • ${err}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
  warnings.forEach(warn => console.log(`  • ${warn}`));
}

console.log('\n' + '='.repeat(50));
process.exit(errors.length > 0 ? 1 : 0);
