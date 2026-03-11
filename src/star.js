/**
 * Star button for adding/removing current page from menu
 */

/**
 * Creates the star button for adding current page to menu
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 * @returns {HTMLElement|null} Star wrapper element or null
 */
function createStarButton(menuConfig, onConfigChange) {
  try {
    const currentPath = getActiveSetupPath();
    const isSetup = currentPath.indexOf(SF_SETUP_BASE) === 0;

    if (!isSetup) {
      return null;
    }

    const starWrapper = document.createElement('div');
    starWrapper.className = CSS_CLASS_NAV_ITEM;

    const starBtn = document.createElement('button');
    starBtn.className = `${CSS_CLASS_NAV_BUTTON} sf-star-button`;
    starBtn.title = 'Add this Setup page to menu';

    const starSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    starSvg.setAttribute('viewBox', '0 0 24 24');
    starSvg.setAttribute('width', STAR_BUTTON_CONFIG.iconSize);
    starSvg.setAttribute('height', STAR_BUTTON_CONFIG.iconSize);
    starSvg.setAttribute('aria-hidden', 'true');

    const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPath.setAttribute(
      'd',
      'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
    );

    starSvg.appendChild(starPath);
    starBtn.appendChild(starSvg);

    // Update star appearance based on current path
    function updateStarState() {
      const pathNow = getActiveSetupPath();
      const result = findMenuItemByPath(menuConfig, pathNow);

      // Update visual state
      starSvg.style.fill = result.found ? STAR_BUTTON_CONFIG.fillColor : 'none';
      starSvg.style.stroke = STAR_BUTTON_CONFIG.strokeColor;
      starSvg.style.strokeWidth = STAR_BUTTON_CONFIG.strokeWidth;
      starBtn.title = result.found ? 'Remove from menu' : 'Add this Setup page to menu';

      // Store state for click handler
      starWrapper.dataset.sfFound = result.found ? '1' : '0';
      starWrapper.dataset.sfGroup = String(result.groupIndex);
      starWrapper.dataset.sfIndex = String(result.itemIndex);
    }

    updateStarState();

    // TODO: Replace polling with MutationObserver on iframe src changes
    const pollId = setInterval(() => {
      if (!starWrapper.isConnected) {
        clearInterval(pollId);
        return;
      }
      updateStarState();
    }, STAR_UPDATE_POLL_INTERVAL);

    // Click handler
    starBtn.addEventListener('click', async (e) => {
      e.stopPropagation();

      const pathAtClick = getActiveSetupPath();
      const result = findMenuItemByPath(menuConfig, pathAtClick);

      if (result.found) {
        if (!confirm('Remove this page from your menu?')) return;

        menuConfig[result.groupIndex].items.splice(result.itemIndex, 1);

        try {
          await saveMenuConfig(menuConfig);
          starSvg.style.fill = 'none';
          if (onConfigChange) onConfigChange(menuConfig);
        } catch (err) {
          log('error', 'Failed to save after removing page:', err);
          alert('Failed to save changes: ' + err.message);
        }
      } else {
        openAddPageModal(pathAtClick, menuConfig, onConfigChange);
      }
    });

    starWrapper.appendChild(starBtn);
    return starWrapper;
  } catch (err) {
    log('error', 'Failed to create star button:', err);
    return null;
  }
}

/**
 * Opens modal to add current page to menu
 * @param {string} pagePath - Path to add
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 */
function openAddPageModal(pagePath, menuConfig, onConfigChange) {
  if (!document.getElementById(ADD_PAGE_MODAL_ID)) {
    buildAddPageModal();
  }

  const modal = document.getElementById(ADD_PAGE_MODAL_ID);
  const select = modal.querySelector('#sf-add-page-group');
  const labelInput = modal.querySelector('#sf-add-page-label');
  const message = modal.querySelector(`#${ADD_PAGE_MESSAGE_ID}`);

  // Populate groups
  select.innerHTML = '';
  menuConfig.forEach((group, index) => {
    const opt = document.createElement('option');
    opt.value = String(index);
    opt.textContent = group.title;
    select.appendChild(opt);
  });

  // Check if page already exists
  const result = findMenuItemByPath(menuConfig, pagePath);

  if (result.found) {
    const existing = menuConfig[result.groupIndex].items[result.itemIndex];
    labelInput.value = existing?.label || '';
    select.value = String(result.groupIndex);
    message.textContent =
      'This page is already saved. Edit group or label and click Save to update.';
    message.style.color = '#0b2545';
  } else {
    // Default label from document title or path
    const defaultLabel =
      document.title?.replace(/\s*[-|].*$/, '').trim() ||
      pagePath.split('/').filter(Boolean).pop() ||
      pagePath;
    labelInput.value = defaultLabel;
    message.textContent = '';
  }

  // Store context on modal
  modal.dataset.pagePath = pagePath;
  modal.dataset.existingGroup = result.found ? String(result.groupIndex) : '';
  modal.dataset.existingItem = result.found ? String(result.itemIndex) : '';

  // Set up save handler with current context
  const saveBtn = modal.querySelector('.sf-add-page-save');
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleAddPageSave(modal, menuConfig, onConfigChange);
  });

  modal.style.display = 'flex';
  modal.classList.add('show');
}

