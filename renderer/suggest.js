window.YamiSuggest = (() => {
  let buffer = '';
  let suggestions = [];
  let selectedIndex = -1;
  let debounceTimer = null;
  let isEnabled = false;
  let getActiveTerm = null;
  let suggestLayer = null;
  let initialized = false;

  const DEBOUNCE_MS = 150;

  // Initialize module
  function init(options = {}) {
    if (initialized) return;
    initialized = true;
    getActiveTerm = options.getActiveTerm || (() => {
      return window.YamiTabs?.activeTerm?.() || null;
    });

    // Create suggest layer if not exists
    if (!suggestLayer) {
      suggestLayer = document.getElementById('suggest-layer');
      if (!suggestLayer) {
        suggestLayer = document.createElement('div');
        suggestLayer.id = 'suggest-layer';
        suggestLayer.className = 'suggest-layer';
        suggestLayer.style.display = 'none';
        document.body.appendChild(suggestLayer);
      }
    }

    // Check initial enable state
    window.yamiterm?.getConfig?.().then(config => {
      isEnabled = config.suggest !== false;
    });

    // Listen to config changes
    window.yamiterm?.onConfigChanged?.((config) => {
      isEnabled = config.suggest !== false;
      if (!isEnabled) {
        closeSuggestions();
      }
    });

    // Attach keyboard listener
    attachKeyboardListener();
  }

  // Attach keyboard event listener
  function attachKeyboardListener() {
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('compositionend', handleCompositionEnd, true);
  }

  // Handle keydown events
  function handleKeyDown(e) {
    if (!isEnabled) return;

    const term = getActiveTerm?.();
    if (!term) return;

    const key = e.key;
    const code = e.code;

    // Handle suggestion navigation and confirmation
    if (suggestions.length > 0) {
      if (key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        renderSuggestions();
        return;
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderSuggestions();
        return;
      } else if (key === 'Tab' || key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        confirmSuggestion();
        return;
      } else if (key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSuggestions();
        return;
      }
    }

    // Update buffer for regular keys
    if (key === 'Enter' || key === '\r') {
      buffer = '';
      selectedIndex = -1;
      closeSuggestions();
    } else if (key === 'Backspace') {
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
        updateSuggestions();
      }
    } else if (key === 'Control' || key === 'c') {
      // Check for Ctrl+C
      if (e.ctrlKey && code === 'KeyC') {
        buffer = '';
        selectedIndex = -1;
        closeSuggestions();
      }
    } else if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Regular printable character
      buffer += key;
      updateSuggestions();
    }
  }

  // Handle IME composition end
  function handleCompositionEnd(e) {
    if (!isEnabled) return;

    const term = getActiveTerm?.();
    if (!term) return;

    const text = e.data || '';
    if (text) {
      buffer += text;
      updateSuggestions();
    }
  }

  // Update suggestions (with debounce)
  function updateSuggestions() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      if (buffer.length < 2) {
        closeSuggestions();
        return;
      }

      window.yamiterm?.suggest?.(buffer).then(results => {
        suggestions = results || [];
        selectedIndex = suggestions.length > 0 ? 0 : -1;
        renderSuggestions();
      }).catch(() => {
        suggestions = [];
        selectedIndex = -1;
        closeSuggestions();
      });
    }, DEBOUNCE_MS);
  }

  // Render suggestions dropdown
  function renderSuggestions() {
    if (!suggestLayer) return;

    if (suggestions.length === 0) {
      suggestLayer.style.display = 'none';
      return;
    }

    suggestLayer.innerHTML = '';
    suggestLayer.style.display = 'block';

    suggestions.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'suggest-item' + (index === selectedIndex ? ' selected' : '');

      // Icon based on type
      const icon = item.type === 'history' ? '🕐' : '⚡';

      // Main text
      const mainText = document.createElement('span');
      mainText.className = 'suggest-main';
      mainText.textContent = icon + ' ' + item.text;

      // Ghost text (remainder after prefix)
      const ghostText = document.createElement('span');
      ghostText.className = 'suggest-ghost';
      if (item.text.length > buffer.length) {
        ghostText.textContent = item.text.slice(buffer.length);
      }

      itemEl.appendChild(mainText);
      itemEl.appendChild(ghostText);

      itemEl.addEventListener('click', () => {
        selectedIndex = index;
        confirmSuggestion();
      });

      suggestLayer.appendChild(itemEl);
    });
  }

  // Confirm selected suggestion
  function confirmSuggestion() {
    if (selectedIndex < 0 || selectedIndex >= suggestions.length) {
      return;
    }

    const selected = suggestions[selectedIndex];
    const remainder = selected.text.slice(buffer.length);

    const term = getActiveTerm?.();
    const activeId = window.YamiTabs?.getActiveId?.() || null;

    if (remainder && activeId) {
      window.yamiterm?.write?.(activeId, remainder);
    }

    buffer = selected.text;
    closeSuggestions();
  }

  // Close suggestions
  function closeSuggestions() {
    suggestions = [];
    selectedIndex = -1;
    if (suggestLayer) {
      suggestLayer.style.display = 'none';
      suggestLayer.innerHTML = '';
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  // Called when terminal receives line feed (optional hook from tabs.js)
  function onLineBuffer(terminal) {
    // Could use this to sync with terminal state, but for now keep it simple
  }

  return {
    init,
    onLineBuffer,
  };
})();
