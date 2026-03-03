/**
 * Settings modal for managing menu configuration
 */

/**
 * Creates the settings gear button
 * @param {Function} onOpenSettings - Callback when settings is opened
 * @returns {HTMLElement} Settings button wrapper
 */
function createSettingsButton(onOpenSettings) {
  const settingsItem = document.createElement('div');
  settingsItem.className = CSS_CLASS_NAV_ITEM;

  const settingsButton = document.createElement('button');
  settingsButton.className = `${CSS_CLASS_NAV_BUTTON} sf-settings-button`;
  settingsButton.title = 'Open menu settings';

  // Gear SVG icon
  settingsButton.innerHTML = `<svg viewBox="0 0 24 24" width="${SETTINGS_BUTTON_CONFIG.iconSize}" height="${SETTINGS_BUTTON_CONFIG.iconSize}" aria-hidden="true" focusable="false"><path fill="${SETTINGS_BUTTON_CONFIG.iconColor}" d="M19.14,12.94a7.14,7.14,0,0,0,0-1.88l2.11-1.65a.5.5,0,0,0,.12-.64l-2-3.46a.5.5,0,0,0-.6-.22l-2.49,1a6.8,6.8,0,0,0-1.61-.94l-.38-2.65A.5.5,0,0,0,13.86,2h-3.7a.5.5,0,0,0-.5.42L9.28,5.07A6.8,6.8,0,0,0,7.67,6l-2.49-1a.5.5,0,0,0-.6.22L2.6,8.69a.5.5,0,0,0,.12.64L4.83,11a7.14,7.14,0,0,0,0,1.88L2.72,14.53a.5.5,0,0,0-.12.64l2,3.46a.5.5,0,0,0,.6.22l2.49-1a6.8,6.8,0,0,0,1.61.94l.38,2.65a.5.5,0,0,0,.5.42h3.7a.5.5,0,0,0,.5-.42l.38-2.65a6.8,6.8,0,0,0,1.61-.94l2.49,1a.5.5,0,0,0,.6-.22l2-3.46a.5.5,0,0,0-.12-.64ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"></path></svg>`;

  settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onOpenSettings) onOpenSettings();
  });

  settingsItem.appendChild(settingsButton);
  return settingsItem;
}

/**
 * Opens the settings modal
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 */
function openSettingsModal(menuConfig, onConfigChange) {
  if (!document.getElementById(SETTINGS_MODAL_ID)) {
    buildSettingsModal(menuConfig, onConfigChange);
  }

  const modal = document.getElementById(SETTINGS_MODAL_ID);
  if (!modal) return;

  modal.style.display = 'flex';
  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
  renderSettingsAdmin(menuConfig, onConfigChange);
}

/**
 * Closes the settings modal
 */
function closeSettingsModal() {
  const modal = document.getElementById(SETTINGS_MODAL_ID);
  if (!modal) return;

  // Animate out
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 200);
}

/**
 * Builds the settings modal HTML structure
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 */
function buildSettingsModal(menuConfig, onConfigChange) {
  const modal = document.createElement('div');
  modal.id = SETTINGS_MODAL_ID;
  modal.className = 'sf-modal sf-settings-modal';

  const box = document.createElement('div');
  box.className = 'sf-modal-box sf-settings-box';

  const admin = document.createElement('div');
  admin.className = 'sf-settings-admin';

  const header = document.createElement('div');
  header.className = 'sf-settings-header';

  const headerContent = document.createElement('div');
  headerContent.className = 'sf-settings-header-content';

  const title = document.createElement('h2');
  title.className = 'sf-settings-title';
  title.textContent = 'Menu Configuration';

  const info = document.createElement('div');
  info.className = 'sf-settings-info';
  info.textContent = 'Manage your menu groups and items. Drag to reorder, click buttons to add or remove.';

  headerContent.appendChild(title);
  headerContent.appendChild(info);

  const addGroupBtn = document.createElement('button');
  addGroupBtn.innerHTML = '+ Add Group';
  addGroupBtn.className = 'sf-btn sf-btn-secondary';
  addGroupBtn.addEventListener('click', () => {
    menuConfig.push({ title: 'New Group', items: [] });
    renderSettingsAdmin(menuConfig, onConfigChange);
  });

  header.appendChild(headerContent);
  header.appendChild(addGroupBtn);

  const groupsList = document.createElement('div');
  groupsList.id = SETTINGS_GROUPS_CONTAINER_ID;
  groupsList.className = 'sf-settings-groups';

  const footer = document.createElement('div');
  footer.className = 'sf-settings-footer';

  const message = document.createElement('div');
  message.id = SETTINGS_MESSAGE_ID;
  message.className = 'sf-settings-message';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export';
  exportBtn.className = 'sf-btn';
  exportBtn.addEventListener('click', () => handleExport(menuConfig, message));

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.className = 'sf-btn';
  resetBtn.addEventListener('click', () => handleReset(menuConfig, onConfigChange, message));

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'sf-btn sf-btn-primary';
  saveBtn.addEventListener('click', () => handleSave(menuConfig, onConfigChange, message));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.className = 'sf-btn';
  closeBtn.addEventListener('click', closeSettingsModal);

  footer.appendChild(message);
  footer.appendChild(exportBtn);
  footer.appendChild(resetBtn);
  footer.appendChild(saveBtn);
  footer.appendChild(closeBtn);

  admin.appendChild(header);
  admin.appendChild(groupsList);
  admin.appendChild(footer);
  box.appendChild(admin);
  modal.appendChild(box);
  document.body.appendChild(modal);

  // Close when clicking outside
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeSettingsModal();
  });
}