/**
 * Handles saving a page to the menu
 * @param {HTMLElement} modal - Modal element
 * @param {Array} menuConfig - Current menu configuration
 * @param {Function} onConfigChange - Callback when config changes
 */
async function handleAddPageSave(modal, menuConfig, onConfigChange) {
  const select = modal.querySelector('#sf-add-page-group');
  const labelInput = modal.querySelector('#sf-add-page-label');
  const message = modal.querySelector(`#${ADD_PAGE_MESSAGE_ID}`);
  const pagePath = modal.dataset.pagePath;

  const groupIndex = parseInt(select.value, 10);
  const label = labelInput.value.trim() || 'New item';

  if (isNaN(groupIndex) || !menuConfig[groupIndex]) {
    showMessage(message, 'Please select a group', 'error', 0);
    return;
  }

  try {
    const relPath = normalizePathForStorage(pagePath);
    const existingGroup = modal.dataset.existingGroup;
    const existingItem = modal.dataset.existingItem;

    if (existingGroup !== '' && existingItem !== '') {
      // Update existing entry
      const exG = parseInt(existingGroup, 10);
      const exI = parseInt(existingItem, 10);

      if (groupIndex === exG) {
        // Update label in same group
        menuConfig[exG].items[exI].label = label;
      } else {
        // Move to different group
        const itemObj = menuConfig[exG].items.splice(exI, 1)[0];
        itemObj.label = label;
        menuConfig[groupIndex].items.push(itemObj);
      }
    } else {
      // Add new entry
      menuConfig[groupIndex].items.push({ label, path: relPath });
    }

    await saveMenuConfig(menuConfig);
    closeAddPageModal();
    if (onConfigChange) onConfigChange(menuConfig);
  } catch (err) {
    log('error', 'Failed to save page:', err);
    showMessage(message, 'Save failed: ' + err.message, 'error', 0);
  }
}

/**
 * Closes the add page modal
 */
function closeAddPageModal() {
  const modal = document.getElementById(ADD_PAGE_MODAL_ID);
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
}

/**
 * Builds the add page modal HTML structure
 */
function buildAddPageModal() {
  const modal = document.createElement('div');
  modal.id = ADD_PAGE_MODAL_ID;
  modal.className = 'sf-modal';

  const box = document.createElement('div');
  box.className = 'sf-modal-box';

  const title = document.createElement('h3');
  title.textContent = 'Add this Setup page to your menu';
  title.className = 'sf-modal-title';

  const groupLabel = document.createElement('label');
  groupLabel.textContent = 'Choose top-level menu group';
  groupLabel.className = 'sf-modal-label';

  const select = document.createElement('select');
  select.id = 'sf-add-page-group';
  select.className = 'sf-modal-select';

  const labelLabel = document.createElement('label');
  labelLabel.textContent = 'Menu label for this page';
  labelLabel.className = 'sf-modal-label';

  const labelInput = document.createElement('input');
  labelInput.id = 'sf-add-page-label';
  labelInput.type = 'text';
  labelInput.className = 'sf-modal-input';

  const controls = document.createElement('div');
  controls.className = 'sf-modal-controls';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'sf-btn';
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeAddPageModal();
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'sf-btn sf-btn-primary sf-add-page-save';

  const msg = document.createElement('div');
  msg.id = ADD_PAGE_MESSAGE_ID;
  msg.className = 'sf-modal-message';

  controls.appendChild(cancelBtn);
  controls.appendChild(saveBtn);

  box.appendChild(title);
  box.appendChild(groupLabel);
  box.appendChild(select);
  box.appendChild(labelLabel);
  box.appendChild(labelInput);
  box.appendChild(msg);
  box.appendChild(controls);

  modal.appendChild(box);
  document.body.appendChild(modal);

  // Close when clicking outside
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeAddPageModal();
  });
}
