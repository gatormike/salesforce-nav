/**
 * History button and dropdown for recently visited Setup pages
 */

/**
 * Creates the history button with a dropdown of recently visited pages
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 * @returns {HTMLElement} History button wrapper
 */
function createHistoryButton(menuConfig, onConfigChange) {
  const historyItem = document.createElement('div');
  historyItem.className = CSS_CLASS_NAV_ITEM;

  const historyButton = document.createElement('button');
  historyButton.className = `${CSS_CLASS_NAV_BUTTON} sf-history-button`;
  historyButton.title = 'Recently visited pages';

  // Clock/history SVG icon (backwards clock arrow)
  historyButton.innerHTML = `<svg viewBox="0 0 24 24" width="${HISTORY_BUTTON_CONFIG.iconSize}" height="${HISTORY_BUTTON_CONFIG.iconSize}" aria-hidden="true" focusable="false" fill="${HISTORY_BUTTON_CONFIG.iconColor}"><path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z"/><path d="M13 3V1l-4 4 4 4V5a7 7 0 0 1 7 7h2a9 9 0 0 0-9-9z"/><path d="M12 8v5l3.5 2.1.8-1.3-3.3-2V8H12z"/></svg>`;

  const dropdown = document.createElement('div');
  dropdown.className = CSS_CLASS_NAV_DROPDOWN + ' sf-history-dropdown';
  dropdown.id = HISTORY_DROPDOWN_ID;

  // Toggle dropdown on click
  historyButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = historyItem.classList.contains(CSS_CLASS_OPEN);

    // Close all other dropdowns
    document.querySelectorAll(`.${CSS_CLASS_NAV_ITEM}.${CSS_CLASS_OPEN}`).forEach(mi => {
      mi.classList.remove(CSS_CLASS_OPEN);
    });

    if (!isOpen) {
      await refreshHistoryDropdown(dropdown, menuConfig, onConfigChange);
      historyItem.classList.add(CSS_CLASS_OPEN);
    }
  });

  // Open on hover (desktop)
  historyItem.addEventListener('mouseenter', async () => {
    document.querySelectorAll(`.${CSS_CLASS_NAV_ITEM}.${CSS_CLASS_OPEN}`).forEach(mi => {
      mi.classList.remove(CSS_CLASS_OPEN);
    });
    await refreshHistoryDropdown(dropdown, menuConfig, onConfigChange);
    historyItem.classList.add(CSS_CLASS_OPEN);
  });

  historyItem.addEventListener('mouseleave', () => {
    historyItem.classList.remove(CSS_CLASS_OPEN);
  });

  historyItem.appendChild(historyButton);
  historyItem.appendChild(dropdown);
  return historyItem;
}

/**
 * Loads history and renders dropdown items
 * @param {HTMLElement} dropdown - Dropdown container element
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 */
async function refreshHistoryDropdown(dropdown, menuConfig, onConfigChange) {
  dropdown.innerHTML = '';

  const history = await loadHistory();

  if (!history.length) {
    const empty = document.createElement('div');
    empty.className = 'sf-history-empty';
    empty.textContent = 'No history yet';
    dropdown.appendChild(empty);
    return;
  }

  history.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'sf-history-item';

    const link = document.createElement('a');
    link.className = CSS_CLASS_NAV_LINK + ' sf-history-link';
    const fullPath = resolveConfigPath(entry.path);
    link.href = fullPath;
    link.textContent = entry.label || entry.path;
    link.title = fullPath;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = fullPath;
    });

    row.appendChild(link);

    // Only show Quick Add button if the page is NOT already in the menu
    const result = findMenuItemByPath(menuConfig, fullPath);
    if (!result.found) {
      const addBtn = document.createElement('button');
      addBtn.className = 'sf-history-add-btn';
      addBtn.textContent = '+';
      addBtn.title = 'Quick add to menu';

      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close history dropdown before opening add modal
        const historyNavItem = dropdown.closest(`.${CSS_CLASS_NAV_ITEM}`);
        if (historyNavItem) historyNavItem.classList.remove(CSS_CLASS_OPEN);
        openAddPageModal(fullPath, menuConfig, onConfigChange);
      });

      row.appendChild(addBtn);
    }

    dropdown.appendChild(row);
  });

  // Clear history action at the bottom
  const divider = document.createElement('div');
  divider.className = 'sf-history-divider';
  dropdown.appendChild(divider);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'sf-history-clear-btn';
  clearBtn.textContent = 'Clear history';
  clearBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await clearHistory();
    dropdown.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'sf-history-empty';
    empty.textContent = 'No history yet';
    dropdown.appendChild(empty);
  });
  dropdown.appendChild(clearBtn);
}
