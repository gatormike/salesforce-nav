/**
 * Salesforce Setup Navigator - Main Content Script
 * Orchestrates the menu injection and initialization
 */

// Main menu configuration (loaded from storage or default)
let menuConfig = deepClone(DEFAULT_MENU_CONFIG);

log('log', 'Extension loaded');
log('log', 'Default config:', DEFAULT_MENU_CONFIG);

/**
 * Initializes the menu system
 */
async function initializeExtension() {
  try {
    // Load configuration from storage
    menuConfig = await loadMenuConfig();
    log('log', menuConfig ? 'Using custom config' : 'Using default config');

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

  // Create settings button
  const settingsButton = createSettingsButton(() => {
    openSettingsModal(menuConfig, handleConfigChange);
  });

  // Append settings button at the end
  if (menuBar.style.display === 'none') {
    // Menu is just a marker, append to the tab bar
    const tabBar = document.querySelector(SALESFORCE_TAB_BAR_SELECTOR);
    if (tabBar) {
      const li = document.createElement('li');
      li.className = CSS_CLASS_INJECTED_ITEM;
      li.style.listStyle = 'none';
      li.appendChild(settingsButton);
      tabBar.appendChild(li);
    }
  } else {
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
