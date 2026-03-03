/**
 * Menu creation and management
 */

/**
 * Creates a dropdown menu item
 * @param {Object} menuGroup - Menu group configuration
 * @returns {HTMLElement} Menu item element
 */
function createMenuItem(menuGroup) {
  const menuItem = document.createElement('div');
  menuItem.className = CSS_CLASS_NAV_ITEM;

  const menuButton = document.createElement('button');
  menuButton.className = CSS_CLASS_NAV_BUTTON;
  menuButton.textContent = menuGroup.title;

  const dropdown = document.createElement('div');
  dropdown.className = CSS_CLASS_NAV_DROPDOWN;

  menuGroup.items.forEach(item => {
    const link = document.createElement('a');
    link.className = CSS_CLASS_NAV_LINK;
    const fullPath = resolveConfigPath(item.path);

    // Validate URL before setting
    if (!isValidSalesforceUrl(fullPath)) {
      log('warn', 'Skipping invalid URL:', fullPath);
      return;
    }

    link.href = fullPath;
    link.textContent = item.label;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = fullPath;
    });

    dropdown.appendChild(link);
  });

  // Toggle dropdown on click
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuItem.classList.contains(CSS_CLASS_OPEN);

    // Close all other dropdowns
    document.querySelectorAll(`.${CSS_CLASS_NAV_ITEM}.${CSS_CLASS_OPEN}`).forEach(mi => {
      mi.classList.remove(CSS_CLASS_OPEN);
    });

    // Toggle this dropdown
    if (!isOpen) {
      menuItem.classList.add(CSS_CLASS_OPEN);
    }
  });

  // Open on hover (desktop)
  menuItem.addEventListener('mouseenter', () => {
    document.querySelectorAll(`.${CSS_CLASS_NAV_ITEM}.${CSS_CLASS_OPEN}`).forEach(mi => {
      mi.classList.remove(CSS_CLASS_OPEN);
    });
    menuItem.classList.add(CSS_CLASS_OPEN);
  });

  menuItem.addEventListener('mouseleave', () => {
    menuItem.classList.remove(CSS_CLASS_OPEN);
  });

  menuItem.appendChild(menuButton);
  menuItem.appendChild(dropdown);

  return menuItem;
}

/**
 * Removes existing menu from DOM
 */
function removeExistingMenu() {
  const existingMenu = document.getElementById(CUSTOM_NAV_ID);
  if (existingMenu) {
    existingMenu.remove();
  }

  // Remove any LI items previously injected
  document.querySelectorAll(`li.${CSS_CLASS_INJECTED_ITEM}`).forEach(li => li.remove());
}

/**
 * Injects menu into the page
 * @param {HTMLElement|null} container - Container to inject near
 * @param {Array} menuConfig - Menu configuration
 */
function injectMenu(container, menuConfig) {
  log('log', 'Injecting menu (container):', container);
  log('log', 'Menu has', menuConfig.length, 'groups');

  // Create menu container
  const menuBar = document.createElement('div');
  menuBar.id = CUSTOM_NAV_ID;
  menuBar.className = 'sf-custom-nav-bar';

  // Create menu items
  menuConfig.forEach(menuGroup => {
    const menuItem = createMenuItem(menuGroup);
    menuBar.appendChild(menuItem);
  });

  // Try to attach to existing tab bar UL if present (preferred)
  const targetUL = document.querySelector(SALESFORCE_TAB_BAR_SELECTOR);
  if (targetUL && !document.getElementById(CUSTOM_NAV_ID)) {
    log('log', 'Found target UL for attachment:', targetUL);

    // Move menuBar children into LI elements
    Array.from(menuBar.children).forEach(child => {
      const li = document.createElement('li');
      li.className = CSS_CLASS_INJECTED_ITEM;
      li.style.listStyle = 'none';
      li.appendChild(child);
      targetUL.appendChild(li);
    });

    // Add hidden marker for checks
    const marker = document.createElement('div');
    marker.id = CUSTOM_NAV_ID;
    marker.style.display = 'none';
    document.body.appendChild(marker);

    log('log', 'Appended menu items to target UL');
  } else {
    // Insert menu as standalone bar
    if (container?.parentNode) {
      container.parentNode.insertBefore(menuBar, container.nextSibling);
      log('log', 'Inserted menu after container');
    } else {
      document.body.insertBefore(menuBar, document.body.firstChild);
      log('log', 'Inserted menu at top of body (fallback)');
    }
  }

  log('log', 'Menu injected successfully');
}

/**
 * Closes all open dropdowns
 */
function closeAllDropdowns() {
  document.querySelectorAll(`.${CSS_CLASS_NAV_ITEM}.${CSS_CLASS_OPEN}`).forEach(mi => {
    mi.classList.remove(CSS_CLASS_OPEN);
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', closeAllDropdowns);
