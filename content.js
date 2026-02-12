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

  // Add a stateful star button for adding/removing the current Setup page
  try {
    const currentPath = window.location.pathname || '';
    const isSetup = currentPath.indexOf('/lightning/setup/') === 0;
    if (isSetup) {
      // find if this page exists in the config
      let existing = { found: false, group: -1, index: -1 };
      for (let gi = 0; gi < menuConfig.length; gi++) {
        const ii = (menuConfig[gi].items || []).findIndex(it => it.path === currentPath);
        if (ii !== -1) { existing = { found: true, group: gi, index: ii }; break; }
      }

      const starWrapper = document.createElement('div');
      starWrapper.className = 'sf-nav-item';

      const starBtn = document.createElement('button');
      starBtn.className = 'sf-nav-button';
      starBtn.title = existing.found ? 'Remove from menu' : 'Add this Setup page to menu';
      starBtn.style.width = '40px';
      starBtn.style.display = 'flex';
      starBtn.style.alignItems = 'center';
      starBtn.style.justifyContent = 'center';

      const starSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      starSvg.setAttribute('viewBox', '0 0 24 24');
      starSvg.setAttribute('width', '16');
      starSvg.setAttribute('height', '16');
      starSvg.style.display = 'block';
      starSvg.style.fill = existing.found ? '#f6c600' : 'none';
      starSvg.style.stroke = '#666';
      starSvg.style.strokeWidth = '1';
      const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      starPath.setAttribute('d', 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z');
      starSvg.appendChild(starPath);

      starBtn.appendChild(starSvg);

      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // refresh existence
        let ex = { found: false, group: -1, index: -1 };
        for (let gi = 0; gi < menuConfig.length; gi++) {
          const ii = (menuConfig[gi].items || []).findIndex(it => it.path === currentPath);
          if (ii !== -1) { ex = { found: true, group: gi, index: ii }; break; }
        }

        if (ex.found) {
          if (!confirm('Remove this page from your menu?')) return;
          menuConfig[ex.group].items.splice(ex.index, 1);
          chrome.storage.sync.set({ menuConfig: menuConfig }, () => {
            // update star appearance
            starSvg.style.fill = 'none';
          });
        } else {
          openAddPageModal(currentPath);
        }
      });

      starWrapper.appendChild(starBtn);
      // insert before first item so it's first on the bar
      menuBar.insertBefore(starWrapper, menuBar.firstChild);
    }
  } catch (err) {
    console.error('[SF Nav] Failed to add star button', err);
  }

  // Add a Settings gear button that opens the admin in a modal
    const settingsItem = document.createElement('div');
    settingsItem.className = 'sf-nav-item';

    const settingsButton = document.createElement('button');
    settingsButton.className = 'sf-nav-button';
    settingsButton.title = 'Open menu settings';
    settingsButton.style.width = '40px';
    settingsButton.style.display = 'flex';
    settingsButton.style.alignItems = 'center';
    settingsButton.style.justifyContent = 'center';

    // Gear SVG
    settingsButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="#666" d="M19.14,12.94a7.14,7.14,0,0,0,0-1.88l2.11-1.65a.5.5,0,0,0,.12-.64l-2-3.46a.5.5,0,0,0-.6-.22l-2.49,1a6.8,6.8,0,0,0-1.61-.94l-.38-2.65A.5.5,0,0,0,13.86,2h-3.7a.5.5,0,0,0-.5.42L9.28,5.07A6.8,6.8,0,0,0,7.67,6l-2.49-1a.5.5,0,0,0-.6.22L2.6,8.69a.5.5,0,0,0,.12.64L4.83,11a7.14,7.14,0,0,0,0,1.88L2.72,14.53a.5.5,0,0,0-.12.64l2,3.46a.5.5,0,0,0,.6.22l2.49-1a6.8,6.8,0,0,0,1.61.94l.38,2.65a.5.5,0,0,0,.5.42h3.7a.5.5,0,0,0,.5-.42l.38-2.65a6.8,6.8,0,0,0,1.61-.94l2.49,1a.5.5,0,0,0,.6-.22l2-3.46a.5.5,0,0,0-.12-.64ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"></path></svg>';

    settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal();
    });

    settingsItem.appendChild(settingsButton);
    menuBar.appendChild(settingsItem);

    function openSettingsModal() {
      if (!document.getElementById('sf-settings-modal')) buildSettingsModal();
      const modal = document.getElementById('sf-settings-modal');
      if (!modal) return;
      modal.style.display = 'flex';
      // render current state
      if (typeof renderSettingsAdmin === 'function') renderSettingsAdmin();
    }

    function closeSettingsModal() {
      const modal = document.getElementById('sf-settings-modal');
      if (modal) modal.style.display = 'none';
    }

    function buildSettingsModal() {
      const modal = document.createElement('div');
      modal.id = 'sf-settings-modal';
      modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:100001;';

      const box = document.createElement('div');
      box.style.cssText = 'width:820px;max-height:80vh;overflow:auto;background:#fff;padding:16px;border-radius:8px;box-shadow:0 6px 30px rgba(0,0,0,0.3);font-family:inherit;color:#0b2545';

      const admin = document.createElement('div');
      admin.className = 'sf-settings-admin';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '8px';

      const info = document.createElement('div');
      info.style.fontSize = '14px';
      info.style.color = '#333';
      info.textContent = 'Manage your menu groups and items. Add, edit, reorder, and save.';

      const addGroupBtn = document.createElement('button');
      addGroupBtn.textContent = 'Add Group';
      addGroupBtn.className = 'sf-btn sf-btn-secondary';
      addGroupBtn.style.marginLeft = '8px';
      addGroupBtn.addEventListener('click', () => {
        menuConfig.push({ title: 'New Group', items: [] });
        window.renderSettingsAdmin();
      });

      header.appendChild(info);
      header.appendChild(addGroupBtn);

      const groupsList = document.createElement('div');
      groupsList.id = 'sf-settings-groups-modal';
      groupsList.style.maxHeight = '64vh';
      groupsList.style.overflow = 'auto';

      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.gap = '8px';
      footer.style.marginTop = '10px';
      footer.style.justifyContent = 'flex-end';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = 'sf-btn sf-btn-primary';

      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';
      resetBtn.className = 'sf-btn';

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.className = 'sf-btn';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.className = 'sf-btn';
      closeBtn.addEventListener('click', () => closeSettingsModal());

      const message = document.createElement('div');
      message.id = 'sf-settings-message-modal';
      message.style.minWidth = '180px';
      message.style.textAlign = 'left';
      message.style.marginRight = 'auto';

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

      // Close when clicking outside box
      modal.addEventListener('click', (ev) => { if (ev.target === modal) closeSettingsModal(); });

      // Render helper
      window.renderSettingsAdmin = function() {
        groupsList.innerHTML = '';
        if (!Array.isArray(menuConfig)) menuConfig = [];

        menuConfig.forEach((group, gi) => {
          const gCard = document.createElement('div');
          gCard.className = 'sf-settings-group';

          const gHeader = document.createElement('div');
          gHeader.className = 'sf-settings-group-header';

          const titleInput = document.createElement('input');
          titleInput.type = 'text';
          titleInput.value = group.title || '';
          titleInput.className = 'sf-settings-group-title';
          titleInput.addEventListener('input', () => { menuConfig[gi].title = titleInput.value; });

          const gControls = document.createElement('div');

          const upG = document.createElement('button'); upG.textContent = '↑'; upG.title = 'Move group up'; upG.className='sf-btn-small';
          const downG = document.createElement('button'); downG.textContent = '↓'; downG.title = 'Move group down'; downG.className='sf-btn-small';
          const addItemBtn = document.createElement('button'); addItemBtn.textContent = '+ Item'; addItemBtn.className='sf-btn-small';
          const removeG = document.createElement('button'); removeG.textContent = 'Remove'; removeG.className='sf-btn-small sf-btn-danger';

          upG.addEventListener('click', () => { if (gi>0) { const a=menuConfig.splice(gi,1)[0]; menuConfig.splice(gi-1,0,a); window.renderSettingsAdmin(); }});
          downG.addEventListener('click', () => { if (gi<menuConfig.length-1) { const a=menuConfig.splice(gi,1)[0]; menuConfig.splice(gi+1,0,a); window.renderSettingsAdmin(); }});
          addItemBtn.addEventListener('click', () => { menuConfig[gi].items.push({ label: 'New item', path: '/lightning/setup/' }); window.renderSettingsAdmin(); });
          removeG.addEventListener('click', () => { if (confirm('Remove group "' + (group.title||'') + '"?')){ menuConfig.splice(gi,1); window.renderSettingsAdmin(); }});

          gControls.appendChild(upG); gControls.appendChild(downG); gControls.appendChild(addItemBtn); gControls.appendChild(removeG);

          gHeader.appendChild(titleInput);
          gHeader.appendChild(gControls);

          const itemsWrap = document.createElement('div');
          itemsWrap.className = 'sf-settings-items';

          (group.items||[]).forEach((it, ii) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'sf-settings-item';

            const labelInput = document.createElement('input'); labelInput.type='text'; labelInput.value = it.label || ''; labelInput.placeholder='Label'; labelInput.className='sf-settings-item-label';
            const pathInput = document.createElement('input'); pathInput.type='text'; pathInput.value = it.path || ''; pathInput.placeholder='/lightning/setup/...'; pathInput.className='sf-settings-item-path';

            labelInput.addEventListener('input', () => { menuConfig[gi].items[ii].label = labelInput.value; });
            pathInput.addEventListener('input', () => { menuConfig[gi].items[ii].path = pathInput.value; });

            const itemControls = document.createElement('div');
            const upI = document.createElement('button'); upI.textContent='↑'; upI.className='sf-btn-small'; upI.title='Move item up';
            const downI = document.createElement('button'); downI.textContent='↓'; downI.className='sf-btn-small'; downI.title='Move item down';
            const removeI = document.createElement('button'); removeI.textContent='Remove'; removeI.className='sf-btn-small sf-btn-danger';

            upI.addEventListener('click', () => { if (ii>0) { const a=menuConfig[gi].items.splice(ii,1)[0]; menuConfig[gi].items.splice(ii-1,0,a); window.renderSettingsAdmin(); }});
            downI.addEventListener('click', () => { if (ii<menuConfig[gi].items.length-1) { const a=menuConfig[gi].items.splice(ii,1)[0]; menuConfig[gi].items.splice(ii+1,0,a); window.renderSettingsAdmin(); }});
            removeI.addEventListener('click', () => { if (confirm('Remove item "' + (it.label||'') + '"?')){ menuConfig[gi].items.splice(ii,1); window.renderSettingsAdmin(); }});

            itemControls.appendChild(upI); itemControls.appendChild(downI); itemControls.appendChild(removeI);

            itemRow.appendChild(labelInput);
            itemRow.appendChild(pathInput);
            itemRow.appendChild(itemControls);
            itemsWrap.appendChild(itemRow);
          });

          gCard.appendChild(gHeader);
          gCard.appendChild(itemsWrap);
          groupsList.appendChild(gCard);
        });
      };

      // Save handler
      saveBtn.addEventListener('click', () => {
        try {
          if (!Array.isArray(menuConfig)) throw new Error('Configuration must be an array');
          menuConfig.forEach((group, gi) => {
            if (!group.title || !Array.isArray(group.items)) throw new Error(`Group ${gi} must have title and items`);
            group.items.forEach((it, ii) => {
              if (!it.label || !it.path) throw new Error(`Item ${ii} in group ${gi} must have label and path`);
            });
          });

          chrome.storage.sync.set({ menuConfig: menuConfig }, () => {
            message.textContent = 'Configuration saved';
            message.style.color = '#1f6f3d';
            setTimeout(()=>{ message.textContent=''; }, 2500);
            const existingMenu = document.getElementById('sf-custom-nav');
            if (existingMenu) { existingMenu.remove(); }
            const setupContainer = findSetupContainer();
            if (setupContainer) injectMenu(setupContainer);
          });
        } catch (err) {
          message.textContent = 'Error: ' + err.message;
          message.style.color = '#8b1b1b';
        }
      });

      // Reset handler
      resetBtn.addEventListener('click', () => {
        if (!confirm('Reset to default configuration?')) return;
        menuConfig = JSON.parse(JSON.stringify(DEFAULT_MENU_CONFIG));
        chrome.storage.sync.set({ menuConfig: menuConfig }, () => {
          message.textContent = 'Reset to default';
          message.style.color = '#1f6f3d';
          window.renderSettingsAdmin();
          setTimeout(()=>{ message.textContent=''; }, 2500);
        });
      });

      // Export handler
      exportBtn.addEventListener('click', () => {
        try {
          const blob = new Blob([JSON.stringify(menuConfig, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sf-nav-config.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          message.textContent = 'Export failed: ' + err.message;
          message.style.color = '#8b1b1b';
        }
      });
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

// --- Add page modal logic --------------------------------------------------
function openAddPageModal(pagePath) {
  if (!document.getElementById('sf-add-page-modal')) {
    buildAddPageModal();
  }

  const modal = document.getElementById('sf-add-page-modal');
  const select = modal.querySelector('#sf-add-page-group');
  const labelInput = modal.querySelector('#sf-add-page-label');
  const message = modal.querySelector('#sf-add-page-message');

  // Populate groups
  select.innerHTML = '';
  menuConfig.forEach((g, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = g.title;
    select.appendChild(opt);
  });

  // Detect if page already exists in config and store indices on modal
  let existingGroup = -1, existingItem = -1;
  for (let gi = 0; gi < menuConfig.length; gi++) {
    const ii = menuConfig[gi].items.findIndex(it => it.path === pagePath);
    if (ii !== -1) {
      existingGroup = gi; existingItem = ii; break;
    }
  }
  if (existingGroup !== -1) {
    modal.dataset.existingGroup = String(existingGroup);
    modal.dataset.existingItem = String(existingItem);
  } else {
    delete modal.dataset.existingGroup;
    delete modal.dataset.existingItem;
  }

  // Default label from existing entry (if present) or document title / path
  if (existingGroup !== -1) {
    const existing = menuConfig[existingGroup].items[existingItem];
    labelInput.value = existing && existing.label ? existing.label : '';
    select.value = String(existingGroup);
    message.textContent = 'This page is already saved in your configuration. Edit group or label and click Save to update.';
    message.style.color = '#0b2545';
  } else {
    const defaultLabel = (document.title && document.title.replace(/\s*[-|].*$/, '').trim()) || pagePath.split('/').filter(Boolean).pop() || pagePath;
    labelInput.value = defaultLabel;
    message.textContent = '';
  }
  message.textContent = '';

  modal.style.display = 'flex';
}

function closeAddPageModal() {
  const modal = document.getElementById('sf-add-page-modal');
  if (modal) modal.style.display = 'none';
}

function buildAddPageModal() {
  const modal = document.createElement('div');
  modal.id = 'sf-add-page-modal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:100000;';

  const box = document.createElement('div');
  box.style.cssText = 'width:420px;background:#fff;padding:16px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.2);font-family:inherit;color:#0b2545';

  const title = document.createElement('h3');
  title.textContent = 'Add this Setup page to your menu';
  title.style.margin = '0 0 8px 0';
  title.style.color = '#0070d2';

  const groupLabel = document.createElement('label');
  groupLabel.textContent = 'Choose top-level menu group';
  groupLabel.style.fontSize = '13px';
  groupLabel.style.marginTop = '8px';

  const select = document.createElement('select');
  select.id = 'sf-add-page-group';
  select.style.cssText = 'width:100%;margin-top:6px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px';

  const labelLabel = document.createElement('label');
  labelLabel.textContent = 'Menu label for this page';
  labelLabel.style.fontSize = '13px';
  labelLabel.style.marginTop = '10px';

  const labelInput = document.createElement('input');
  labelInput.id = 'sf-add-page-label';
  labelInput.type = 'text';
  labelInput.style.cssText = 'width:100%;margin-top:6px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px';

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'background:#f3f3f3;border:1px solid #ddd;padding:8px 12px;border-radius:6px;cursor:pointer';
  cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeAddPageModal(); });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'background:#0070d2;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer';
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const idx = parseInt(select.value, 10);
    const label = labelInput.value.trim() || 'New item';
    const path = window.location.pathname || '';

    if (isNaN(idx) || !menuConfig[idx]) {
      const msg = modal.querySelector('#sf-add-page-message');
      msg.textContent = 'Please select a group';
      msg.style.color = '#8b1b1b';
      return;
    }

    // Prevent duplicates
    const already = menuConfig.some(g => g.items.some(it => it.path === path));
    if (already) {
      const msg = modal.querySelector('#sf-add-page-message');
      msg.textContent = 'This page is already in your configuration';
      msg.style.color = '#8b1b1b';
      closeAddPageModal();
      return;
    }

    // Append or update and save
    try {
      const exGroupAttr = modal.dataset.existingGroup;
      const exItemAttr = modal.dataset.existingItem;
      if (typeof exGroupAttr !== 'undefined' && typeof exItemAttr !== 'undefined') {
        const exG = parseInt(exGroupAttr, 10);
        const exI = parseInt(exItemAttr, 10);

        if (!menuConfig[exG] || !menuConfig[exG].items[exI] || menuConfig[exG].items[exI].path !== path) {
          // existing entry no longer valid (changed elsewhere) — fall back to add
          menuConfig[idx].items.push({ label: label, path: path });
        } else {
          if (idx === exG) {
            // Update label in same group
            menuConfig[exG].items[exI].label = label;
          } else {
            // Move entry to another group
            const itemObj = menuConfig[exG].items.splice(exI, 1)[0];
            itemObj.label = label;
            menuConfig[idx].items.push(itemObj);
          }
        }
      } else {
        // New entry
        menuConfig[idx].items.push({ label: label, path: path });
      }

      chrome.storage.sync.set({ menuConfig: menuConfig }, () => {
        closeAddPageModal();
      });
    } catch (err) {
      const msg = modal.querySelector('#sf-add-page-message');
      msg.textContent = 'Save failed: ' + (err && err.message ? err.message : String(err));
      msg.style.color = '#8b1b1b';
    }
  });

  const msg = document.createElement('div');
  msg.id = 'sf-add-page-message';
  msg.style.cssText = 'margin-top:10px;font-size:13px;min-height:18px';

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
}

