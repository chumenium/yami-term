window.YamiSuggest = (() => {
  let state = null;
  let debounceTimer = null;
  let isEnabled = false;
  let getActiveTerm = null;
  let initialized = false;

  // DOM elements
  let ghostOverlay = null;
  let popupList = null;
  let activeTermPane = null;

  const DEBOUNCE_MS = 150;
  const MAX_POPUP_ITEMS = 5;

  // Initialize module
  function init(opts = {}) {
    if (initialized) return;
    initialized = true;

    // Initialize suggest-view-state if not already
    if (!window.YamiSuggestViewState) {
      console.warn('YamiSuggestViewState not available');
      return;
    }

    state = window.YamiSuggestViewState.createState();

    // Set up getActiveTerm
    getActiveTerm = opts.getActiveTerm || (() => {
      return window.YamiTabs?.activeTerm?.() || null;
    });

    // Get initial enable state
    if (window.yamiterm?.getConfig) {
      window.yamiterm.getConfig().then(config => {
        isEnabled = config.suggest !== false;
      }).catch(() => {
        isEnabled = true; // default to enabled
      });
    }

    // Listen to config changes
    if (window.yamiterm?.onConfigChanged) {
      window.yamiterm.onConfigChanged((config) => {
        isEnabled = config.suggest !== false;
        if (!isEnabled) {
          closeSuggestions();
        }
      });
    }

    // Create DOM elements
    createDOMElements();

    // Attach event listeners
    attachEventListeners();
  }

  // Create ghost overlay and popup list elements
  function createDOMElements() {
    // Ghost overlay (inline, attached to active term pane)
    ghostOverlay = document.createElement('div');
    ghostOverlay.className = 'suggest-ghost-inline';
    ghostOverlay.style.display = 'none';
    ghostOverlay.style.position = 'absolute';
    ghostOverlay.style.pointerEvents = 'none';

    // Popup list
    popupList = document.createElement('div');
    popupList.className = 'suggest-popup';
    popupList.style.display = 'none';
    popupList.style.position = 'absolute';
  }

  // Attach to active term pane
  function attachToTermPane() {
    const pane = window.YamiTabs?.getActiveTermPane?.();
    if (!pane) return false;

    if (activeTermPane !== pane) {
      // Remove from old pane and close suggestions
      if (activeTermPane) {
        closeSuggestions();
        ghostOverlay.remove();
        popupList.remove();
      }

      activeTermPane = pane;
      activeTermPane.appendChild(ghostOverlay);
      activeTermPane.appendChild(popupList);
    }

    return true;
  }

  // Attach keyboard and composition event listeners
  function attachEventListeners() {
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('compositionstart', () => {
      if (state.candidates.length > 0) {
        closeSuggestions();
      }
    }, true);
    document.addEventListener('compositionend', handleCompositionEnd, true);
    window.addEventListener('resize', () => {
      if (state.candidates.length > 0) {
        closeSuggestions();
      }
    });
  }

  // Handle keydown events
  function handleKeyDown(e) {
    if (!isEnabled) return;

    const term = getActiveTerm?.();
    if (!term) return;

    const key = e.key;
    const code = e.code;

    // Only prevent default if suggestions are shown
    if (state.candidates.length > 0) {
      if (key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        state = window.YamiSuggestViewState.moveSelection(state, 1);
        renderSuggestions();
        return;
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        state = window.YamiSuggestViewState.moveSelection(state, -1);
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
      } else if (key === 'ArrowLeft') {
        closeSuggestions();
        state = window.YamiSuggestViewState.moveCursor(state, -1);
        // preventDefault/stopPropagationは呼ばない(実ターミナル側のカーソル移動を妨げない)
        return;
      }
    }

    // Handle character input and control keys
    if (key === 'Enter' || key === 'Return') {
      state = window.YamiSuggestViewState.reset(state);
      closeSuggestions();
    } else if (key === 'Backspace') {
      state = window.YamiSuggestViewState.deleteBefore(state);
      updateSuggestions();
    } else if (key === 'Delete') {
      state = window.YamiSuggestViewState.deleteAt(state);
      updateSuggestions();
    } else if (e.ctrlKey && code === 'KeyC') {
      state = window.YamiSuggestViewState.reset(state);
      closeSuggestions();
    } else if (key === 'ArrowLeft' && state.candidates.length === 0) {
      // Cursor movement when no suggestions shown
      state = window.YamiSuggestViewState.moveCursor(state, -1);
    } else if (key === 'ArrowRight' && state.candidates.length === 0) {
      // Cursor movement when no suggestions shown
      state = window.YamiSuggestViewState.moveCursor(state, 1);
    } else if (key === 'Home' && state.candidates.length === 0) {
      // Move cursor to beginning when no suggestions shown
      state = window.YamiSuggestViewState.moveCursor(state, -state.cursorPos);
    } else if (key === 'End' && state.candidates.length === 0) {
      // Move cursor to end when no suggestions shown
      state = window.YamiSuggestViewState.moveCursor(state, state.buffer.length - state.cursorPos);
    } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Regular printable character
      state = window.YamiSuggestViewState.insertAt(state, key);
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
      // Insert each character at cursor position
      for (let i = 0; i < text.length; i++) {
        state = window.YamiSuggestViewState.insertAt(state, text[i]);
      }
      updateSuggestions();
    }
  }

  // Update suggestions (with debounce)
  function updateSuggestions() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      if (state.buffer.length < 2) {
        closeSuggestions();
        return;
      }

      if (window.yamiterm?.suggest) {
        window.yamiterm.suggest(state.buffer).then(results => {
          state = window.YamiSuggestViewState.setCandidates(state, results || [], state.buffer, state.cursorPos);
          renderSuggestions();
        }).catch(() => {
          state = window.YamiSuggestViewState.reset(state);
          closeSuggestions();
        });
      }
    }, DEBOUNCE_MS);
  }

  // Render ghost text and popup list
  function renderSuggestions() {
    if (state.candidates.length === 0) {
      closeSuggestions();
      return;
    }

    if (!attachToTermPane()) {
      return;
    }

    renderGhost();
    renderPopupList();
  }

  // Render inline ghost text
  function renderGhost() {
    const ghost = window.YamiSuggestViewState.currentGhost(state);

    if (!ghost || ghost.length === 0) {
      ghostOverlay.style.display = 'none';
      return;
    }

    ghostOverlay.textContent = ghost;
    const coords = calculateCursorCoords();
    if (coords) {
      ghostOverlay.style.left = coords.x + 'px';
      ghostOverlay.style.top = coords.y + 'px';
      ghostOverlay.style.display = 'block';
    } else {
      ghostOverlay.style.display = 'none';
    }
  }

  // Render popup candidate list
  function renderPopupList() {
    popupList.innerHTML = '';

    const itemsToShow = state.candidates.slice(0, MAX_POPUP_ITEMS);
    itemsToShow.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'suggest-popup-item';
      if (index === state.selectedIndex) {
        itemEl.classList.add('selected');
      }

      // Icon
      const icon = document.createElement('span');
      icon.className = 'suggest-icon';
      icon.textContent = item.type === 'history' ? '🕐' : '⚡';

      // Text
      const text = document.createElement('span');
      text.textContent = item.text;
      text.style.flex = '1';

      itemEl.appendChild(icon);
      itemEl.appendChild(text);

      itemEl.addEventListener('click', () => {
        state = {
          ...state,
          selectedIndex: index,
        };
        confirmSuggestion();
      });

      itemEl.addEventListener('mouseenter', () => {
        state = {
          ...state,
          selectedIndex: index,
        };
        renderGhost();
      });

      popupList.appendChild(itemEl);
    });

    const coords = calculatePopupCoords();
    if (coords) {
      popupList.style.left = coords.x + 'px';
      popupList.style.top = coords.y + 'px';
      popupList.classList.toggle('above', coords.above);
      popupList.style.display = 'block';
    } else {
      popupList.style.display = 'none';
    }
  }

  // Calculate cursor position relative to term pane
  function calculateCursorCoords() {
    const term = getActiveTerm?.();
    if (!term) return null;

    const pane = activeTermPane;
    if (!pane) return null;

    try {
      const screenEl = term.element.querySelector('.xterm-screen');
      if (!screenEl) return null;

      const screenRect = screenEl.getBoundingClientRect();
      const paneRect = pane.getBoundingClientRect();

      // Pane-relative offset (screen is positioned within pane with padding)
      const offsetX = screenRect.left - paneRect.left;
      const offsetY = screenRect.top - paneRect.top;

      // Cell dimensions
      const charWidth = screenRect.width / term.cols;
      const charHeight = screenRect.height / term.rows;

      // Cursor position in cells
      const cursorX = term.buffer.active.cursorX || 0;
      const cursorY = term.buffer.active.cursorY || 0;

      // Viewport offset
      const viewportY = term.buffer.active.baseY || 0;
      const yOffset = (cursorY - viewportY) * charHeight;

      return {
        x: offsetX + cursorX * charWidth,
        y: offsetY + yOffset,
      };
    } catch (e) {
      return null;
    }
  }

  // Calculate popup list position
  function calculatePopupCoords() {
    const term = getActiveTerm?.();
    if (!term) return null;

    const pane = activeTermPane;
    if (!pane) return null;

    try {
      const screenEl = term.element.querySelector('.xterm-screen');
      if (!screenEl) return null;

      const screenRect = screenEl.getBoundingClientRect();
      const paneRect = pane.getBoundingClientRect();

      // Pane-relative offset (screen is positioned within pane with padding)
      const offsetX = screenRect.left - paneRect.left;
      const offsetY = screenRect.top - paneRect.top;

      // Cell dimensions
      const charWidth = screenRect.width / term.cols;
      const charHeight = screenRect.height / term.rows;

      // Cursor position in cells
      const cursorX = term.buffer.active.cursorX || 0;
      const cursorY = term.buffer.active.cursorY || 0;

      // Viewport offset
      const viewportY = term.buffer.active.baseY || 0;
      const yOffset = (cursorY - viewportY) * charHeight;

      // Popup height approximation (5 items max: 24px each + gap/padding)
      const popupHeight = Math.min(state.candidates.length, MAX_POPUP_ITEMS) * 24 + 16;

      // Check if popup would go below screen
      const yPos = offsetY + yOffset + charHeight;
      const spaceBelow = screenRect.height - (yOffset + charHeight);
      const above = spaceBelow < popupHeight;

      return {
        x: offsetX + cursorX * charWidth,
        y: above ? (offsetY + yOffset - popupHeight) : yPos,
        above,
      };
    } catch (e) {
      return null;
    }
  }

  // Confirm selected suggestion
  function confirmSuggestion() {
    if (state.selectedIndex < 0 || state.selectedIndex >= state.candidates.length) {
      return;
    }

    const selected = state.candidates[state.selectedIndex];
    const remainder = window.YamiSuggestViewState.currentGhost(state);

    const activeId = window.YamiTabs?.getActiveId?.() || null;

    if (remainder && activeId) {
      window.yamiterm?.write?.(activeId, remainder);
    }

    state = window.YamiSuggestViewState.reset(state);
    closeSuggestions();
  }

  // Close suggestions
  function closeSuggestions() {
    state = window.YamiSuggestViewState.reset(state);
    ghostOverlay.style.display = 'none';
    popupList.style.display = 'none';
    popupList.innerHTML = '';
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  // Hook for terminal line feed (optional)
  function onLineBuffer(terminal) {
    // When terminal outputs, close suggestions and reset
    if (state.candidates.length > 0) {
      closeSuggestions();
    }
  }

  return {
    init,
    onLineBuffer,
  };
})();
