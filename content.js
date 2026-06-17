/**
 * Salesforce Setup Navigator - Main Content Script
 * Orchestrates the menu injection and initialization
 */

// Main menu configuration (loaded from storage or default)
let menuConfig = deepClone(DEFAULT_MENU_CONFIG);

// Track the last recorded path to detect navigation changes
let lastTrackedPath = '';
// Handles for the label-settling lifecycle (module-level for cleanup across navigations)
let labelObserver = null;
let labelPollTimer = null;
let labelSettleTimer = null;
let labelMaxWaitTimer = null;

log('log', 'Extension loaded');
log('log', 'Default config:', DEFAULT_MENU_CONFIG);

/**
 * Attempts to resolve a meaningful page label from DOM selectors.
 * Searches same-origin iframes first (more specific), then the top document.
 * Returns the first non-empty match or null.
 */
function resolveLabelFromPage() {
  // Search iframes first — they contain the specific page content
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) continue;
      for (const selector of HISTORY_LABEL_SELECTORS) {
        const el = iframeDoc.querySelector(selector);
        const text = el?.textContent?.trim();
        if (text) return text;
      }
    } catch (e) {
      // Cross-origin iframe — skip
    }
  }

  // Fall back to top document
  for (const selector of HISTORY_LABEL_SELECTORS) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }

  return null;
}

/**
 * Extracts a clean label from document.title by stripping the
 * "| Salesforce" / "- Salesforce" suffix.
 */
function resolveLabelFromTitle() {
  const raw = document.title?.replace(/\s*[-|].*$/, '').trim() || '';
  // Ignore generic framework titles
  if (!raw || /^(lightning experience|salesforce|setup)$/i.test(raw)) return null;
  return raw;
}

/**
 * Tears down any active label-settling work.
 */
function cleanupLabelSettling() {
  if (labelObserver) {
    labelObserver.disconnect();
    labelObserver = null;
  }
  clearInterval(labelPollTimer);
  clearTimeout(labelSettleTimer);
  clearTimeout(labelMaxWaitTimer);
  labelPollTimer = null;
  labelSettleTimer = null;
  labelMaxWaitTimer = null;
}

/**
 * Records the current page to visit history.
 * Uses a settling strategy: saves immediately with the best label available,
 * then watches for DOM/title changes that yield a better label.
 */
async function trackCurrentPage() {
  const path = getActiveSetupPath();
  if (!path || path === lastTrackedPath) return;
  if (path.indexOf(SF_SETUP_BASE) !== 0) return;

  lastTrackedPath = path;
  const relPath = normalizePathForStorage(path);

  // Cancel any previous label-settling work
  cleanupLabelSettling();

  // Determine the best label available right now
  const bestLabel = resolveBestLabel(relPath);
  await saveToHistory({ path: relPath, label: bestLabel, timestamp: Date.now() });

  // Watch for a better label to appear (title change or DOM addition)
  waitForBetterLabel(relPath, bestLabel);
}

/**
 * Returns the best label currently available for a path.
 */
function resolveBestLabel(relPath) {
  return resolveLabelFromPage()
    || resolveLabelFromTitle()
    || relPath.split('/').filter(Boolean).pop()
    || relPath;
}

/**
 * Observes DOM mutations and polls iframes to update the history entry
 * once a more meaningful label becomes available.
 */
function waitForBetterLabel(relPath, initialLabel) {
  function tryUpdate() {
    const candidate = resolveLabelFromPage() || resolveLabelFromTitle();
    if (candidate && candidate !== initialLabel) {
      // Found a better label — debounce to let it fully settle
      clearTimeout(labelSettleTimer);
      labelSettleTimer = setTimeout(async () => {
        const finalLabel = resolveBestLabel(relPath);
        if (finalLabel !== initialLabel) {
          log('log', `History label updated: "${initialLabel}" → "${finalLabel}"`);
          await saveToHistory({ path: relPath, label: finalLabel, timestamp: Date.now() });
        }
        cleanupLabelSettling();
      }, HISTORY_LABEL_SETTLE_DELAY);
    }
  }

  // Stop observing after HISTORY_LABEL_MAX_WAIT
  labelMaxWaitTimer = setTimeout(cleanupLabelSettling, HISTORY_LABEL_MAX_WAIT);

  labelObserver = new MutationObserver(() => {
    if (normalizePathForStorage(getActiveSetupPath() || '') !== relPath) {
      cleanupLabelSettling();
      return;
    }
    tryUpdate();
  });

  labelObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Poll periodically to catch iframe content that renders async
  labelPollTimer = setInterval(() => {
    if (normalizePathForStorage(getActiveSetupPath() || '') !== relPath) {
      cleanupLabelSettling();
      return;
    }
    tryUpdate();
  }, 500);

  // Also check immediately
  tryUpdate();
}

