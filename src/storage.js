/**
 * Storage management for menu configuration
 */

// Returns false when the extension has been reloaded and this content script is orphaned
function isContextValid() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}

// Copies path from DEFAULT_MENU_CONFIG into any stored group that is missing it
function backfillGroupPaths(config) {
  config.forEach(group => {
    if (!group.path) {
      const def = DEFAULT_MENU_CONFIG.find(g => g.title === group.title);
      if (def && def.path) group.path = def.path;
    }
  });
  return config;
}

/**
 * Loads menu configuration from storage
 * @returns {Promise<Array>} Menu configuration array
 */
async function loadMenuConfig() {
  return new Promise((resolve) => {
    try {
      if (!isContextValid()) { resolve(deepClone(DEFAULT_MENU_CONFIG)); return; }
      chrome.storage.sync.get([STORAGE_KEY_MENU_CONFIG], (result) => {
        if (chrome.runtime.lastError) {
          log('warn', 'Failed to load config from storage:', chrome.runtime.lastError);
          resolve(deepClone(DEFAULT_MENU_CONFIG));
          return;
        }

        const config = backfillGroupPaths(result[STORAGE_KEY_MENU_CONFIG] || deepClone(DEFAULT_MENU_CONFIG));
        log('log', 'Loaded config from storage:', config);
        resolve(config);
      });
    } catch (err) {
      log('error', 'Exception loading config:', err);
      resolve(deepClone(DEFAULT_MENU_CONFIG));
    }
  });
}

/**
 * Saves menu configuration to storage
 * @param {Array} config - Menu configuration to save
 * @returns {Promise<void>}
 */
async function saveMenuConfig(config) {
  return new Promise((resolve, reject) => {
    try {
      if (!isContextValid()) { resolve(); return; }
      // Validate before saving
      validateMenuConfig(config);

      // Normalize all paths before saving
      const normalizedConfig = config.map(group => ({
        ...group,
        path: group.path ? normalizePathForStorage(group.path) : undefined,
        items: (group.items || []).map(item => ({
          ...item,
          path: normalizePathForStorage(item.path)
        }))
      }));

      chrome.storage.sync.set(
        { [STORAGE_KEY_MENU_CONFIG]: normalizedConfig },
        () => {
          if (chrome.runtime.lastError) {
            log('error', 'Failed to save config:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          log('log', 'Config saved successfully');
          resolve();
        }
      );
    } catch (err) {
      log('error', 'Exception saving config:', err);
      reject(err);
    }
  });
}

/**
 * Resets configuration to default
 * @returns {Promise<void>}
 */
async function resetMenuConfig() {
  const defaultConfig = deepClone(DEFAULT_MENU_CONFIG);
  return saveMenuConfig(defaultConfig);
}

/**
 * Loads page visit history from local storage
 * @returns {Promise<Array>} History array of {path, label, timestamp}
 */
async function loadHistory() {
  return new Promise((resolve) => {
    try {
      if (!isContextValid()) { resolve([]); return; }
      chrome.storage.local.get([STORAGE_KEY_HISTORY], (result) => {
        if (chrome.runtime.lastError) {
          log('warn', 'Failed to load history:', chrome.runtime.lastError);
          resolve([]);
          return;
        }
        resolve(result[STORAGE_KEY_HISTORY] || []);
      });
    } catch (err) {
      log('error', 'Exception loading history:', err);
      resolve([]);
    }
  });
}

/**
 * Saves a page visit to history
 * @param {{path: string, label: string, timestamp: number}} entry
 * @returns {Promise<void>}
 */
async function saveToHistory(entry) {
  return new Promise((resolve) => {
    try {
      if (!isContextValid()) { resolve(); return; }
      chrome.storage.local.get([STORAGE_KEY_HISTORY], (result) => {
        if (chrome.runtime.lastError) {
          log('warn', 'Failed to read history for save:', chrome.runtime.lastError);
          resolve();
          return;
        }

        let history = result[STORAGE_KEY_HISTORY] || [];

        // Remove existing entry for the same path (dedup)
        history = history.filter(item => item.path !== entry.path);

        // Prepend new entry and trim to max
        history.unshift(entry);
        history = history.slice(0, HISTORY_MAX_ITEMS);

        chrome.storage.local.set({ [STORAGE_KEY_HISTORY]: history }, () => {
          if (chrome.runtime.lastError) {
            log('warn', 'Failed to save history:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    } catch (err) {
      log('error', 'Exception saving history:', err);
      resolve();
    }
  });
}

/**
 * Clears all page visit history
 * @returns {Promise<void>}
 */
async function clearHistory() {
  return new Promise((resolve) => {
    try {
      if (!isContextValid()) { resolve(); return; }
      chrome.storage.local.remove(STORAGE_KEY_HISTORY, () => {
        if (chrome.runtime.lastError) {
          log('warn', 'Failed to clear history:', chrome.runtime.lastError);
        }
        resolve();
      });
    } catch (err) {
      log('error', 'Exception clearing history:', err);
      resolve();
    }
  });
}

/**
 * Listens for storage changes and calls callback
 * @param {Function} callback - Called with new config when it changes
 */
function onConfigChange(callback) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes[STORAGE_KEY_MENU_CONFIG]) {
      const newConfig = changes[STORAGE_KEY_MENU_CONFIG].newValue || deepClone(DEFAULT_MENU_CONFIG);
      log('log', 'Config changed:', newConfig);
      callback(newConfig);
    }
  });
}
