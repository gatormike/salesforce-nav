// Load menu configuration
let menuConfig = DEFAULT_MENU_CONFIG;

console.log('[SF Nav] Extension loaded');
console.log('[SF Nav] Default config:', DEFAULT_MENU_CONFIG);

// Load custom config from storage if available
chrome.storage.sync.get(['menuConfig'], function(result) {
  console.log('[SF Nav] Storage result:', result);
  if (result.menuConfig) {
    menuConfig = result.menuConfig;
    console.log('[SF Nav] Using custom config');
  } else {
    console.log('[SF Nav] Using default config');
  }
  initializeMenu();
});

function initializeMenu() {
  console.log('[SF Nav] Initializing menu...');
  
  // Wait for the page to load and find the appropriate container
  const observer = new MutationObserver((mutations, obs) => {
    const setupContainer = findSetupContainer();
    
    if (setupContainer && !document.getElementById('sf-custom-nav')) {
      console.log('[SF Nav] Found setup container via observer:', setupContainer);
      injectMenu(setupContainer);
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also try immediately in case the page is already loaded
  const setupContainer = findSetupContainer();
  console.log('[SF Nav] Initial search for setup container:', setupContainer);
  if (setupContainer && !document.getElementById('sf-custom-nav')) {
    console.log('[SF Nav] Injecting menu immediately');
    injectMenu(setupContainer);
  } else if (!setupContainer) {
    console.log('[SF Nav] No setup container found yet, waiting for DOM changes');
  } else {
    console.log('[SF Nav] Menu already exists');
  }
}

function findSetupContainer() {
  // Look for the Setup navigation bar
  const selectors = [
    '[data-aura-class="navexConsoleTabContainer"]',
    '.slds-context-bar__secondary',
    '.navexConsoleTabContainer',
    '.slds-context-bar',
    'header.slds-global-header'
  ];
  
  console.log('[SF Nav] Searching for setup container with selectors:', selectors);
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('[SF Nav] Found container with selector:', selector, element);
      return element;
    }
  }
  
  console.log('[SF Nav] No setup container found');
  return null;
}

function injectMenu(container) {
  console.log('[SF Nav] Injecting menu after container:', container);
  
  // Create menu container
  const menuBar = document.createElement('div');
  menuBar.id = 'sf-custom-nav';
  menuBar.className = 'sf-custom-nav-bar';
  // Ensure caret image resolves to the extension's file URL when styles are injected
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    menuBar.style.setProperty('--sf-caret-url', `url("${chrome.runtime.getURL('down_carat.png')}")`);
  }
  
  // Create menu items
  menuConfig.forEach(menuGroup => {
    const menuItem = createMenuItem(menuGroup);
    menuBar.appendChild(menuItem);
  });

  // (extension popup button removed)
  
  console.log('[SF Nav] Created menu bar:', menuBar);
  console.log('[SF Nav] Menu has', menuConfig.length, 'groups');
  
  // Insert the menu
  // Try to insert it after the existing navigation
  if (container.parentNode) {
    container.parentNode.insertBefore(menuBar, container.nextSibling);
    console.log('[SF Nav] Inserted menu after container');
  } else {
    document.body.insertBefore(menuBar, document.body.firstChild);
    console.log('[SF Nav] Inserted menu at top of body');
  }
  
  console.log('[SF Nav] Menu injected successfully');
}

function createMenuItem(menuGroup) {
  const menuItem = document.createElement('div');
  menuItem.className = 'sf-nav-item';
  
  const menuButton = document.createElement('button');
  menuButton.className = 'sf-nav-button';
  menuButton.textContent = menuGroup.title;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'sf-nav-dropdown';
  
  menuGroup.items.forEach(item => {
    const link = document.createElement('a');
    link.className = 'sf-nav-link';
    link.href = item.path;
    link.textContent = item.label;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = item.path;
    });
    dropdown.appendChild(link);
  });
  
  // Toggle dropdown on click (use .open class; remove aria-expanded toggling)
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuItem.classList.contains('open');

    // Close all other dropdowns
    document.querySelectorAll('.sf-nav-item.open').forEach(mi => {
      mi.classList.remove('open');
    });

    // Toggle this dropdown
    if (!isOpen) {
      menuItem.classList.add('open');
    } else {
      menuItem.classList.remove('open');
    }
  });
  
  menuItem.appendChild(menuButton);
  menuItem.appendChild(dropdown);
  
  return menuItem;
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.sf-nav-item.open').forEach(mi => {
    mi.classList.remove('open');
  });
});

// Listen for config updates
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.menuConfig) {
    menuConfig = changes.menuConfig.newValue || DEFAULT_MENU_CONFIG;
    
    // Remove existing menu
    const existingMenu = document.getElementById('sf-custom-nav');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Re-inject with new config
    const setupContainer = findSetupContainer();
    if (setupContainer) {
      injectMenu(setupContainer);
    }
  }
});
