// Options page logic for editing menuConfig
(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }

  function showMessage(text, type='success'){
    const el = $('message');
    el.textContent = text;
    el.className = 'message ' + type;
    el.style.display = 'block';
    setTimeout(()=>{ el.style.display = 'none'; }, 3000);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const textarea = $('config');
    const saveBtn = $('save');
    const resetBtn = $('reset');
    const exportBtn = $('export');

    // Load stored config or default
    try{
      chrome.storage.sync.get(['menuConfig'], function(result){
        const cfg = result && result.menuConfig ? result.menuConfig : window.DEFAULT_MENU_CONFIG || [];
        textarea.value = JSON.stringify(cfg, null, 2);
      });
    }catch(err){
      // If chrome.storage isn't available (e.g. opened as file), fall back to default
      textarea.value = JSON.stringify(window.DEFAULT_MENU_CONFIG || [], null, 2);
    }

    saveBtn.addEventListener('click', ()=>{
      try{
        const parsed = JSON.parse(textarea.value);
        // Basic validation
        if(!Array.isArray(parsed)) throw new Error('Configuration must be an array');
        parsed.forEach((group,gi)=>{
          if(!group.title || !Array.isArray(group.items)) throw new Error(`Group ${gi} must have title and items`);
          group.items.forEach((it,ii)=>{
            if(!it.label || !it.path) throw new Error(`Item ${ii} in group ${gi} must have label and path`);
          });
        });

        // Normalize paths: store them relative to '/lightning/setup/' (remove leading /lightning/setup/ or leading slash)
        parsed.forEach(group => {
          (group.items || []).forEach(it => {
            if (typeof it.path === 'string') {
              if (it.path.indexOf('/lightning/setup/') === 0) {
                it.path = it.path.replace(/^\/lightning\/setup\//, '');
              } else if (it.path.indexOf('/') === 0) {
                it.path = it.path.replace(/^\/+/, '');
              }
            }
          });
        });

        chrome.storage.sync.set({ menuConfig: parsed }, ()=>{
          showMessage('Configuration saved', 'success');
        });
      }catch(err){
        showMessage('Error: ' + err.message, 'error');
      }
    });

    resetBtn.addEventListener('click', ()=>{
      if(!confirm('Reset to the default configuration?')) return;
      const def = window.DEFAULT_MENU_CONFIG || [];
      textarea.value = JSON.stringify(def, null, 2);
      chrome.storage.sync.set({ menuConfig: def }, ()=>{
        showMessage('Reset to default', 'success');
      });
    });

    exportBtn.addEventListener('click', ()=>{
      try{
        const parsed = JSON.parse(textarea.value);
        const blob = new Blob([JSON.stringify(parsed, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sf-nav-config.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }catch(err){
        showMessage('Invalid JSON: ' + err.message, 'error');
      }
    });
  });
})();