/**
 * Initializes the menu system
 */
async function initializeExtension() {
  try {
    // Load configuration from storage
    menuConfig = await loadMenuConfig();
    log('log', menuConfig ? 'Using custom config' : 'Using default config');

    // Record the initial page visit
    await trackCurrentPage();

    // Poll for path changes (SPA navigation)
    setInterval(trackCurrentPage, STAR_UPDATE_POLL_INTERVAL);

    initializeMenu();
  } catch (err) {
    log('error', 'Failed to initialize extension:', err);
  }
}

/**
 * Initializes menu injection
 */
function initializeMenu() {
  log('log', 'Initializing menu...');

  // Observe DOM for Salesforce container
  const observer = new MutationObserver((mutations, obs) => {
    const setupContainer = findSetupContainer();

    if (setupContainer && !document.getElementById(CUSTOM_NAV_ID)) {
      log('log', 'Found setup container via observer:', setupContainer);
      injectMenuWithButtons(setupContainer);
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Try immediately if page already loaded
  const setupContainer = findSetupContainer();
  log('log', 'Initial search for setup container:', setupContainer);

  if (setupContainer && !document.getElementById(CUSTOM_NAV_ID)) {
    log('log', 'Injecting menu immediately');
    injectMenuWithButtons(setupContainer);
  } else if (!setupContainer) {
    log('log', 'No setup container found yet, waiting for DOM changes');
  } else {
    log('log', 'Menu already exists');
  }

  // Fallback: inject at top of body if no container found
  setTimeout(() => {
    if (!document.getElementById(CUSTOM_NAV_ID)) {
      log('warn', 'No setup container found after timeout — injecting fallback menu at top of body');
      injectMenuWithButtons(null);
    }
  }, CONTAINER_SEARCH_TIMEOUT);
}

/**
 * Injects menu with star and settings buttons
 * @param {HTMLElement|null} container - Container to inject near
 */
function injectMenuWithButtons(container) {
  // Inject the main menu
  injectMenu(container, menuConfig);

  // Get the menu bar (either the custom bar or the injected items)
  const menuBar = document.getElementById(CUSTOM_NAV_ID);
  if (!menuBar) {
    log('error', 'Failed to find injected menu');
    return;
  }

  // Create star button for adding current page
  const starButton = createStarButton(menuConfig, handleConfigChange);
  if (starButton) {
    // Insert as first item
    if (menuBar.style.display === 'none') {
      // Menu is just a marker, find the injected items
      const firstInjectedItem = document.querySelector(`.${CSS_CLASS_INJECTED_ITEM}`);
      if (firstInjectedItem?.parentNode) {
        const li = document.createElement('li');
        li.className = CSS_CLASS_INJECTED_ITEM;
        li.style.listStyle = 'none';
        li.appendChild(starButton);
        firstInjectedItem.parentNode.insertBefore(li, firstInjectedItem);
      }
    } else {
      menuBar.insertBefore(starButton, menuBar.firstChild);
    }
  }

  // Create history button
  const historyButton = createHistoryButton(menuConfig, handleConfigChange);

  // Create settings button
  const settingsButton = createSettingsButton(() => {
    openSettingsModal(menuConfig, handleConfigChange);
  });

  // Append history and settings buttons at the end
  if (menuBar.style.display === 'none') {
    // Menu is just a marker, append to the tab bar
    const tabBar = document.querySelector(SALESFORCE_TAB_BAR_SELECTOR);
    if (tabBar) {
      const historyLi = document.createElement('li');
      historyLi.className = CSS_CLASS_INJECTED_ITEM;
      historyLi.style.listStyle = 'none';
      historyLi.appendChild(historyButton);
      tabBar.appendChild(historyLi);

      const settingsLi = document.createElement('li');
      settingsLi.className = CSS_CLASS_INJECTED_ITEM;
      settingsLi.style.listStyle = 'none';
      settingsLi.appendChild(settingsButton);
      tabBar.appendChild(settingsLi);
    }
  } else {
    menuBar.appendChild(historyButton);
    menuBar.appendChild(settingsButton);
  }

  log('log', 'Menu with buttons injected successfully');
}

/**
 * Handles configuration changes
 * @param {Array} newConfig - New configuration
 */
function handleConfigChange(newConfig) {
  menuConfig = newConfig;
  log('log', 'Config changed, reinitializing menu');

  // Remove and re-inject menu
  removeExistingMenu();
  const setupContainer = findSetupContainer();
  if (setupContainer) {
    injectMenuWithButtons(setupContainer);
  }
}

// Listen for storage changes
onConfigChange(handleConfigChange);

// Initialize on load
initializeExtension();
