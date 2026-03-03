#!/usr/bin/env node
/**
 * Unit tests for utility functions
 * Tests the pure functions that don't require DOM/browser APIs
 */

console.log('🧪 Running unit tests...\n');

let passed = 0;
let failed = 0;

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// Mock constants
const SF_SETUP_BASE = '/lightning/setup/';

// Mock functions (copied from utils.js for testing)
function resolveConfigPath(path) {
  if (!path) return SF_SETUP_BASE;
  if (path.indexOf(SF_SETUP_BASE) === 0) return path;
  return SF_SETUP_BASE + String(path).replace(/^\/+/, '');
}

function normalizePathForStorage(path) {
  if (typeof path !== 'string') return '';
  if (path.indexOf(SF_SETUP_BASE) === 0) {
    return path.replace(new RegExp('^' + SF_SETUP_BASE.replace(/\//g, '\\/')), '');
  }
  return path.replace(/^\/+/, '');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function findMenuItemByPath(menuConfig, path) {
  for (let groupIndex = 0; groupIndex < menuConfig.length; groupIndex++) {
    const items = menuConfig[groupIndex].items || [];
    const itemIndex = items.findIndex(item => resolveConfigPath(item.path) === path);
    if (itemIndex !== -1) {
      return { found: true, groupIndex, itemIndex };
    }
  }
  return { found: false, groupIndex: -1, itemIndex: -1 };
}

// Tests for resolveConfigPath
console.log('Testing resolveConfigPath:');
test('resolveConfigPath returns base for empty path', () => {
  assertEqual(resolveConfigPath(''), SF_SETUP_BASE);
  assertEqual(resolveConfigPath(null), SF_SETUP_BASE);
});

test('resolveConfigPath returns same path if already absolute', () => {
  assertEqual(
    resolveConfigPath('/lightning/setup/ManageUsers/home'),
    '/lightning/setup/ManageUsers/home'
  );
});

test('resolveConfigPath adds base to relative path', () => {
  assertEqual(resolveConfigPath('ManageUsers/home'), '/lightning/setup/ManageUsers/home');
});

test('resolveConfigPath removes leading slashes from relative path', () => {
  assertEqual(resolveConfigPath('/ManageUsers/home'), '/lightning/setup/ManageUsers/home');
  assertEqual(resolveConfigPath('///ManageUsers/home'), '/lightning/setup/ManageUsers/home');
});

// Tests for normalizePathForStorage
console.log('\nTesting normalizePathForStorage:');
test('normalizePathForStorage removes SF_SETUP_BASE prefix', () => {
  assertEqual(normalizePathForStorage('/lightning/setup/ManageUsers/home'), 'ManageUsers/home');
});

test('normalizePathForStorage removes leading slashes', () => {
  assertEqual(normalizePathForStorage('/ManageUsers/home'), 'ManageUsers/home');
  assertEqual(normalizePathForStorage('///ManageUsers/home'), 'ManageUsers/home');
});

test('normalizePathForStorage handles already normalized paths', () => {
  assertEqual(normalizePathForStorage('ManageUsers/home'), 'ManageUsers/home');
});

test('normalizePathForStorage returns empty for non-string', () => {
  assertEqual(normalizePathForStorage(null), '');
  assertEqual(normalizePathForStorage(undefined), '');
});

// Tests for deepClone
console.log('\nTesting deepClone:');
test('deepClone creates independent copy', () => {
  const original = { a: 1, b: { c: 2 } };
  const cloned = deepClone(original);
  cloned.b.c = 3;
  assertEqual(original.b.c, 2);
  assertEqual(cloned.b.c, 3);
});

test('deepClone handles arrays', () => {
  const original = [1, 2, { a: 3 }];
  const cloned = deepClone(original);
  cloned[2].a = 4;
  assertEqual(original[2].a, 3);
  assertEqual(cloned[2].a, 4);
});

// Tests for findMenuItemByPath
console.log('\nTesting findMenuItemByPath:');
test('findMenuItemByPath finds existing item', () => {
  const config = [
    {
      title: 'Group 1',
      items: [{ label: 'Users', path: 'ManageUsers/home' }]
    }
  ];
  const result = findMenuItemByPath(config, '/lightning/setup/ManageUsers/home');
  assert(result.found, 'Should find item');
  assertEqual(result.groupIndex, 0);
  assertEqual(result.itemIndex, 0);
});

test('findMenuItemByPath returns not found for missing item', () => {
  const config = [
    {
      title: 'Group 1',
      items: [{ label: 'Users', path: 'ManageUsers/home' }]
    }
  ];
  const result = findMenuItemByPath(config, '/lightning/setup/SomethingElse/home');
  assert(!result.found, 'Should not find item');
  assertEqual(result.groupIndex, -1);
  assertEqual(result.itemIndex, -1);
});

test('findMenuItemByPath handles multiple groups', () => {
  const config = [
    {
      title: 'Group 1',
      items: [{ label: 'Users', path: 'ManageUsers/home' }]
    },
    {
      title: 'Group 2',
      items: [
        { label: 'Profiles', path: 'EnhancedProfiles/home' },
        { label: 'Apex', path: 'ApexClasses/home' }
      ]
    }
  ];
  const result = findMenuItemByPath(config, '/lightning/setup/ApexClasses/home');
  assert(result.found, 'Should find item in second group');
  assertEqual(result.groupIndex, 1);
  assertEqual(result.itemIndex, 1);
});

// Path normalization round-trip test
console.log('\nTesting round-trip path conversion:');
test('resolveConfigPath and normalizePathForStorage are inverses', () => {
  const paths = ['ManageUsers/home', 'ApexClasses/home', 'ObjectManager/Account/view'];

  paths.forEach(path => {
    const resolved = resolveConfigPath(path);
    const normalized = normalizePathForStorage(resolved);
    assertEqual(normalized, path, `Round-trip failed for ${path}`);
  });
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary\n');
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
