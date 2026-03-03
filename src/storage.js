/**
 * Storage management for menu configuration
 */

/**
 * Loads menu configuration from storage
 * @returns {Promise<Array>} Menu configuration array
 */
async function loadMenuConfig() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get([STORAGE_KEY_MENU_CONFIG], (result) => {
        if (chrome.runtime.lastError) {
          log('warn', 'Failed to load config from storage:', chrome.runtime.lastError);
          resolve(deepClone(DEFAULT_MENU_CONFIG));
          return;
        }

        const config = result[STORAGE_KEY_MENU_CONFIG] || deepClone(DEFAULT_MENU_CONFIG);
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
      // Validate before saving
      validateMenuConfig(config);

      // Normalize all paths before saving
      const normalizedConfig = config.map(group => ({
        ...group,
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
