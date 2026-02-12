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

  // Fallback: if no container found within a short time, inject at top of body
  setTimeout(() => {
    if (!document.getElementById('sf-custom-nav')) {
      console.warn('[SF Nav] No setup container found after timeout — injecting fallback menu at top of body');
      injectMenu(null);
    }
  }, 3000);
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
  console.log('[SF Nav] Injecting menu (container):', container);
  
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

  // Add an inline "Settings" dropdown so users can edit config without leaving the page
  try {
    const settingsItem = document.createElement('div');
    settingsItem.className = 'sf-nav-item';

    const settingsButton = document.createElement('button');
    settingsButton.className = 'sf-nav-button';
    settingsButton.textContent = 'Settings';

    const settingsDropdown = document.createElement('div');
    settingsDropdown.className = 'sf-nav-dropdown';
    settingsDropdown.style.minWidth = '360px';
    settingsDropdown.style.padding = '12px';
    settingsDropdown.style.boxSizing = 'border-box';

    // Build settings UI
    const info = document.createElement('div');
    info.style.marginBottom = '8px';
    info.style.fontSize = '12px';
    info.style.color = '#333';
    info.textContent = 'Edit menu configuration (JSON). Click Save to persist.';

    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.height = '200px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';
    textarea.style.padding = '8px';
    textarea.style.boxSizing = 'border-box';
    textarea.id = 'sf-settings-config';

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.marginTop = '8px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.background = '#0070d2';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.padding = '6px 10px';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.cursor = 'pointer';

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.style.background = '#f3f3f3';
    resetBtn.style.border = '1px solid #ddd';
    resetBtn.style.padding = '6px 10px';
    resetBtn.style.borderRadius = '4px';
    resetBtn.style.cursor = 'pointer';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export';
    exportBtn.style.background = '#f3f3f3';
    exportBtn.style.border = '1px solid #ddd';
    exportBtn.style.padding = '6px 10px';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.cursor = 'pointer';

    const message = document.createElement('div');
    message.style.display = 'none';
    message.style.marginTop = '8px';
    message.style.padding = '8px';
    message.style.borderRadius = '4px';

    controls.appendChild(saveBtn);
    controls.appendChild(resetBtn);
    controls.appendChild(exportBtn);

    settingsDropdown.appendChild(info);
    settingsDropdown.appendChild(textarea);
    settingsDropdown.appendChild(controls);
    settingsDropdown.appendChild(message);

    // Toggle dropdown open/close using same pattern
    settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = settingsItem.classList.contains('open');

      // Close other dropdowns
      document.querySelectorAll('.sf-nav-item.open').forEach(mi => mi.classList.remove('open'));

      if (!isOpen) settingsItem.classList.add('open');
      else settingsItem.classList.remove('open');
    });

    // Load stored config into textarea
    try {
      chrome.storage.sync.get(['menuConfig'], function(result) {
        const cfg = result && result.menuConfig ? result.menuConfig : DEFAULT_MENU_CONFIG;
        textarea.value = JSON.stringify(cfg, null, 2);
      });
    } catch (err) {
      textarea.value = JSON.stringify(DEFAULT_MENU_CONFIG, null, 2);
    }

    // Save handler
    saveBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(textarea.value);
        if (!Array.isArray(parsed)) throw new Error('Configuration must be an array');
        parsed.forEach((group, gi) => {
          if (!group.title || !Array.isArray(group.items)) throw new Error(`Group ${gi} must have title and items`);
          group.items.forEach((it, ii) => {
            if (!it.label || !it.path) throw new Error(`Item ${ii} in group ${gi} must have label and path`);
          });
        });

        chrome.storage.sync.set({ menuConfig: parsed }, () => {
          message.textContent = 'Configuration saved';
          message.style.display = 'block';
          message.style.background = '#e6ffed';
          message.style.border = '1px solid #bde5c9';
          message.style.color = '#1f6f3d';

          // Close message after a moment
          setTimeout(() => { message.style.display = 'none'; }, 2500);
        });
      } catch (err) {
        message.textContent = 'Error: ' + err.message;
        message.style.display = 'block';
        message.style.background = '#ffecec';
        message.style.border = '1px solid #f0b3b3';
        message.style.color = '#8b1b1b';
      }
    });

    // Reset handler
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset to default configuration?')) return;
      textarea.value = JSON.stringify(DEFAULT_MENU_CONFIG, null, 2);
      chrome.storage.sync.set({ menuConfig: DEFAULT_MENU_CONFIG }, () => {
        message.textContent = 'Reset to default';
        message.style.display = 'block';
        message.style.background = '#e6ffed';
        message.style.border = '1px solid #bde5c9';
        message.style.color = '#1f6f3d';
        setTimeout(() => { message.style.display = 'none'; }, 2500);
      });
    });

    // Export handler
    exportBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(textarea.value);
        const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sf-nav-config.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        message.textContent = 'Invalid JSON: ' + err.message;
        message.style.display = 'block';
        message.style.background = '#ffecec';
        message.style.border = '1px solid #f0b3b3';
        message.style.color = '#8b1b1b';
      }
    });

    settingsItem.appendChild(settingsButton);
    settingsItem.appendChild(settingsDropdown);
    // Open settings dropdown on hover as well (desktop)
    settingsItem.addEventListener('mouseenter', () => {
      document.querySelectorAll('.sf-nav-item.open').forEach(mi => mi.classList.remove('open'));
      settingsItem.classList.add('open');
    });
    settingsItem.addEventListener('mouseleave', () => {
      settingsItem.classList.remove('open');
    });

    menuBar.appendChild(settingsItem);
  } catch (err) {
    console.error('[SF Nav] Failed to add Settings dropdown', err);
  }

  // (extension popup button removed)
  
  console.log('[SF Nav] Created menu bar:', menuBar);
  console.log('[SF Nav] Menu has', menuConfig.length, 'groups');
  
  // Insert the menu. If a valid container with a parent is provided, insert after it.
  // Otherwise fall back to inserting at the top of the body.
  if (container && container.parentNode) {
    container.parentNode.insertBefore(menuBar, container.nextSibling);
    console.log('[SF Nav] Inserted menu after container');
  } else {
    document.body.insertBefore(menuBar, document.body.firstChild);
    console.log('[SF Nav] Inserted menu at top of body (fallback)');
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

  // Open on hover (desktop): entering the item opens it; leaving closes it
  menuItem.addEventListener('mouseenter', () => {
    document.querySelectorAll('.sf-nav-item.open').forEach(mi => mi.classList.remove('open'));
    menuItem.classList.add('open');
  });

  menuItem.addEventListener('mouseleave', () => {
    menuItem.classList.remove('open');
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
