window.YamiTabs = (() => {
  const TabsState = window.YamiTabsState;
  let state = TabsState.initialState();
  const termInstances = new Map();
  let resizeObservers = new Map();
  let initialized = false;
  let resizerInitialized = false;

  function initResizer() {
    if (resizerInitialized) return;
    resizerInitialized = true;

    const terminalsContainer = document.getElementById('terminals');

    // Create resizer and panel elements
    const resizer = document.createElement('div');
    resizer.id = 'panel-resizer';

    const claudePanel = document.createElement('div');
    claudePanel.id = 'claude-panel';

    const panelContainer = document.createElement('div');
    panelContainer.className = 'claude-panel-container';

    const fileTreeContainer = document.createElement('div');
    fileTreeContainer.id = 'file-tree-container';

    const fileViewerContainer = document.createElement('div');
    fileViewerContainer.id = 'file-viewer-container';

    panelContainer.appendChild(fileTreeContainer);
    panelContainer.appendChild(fileViewerContainer);
    claudePanel.appendChild(panelContainer);

    terminalsContainer.appendChild(resizer);
    terminalsContainer.appendChild(claudePanel);

    // Load saved panel width
    const savedPanelWidth = localStorage.getItem('yami:claude-panel-width');
    if (savedPanelWidth) {
      claudePanel.style.width = savedPanelWidth + 'px';
    }

    // Resizer drag functionality
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = claudePanel.offsetWidth;
      resizer.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      e.preventDefault();

      const delta = startX - e.clientX; // Dragging left = positive delta
      const newWidth = Math.max(240, Math.min(600, startWidth + delta));

      claudePanel.style.width = newWidth + 'px';

      // Trigger terminal resize
      triggerTerminalRefit();
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Save panel width
        localStorage.setItem('yami:claude-panel-width', claudePanel.offsetWidth);

        // Final terminal refit
        triggerTerminalRefit();
      }
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;

    initResizer();

    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) {
      newTabBtn.addEventListener('click', newTab);
    }

    const emptyNewTabBtn = document.getElementById('empty-new-tab-btn');
    if (emptyNewTabBtn) {
      emptyNewTabBtn.addEventListener('click', newTab);
    }

    const emptySettingsBtn = document.getElementById('empty-settings-btn');
    if (emptySettingsBtn) {
      emptySettingsBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('yami:open-settings'));
      });
    }
  }

  async function newTab() {
    try {
      const { id } = await window.yamiterm.createTerm();
      const config = await window.yamiterm.getConfig();

      const terminal = new Terminal({
        fontFamily: config.fontFamily || 'Menlo, Monaco, "Courier New", monospace',
        fontSize: config.fontSize || 14,
        cursorBlink: config.cursorBlink !== false,
        letterSpacing: config.letterSpacing || 0,
        lineHeight: config.lineHeight || 1.0,
        scrollback: config.scrollback || 1000,
        theme: {
          background: 'rgba(13,13,18,0)',
        },
        allowTransparency: true,
      });

      const fitAddon = new FitAddon.FitAddon();
      const webLinksAddon = new WebLinksAddon.WebLinksAddon();
      const searchAddon = new SearchAddon.SearchAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddon);

      const pane = document.createElement('div');
      pane.className = 'term-pane';
      pane.id = `pane-${id}`;
      document.getElementById('terminals').appendChild(pane);
      if (config.bloomEnabled === true) pane.classList.add('bloom-enabled');

      terminal.open(pane);
      fitAddon.fit();

      terminal.onData(data => {
        window.yamiterm.write(id, data);
      });

      terminal.onLineFeed(() => {
        if (window.YamiSuggest && typeof window.YamiSuggest.onLineBuffer === 'function') {
          window.YamiSuggest.onLineBuffer(terminal);
        }
      });

      const resizeObs = new ResizeObserver(() => {
        fitAddon.fit();
        if (terminal.cols && terminal.rows) {
          window.yamiterm.resize(id, terminal.cols, terminal.rows);
        }
      });
      resizeObs.observe(pane);

      termInstances.set(id, { terminal, fitAddon, searchAddon, pane });
      resizeObservers.set(id, resizeObs);

      state = TabsState.addTab(state, { id, title: 'Shell' });
      render();
    } catch (err) {
      console.error('Failed to create terminal:', err);
    }
  }

  function closeTab(id) {
    const inst = termInstances.get(id);
    if (inst) {
      inst.terminal.dispose();
      inst.pane.remove();
      termInstances.delete(id);
    }

    const obs = resizeObservers.get(id);
    if (obs) {
      obs.disconnect();
      resizeObservers.delete(id);
    }

    window.yamiterm.closeTerm(id);
    state = TabsState.removeTab(state, id);
    render();
  }

  function activate(id) {
    state = TabsState.setActive(state, id);
    render();
    // Notify claude-panel which tab is now visible
    if (window.YamiClaudePanel && typeof window.YamiClaudePanel.notifyActiveTabChanged === 'function') {
      window.YamiClaudePanel.notifyActiveTabChanged(id);
    }
  }

  // delta分だけ現在のタブからずらして切り替える(循環)。Cmd+Shift+]/[ 用
  function activateRelative(delta) {
    if (state.tabs.length === 0) return;
    const currentIndex = state.tabs.findIndex(tab => tab.id === state.activeId);
    if (currentIndex === -1) return;

    const newIndex = (currentIndex + delta + state.tabs.length) % state.tabs.length;
    activate(state.tabs[newIndex].id);
  }

  function moveTab(id, toIndex) {
    state = TabsState.moveTab(state, id, toIndex);
    render();
  }

  function activeTerm() {
    if (!state.activeId) return null;
    const inst = termInstances.get(state.activeId);
    return inst ? inst.terminal : null;
  }

  function getRawTerm(id) {
    const inst = termInstances.get(id);
    return inst ? inst.terminal : null;
  }

  function getAllTerms() {
    return Array.from(termInstances.values()).map(inst => inst.terminal);
  }

  function getActiveId() {
    return state.activeId;
  }

  function getActiveTermPane() {
    if (!state.activeId) return null;
    const inst = termInstances.get(state.activeId);
    return inst ? inst.pane : null;
  }

  function getActiveSearchAddon() {
    if (!state.activeId) return null;
    const inst = termInstances.get(state.activeId);
    return inst ? inst.searchAddon : null;
  }

  async function newTabWithCommand(command) {
    await newTab();
    const activeId = getActiveId();
    if (activeId) {
      setTimeout(() => {
        window.yamiterm.write(activeId, command + '\r');
      }, 400);
    }
  }

  function triggerTerminalRefit() {
    if (state.activeId) {
      const inst = termInstances.get(state.activeId);
      if (inst && inst.fitAddon) {
        requestAnimationFrame(() => {
          inst.fitAddon.fit();
        });
      }
    }
  }

  function getTermInstance(id) {
    return termInstances.get(id);
  }

  function render() {
    const tabBar = document.getElementById('tab-bar');
    tabBar.innerHTML = '';

    state.tabs.forEach((tab, index) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (tab.id === state.activeId ? ' active' : '');
      tabEl.id = `tab-${tab.id}`;
      tabEl.draggable = true;

      const titleEl = document.createElement('span');
      titleEl.className = 'tab-title';
      titleEl.textContent = tab.title;
      tabEl.appendChild(titleEl);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      tabEl.appendChild(closeBtn);

      tabEl.addEventListener('click', () => {
        activate(tab.id);
      });

      // ドラッグ&ドロップでタブ並べ替え
      tabEl.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tab.id);
        tabEl.classList.add('dragging');
      });

      tabEl.addEventListener('dragend', () => {
        tabEl.classList.remove('dragging');
      });

      tabEl.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      tabEl.addEventListener('drop', e => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== tab.id) {
          moveTab(draggedId, index);
        }
      });

      tabBar.appendChild(tabEl);
    });

    document.querySelectorAll('.term-pane').forEach(pane => {
      const id = pane.id.replace('pane-', '');
      pane.style.display = id === state.activeId ? 'block' : 'none';
    });

    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.classList.toggle('hidden', state.tabs.length > 0);
    }
  }

  window.yamiterm.onData((id, data) => {
    const inst = termInstances.get(id);
    if (inst && id === state.activeId) {
      inst.terminal.write(data);
    }
  });

  window.yamiterm.onExit(id => {
    closeTab(id);
  });

  return {
    init,
    newTab,
    newTabWithCommand,
    closeTab,
    activate,
    activateRelative,
    moveTab,
    activeTerm,
    getRawTerm,
    getAllTerms,
    getActiveId,
    getActiveTermPane,
    getActiveSearchAddon,
    triggerTerminalRefit,
    getTermInstance,
  };
})();
