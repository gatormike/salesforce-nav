/**
 * Utility functions for the Salesforce Setup Navigator extension
 */

/**
 * Resolves a config path to a full Salesforce Setup URL
 * @param {string} path - Relative or absolute path
 * @returns {string} Full path starting with SF_SETUP_BASE
 */
function resolveConfigPath(path) {
  if (!path) return SF_SETUP_BASE;
  if (path.indexOf(SF_SETUP_BASE) === 0) return path;
  return SF_SETUP_BASE + String(path).replace(/^\/+/, '');
}

/**
 * Normalizes a path to be relative to SF_SETUP_BASE for storage
 * @param {string} path - Full or relative path
 * @returns {string} Relative path without SF_SETUP_BASE prefix
 */
function normalizePathForStorage(path) {
  if (typeof path !== 'string') return '';

  if (path.indexOf(SF_SETUP_BASE) === 0) {
    return path.replace(new RegExp('^' + SF_SETUP_BASE.replace(/\//g, '\\/')), '');
  }

  return path.replace(/^\/+/, '');
}

/**
 * Validates if a URL/path is safe to use
 * @param {string} url - URL or path to validate
 * @returns {boolean} True if URL is safe
 */
function isValidSalesforceUrl(url) {
  if (!url || typeof url !== 'string') return false;

  // Check against allowed patterns
  return URL_ALLOWED_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Sanitizes user input for display
 * @param {string} input - User input
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (!input) return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Tries to determine the active setup path (may be in iframe)
 * @returns {string} Current setup path
 */
function getActiveSetupPath() {
  try {
    const topPath = window.location?.pathname || '';
    const topSearch = window.location?.search || '';
    if (topPath.indexOf(SF_SETUP_BASE) === 0) return topPath + topSearch;

    // Look for iframes whose src contains the setup path
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      try {
        // Prefer the src attribute (doesn't require same-origin)
        const src = iframe.getAttribute('src') || '';
        if (src.indexOf(SF_SETUP_BASE) !== -1) {
          try {
            const url = new URL(src, window.location.origin);
            return url.pathname + (url.search || '');
          } catch (e) {
            return src;
          }
        }

        // If same-origin, try reading the iframe location directly
        if (iframe.contentWindow?.location) {
          const path = iframe.contentWindow.location.pathname || '';
          if (path.indexOf(SF_SETUP_BASE) === 0) return path;
        }
      } catch (err) {
        // Ignore access errors for cross-origin iframes
      }
    }
  } catch (err) {
    console.warn('[SF Nav] getActiveSetupPath failed', err);
  }

  return (window.location?.pathname || '') + (window.location?.search || '');
}

/**
 * Finds the Salesforce setup container in the DOM
 * @returns {Element|null} Setup container element or null
 */
function findSetupContainer() {
  console.log('[SF Nav] Searching for setup container with selectors:', SALESFORCE_SELECTORS);

  for (const selector of SALESFORCE_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('[SF Nav] Found container with selector:', selector, element);
      return element;
    }
  }

  console.log('[SF Nav] No setup container found');
  return null;
}

/**
 * Finds an item in the menu config by path
 * @param {Array} menuConfig - Menu configuration array
 * @param {string} path - Path to search for
 * @returns {{found: boolean, groupIndex: number, itemIndex: number}} Search result
 */
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

/**
 * Shows a temporary message in a container
 * @param {HTMLElement} messageElement - Message container element
 * @param {string} text - Message text
 * @param {string} type - Message type ('success' or 'error')
 * @param {number} duration - How long to show message (ms)
 */
function showMessage(messageElement, text, type = 'success', duration = MESSAGE_DISPLAY_DURATION) {
  if (!messageElement) return;

  messageElement.textContent = text;
  messageElement.style.color = type === 'success' ? '#1f6f3d' : '#8b1b1b';

  if (duration > 0) {
    setTimeout(() => {
      messageElement.textContent = '';
    }, duration);
  }
}

/**
 * Validates menu configuration structure
 * @param {Array} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateMenuConfig(config) {
  if (!Array.isArray(config)) {
    throw new Error('Configuration must be an array');
  }

  config.forEach((group, groupIndex) => {
    if (!group.title || !Array.isArray(group.items)) {
      throw new Error(`Group ${groupIndex} must have title and items`);
    }

    group.items.forEach((item, itemIndex) => {
      if (!item.label || !item.path) {
        throw new Error(`Item ${itemIndex} in group ${groupIndex} must have label and path`);
      }

      if (!isValidSalesforceUrl(item.path)) {
        throw new Error(`Invalid path in item ${itemIndex} of group ${groupIndex}: ${item.path}`);
      }
    });
  });
}

/**
 * Deep clones an object (simple implementation for config data)
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Logs with extension prefix
 * @param {string} level - Log level (log, warn, error)
 * @param {...any} args - Arguments to log
 */
function log(level, ...args) {
  console[level]('[SF Nav]', ...args);
}