/**
 * Renders the settings admin interface
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 */
function renderSettingsAdmin(menuConfig, onConfigChange) {
  const groupsList = document.getElementById(SETTINGS_GROUPS_CONTAINER_ID);
  if (!groupsList) return;

  groupsList.innerHTML = '';

  if (!Array.isArray(menuConfig)) {
    menuConfig = [];
  }

  menuConfig.forEach((group, groupIndex) => {
    const gCard = document.createElement('div');
    gCard.className = 'sf-settings-group';

    const gHeader = document.createElement('div');
    gHeader.className = 'sf-settings-group-header';

    // Add drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'sf-settings-drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Drag to reorder';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = group.title || '';
    titleInput.className = 'sf-settings-group-title';
    titleInput.placeholder = 'Group name...';
    titleInput.addEventListener('input', () => {
      menuConfig[groupIndex].title = titleInput.value;
    });

    gHeader.appendChild(dragHandle);

    const gControls = document.createElement('div');
    gControls.className = 'sf-settings-controls';

    const upBtn = createControlButton('⬆', 'Move group up', () => {
      if (groupIndex > 0) {
        const item = menuConfig.splice(groupIndex, 1)[0];
        menuConfig.splice(groupIndex - 1, 0, item);
        renderSettingsAdmin(menuConfig, onConfigChange);
      }
    });

    const downBtn = createControlButton('⬇', 'Move group down', () => {
      if (groupIndex < menuConfig.length - 1) {
        const item = menuConfig.splice(groupIndex, 1)[0];
        menuConfig.splice(groupIndex + 1, 0, item);
        renderSettingsAdmin(menuConfig, onConfigChange);
      }
    });

    const addItemBtn = createControlButton('+ Item', 'Add item to group', () => {
      menuConfig[groupIndex].items.push({ label: 'New item', path: '' });
      renderSettingsAdmin(menuConfig, onConfigChange);
    });

    const removeBtn = createControlButton(
      '🗑',
      'Remove group',
      () => {
        if (confirm(`Remove group "${group.title || ''}"?`)) {
          menuConfig.splice(groupIndex, 1);
          renderSettingsAdmin(menuConfig, onConfigChange);
        }
      },
      'sf-btn-danger'
    );

    gControls.appendChild(upBtn);
    gControls.appendChild(downBtn);
    gControls.appendChild(addItemBtn);
    gControls.appendChild(removeBtn);

    gHeader.appendChild(titleInput);
    gHeader.appendChild(gControls);

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'sf-settings-items';

    (group.items || []).forEach((item, itemIndex) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'sf-settings-item';

      // Add item drag handle
      const itemDrag = document.createElement('div');
      itemDrag.className = 'sf-settings-item-drag';
      itemDrag.innerHTML = '⋮';
      itemDrag.title = 'Drag to reorder';

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = item.label || '';
      labelInput.placeholder = 'Menu label...';
      labelInput.className = 'sf-settings-item-label';
      labelInput.addEventListener('input', () => {
        menuConfig[groupIndex].items[itemIndex].label = labelInput.value;
      });

      const pathInput = document.createElement('input');
      pathInput.type = 'text';
      pathInput.value = item.path || '';
      pathInput.placeholder = 'ManageUsers/home';
      pathInput.className = 'sf-settings-item-path';
      pathInput.addEventListener('input', () => {
        menuConfig[groupIndex].items[itemIndex].path = pathInput.value;
      });

      itemRow.appendChild(itemDrag);

      const itemControls = document.createElement('div');
      itemControls.className = 'sf-settings-item-controls';

      const upItemBtn = createControlButton('⬆', 'Move item up', () => {
        if (itemIndex > 0) {
          const item = menuConfig[groupIndex].items.splice(itemIndex, 1)[0];
          menuConfig[groupIndex].items.splice(itemIndex - 1, 0, item);
          renderSettingsAdmin(menuConfig, onConfigChange);
        }
      });

      const downItemBtn = createControlButton('⬇', 'Move item down', () => {
        if (itemIndex < menuConfig[groupIndex].items.length - 1) {
          const item = menuConfig[groupIndex].items.splice(itemIndex, 1)[0];
          menuConfig[groupIndex].items.splice(itemIndex + 1, 0, item);
          renderSettingsAdmin(menuConfig, onConfigChange);
        }
      });

      const removeItemBtn = createControlButton(
        '✕',
        'Remove item',
        () => {
          if (confirm(`Remove item "${item.label || ''}"?`)) {
            menuConfig[groupIndex].items.splice(itemIndex, 1);
            renderSettingsAdmin(menuConfig, onConfigChange);
          }
        },
        'sf-btn-danger'
      );

      itemControls.appendChild(upItemBtn);
      itemControls.appendChild(downItemBtn);
      itemControls.appendChild(removeItemBtn);

      itemRow.appendChild(labelInput);
      itemRow.appendChild(pathInput);
      itemRow.appendChild(itemControls);
      itemsWrap.appendChild(itemRow);
    });

    gCard.appendChild(gHeader);
    gCard.appendChild(itemsWrap);
    groupsList.appendChild(gCard);
  });
}

