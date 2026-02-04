// Load current configuration
document.addEventListener('DOMContentLoaded', function() {
  const configTextarea = document.getElementById('config');
  const saveButton = document.getElementById('save');
  const resetButton = document.getElementById('reset');
  const messageDiv = document.getElementById('message');
  
  // Load saved config or use default
  chrome.storage.sync.get(['menuConfig'], function(result) {
    const config = result.menuConfig || DEFAULT_MENU_CONFIG;
    configTextarea.value = JSON.stringify(config, null, 2);
  });
  
  // Save configuration
  saveButton.addEventListener('click', function() {
    try {
      const config = JSON.parse(configTextarea.value);
      
      // Validate structure
      if (!Array.isArray(config)) {
        throw new Error('Configuration must be an array');
      }
      
      config.forEach((group, index) => {
        if (!group.title || !Array.isArray(group.items)) {
          throw new Error(`Menu group at index ${index} must have "title" and "items" properties`);
        }
        
        group.items.forEach((item, itemIndex) => {
          if (!item.label || !item.path) {
            throw new Error(`Item at index ${itemIndex} in group "${group.title}" must have "label" and "path" properties`);
          }
        });
      });
      
      // Save to storage
      chrome.storage.sync.set({ menuConfig: config }, function() {
        showMessage('Configuration saved successfully!', 'success');
      });
      
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    }
  });
  
  // Reset to default
  resetButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset to the default configuration?')) {
      configTextarea.value = JSON.stringify(DEFAULT_MENU_CONFIG, null, 2);
      chrome.storage.sync.set({ menuConfig: DEFAULT_MENU_CONFIG }, function() {
        showMessage('Configuration reset to default!', 'success');
      });
    }
  });
  
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }
});