/**
 * Creates a control button
 * @param {string} text - Button text
 * @param {string} title - Button title/tooltip
 * @param {Function} onClick - Click handler
 * @param {string} extraClass - Additional CSS class
 * @returns {HTMLElement} Button element
 */
function createControlButton(text, title, onClick, extraClass = '') {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.title = title;
  btn.className = `sf-btn-small ${extraClass}`;
  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * Handles saving configuration
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 * @param {HTMLElement} messageElement - Message display element
 */
async function handleSave(menuConfig, onConfigChange, messageElement) {
  try {
    await saveMenuConfig(menuConfig);
    messageElement.textContent = '✓ Configuration saved successfully!';
    messageElement.className = 'sf-settings-message success';

    // Refresh the menu
    removeExistingMenu();
    const setupContainer = findSetupContainer();
    if (setupContainer) {
      injectMenu(setupContainer, menuConfig);
    }

    if (onConfigChange) onConfigChange(menuConfig);

    setTimeout(() => {
      messageElement.textContent = '';
      messageElement.className = 'sf-settings-message';
    }, 3000);
  } catch (err) {
    log('error', 'Save failed:', err);
    messageElement.textContent = '✗ Error: ' + err.message;
    messageElement.className = 'sf-settings-message error';
  }
}

/**
 * Handles resetting configuration to default
 * @param {Array} menuConfig - Current menu configuration (will be mutated)
 * @param {Function} onConfigChange - Callback when config changes
 * @param {HTMLElement} messageElement - Message display element
 */
async function handleReset(menuConfig, onConfigChange, messageElement) {
  if (!confirm('Reset to default configuration? This will delete all your custom menu items.')) return;

  try {
    await resetMenuConfig();
    const defaultConfig = deepClone(DEFAULT_MENU_CONFIG);

    // Update the passed array in place
    menuConfig.length = 0;
    menuConfig.push(...defaultConfig);

    messageElement.textContent = '✓ Configuration reset to defaults';
    messageElement.className = 'sf-settings-message success';
    renderSettingsAdmin(menuConfig, onConfigChange);

    if (onConfigChange) onConfigChange(menuConfig);

    setTimeout(() => {
      messageElement.textContent = '';
      messageElement.className = 'sf-settings-message';
    }, 3000);
  } catch (err) {
    log('error', 'Reset failed:', err);
    messageElement.textContent = '✗ Error: ' + err.message;
    messageElement.className = 'sf-settings-message error';
  }
}

/**
 * Handles exporting configuration
 * @param {Array} menuConfig - Current menu configuration
 * @param {HTMLElement} messageElement - Message display element
 */
function handleExport(menuConfig, messageElement) {
  try {
    const blob = new Blob([JSON.stringify(menuConfig, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sf-nav-config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    messageElement.textContent = '✓ Configuration exported';
    messageElement.className = 'sf-settings-message success';

    setTimeout(() => {
      messageElement.textContent = '';
      messageElement.className = 'sf-settings-message';
    }, 2000);
  } catch (err) {
    log('error', 'Export failed:', err);
    messageElement.textContent = '✗ Export failed: ' + err.message;
    messageElement.className = 'sf-settings-message error';
  }
}
