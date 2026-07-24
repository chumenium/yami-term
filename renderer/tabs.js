window.YamiTabs = (() => {
  const TabsState = window.YamiTabsState;
  let state = TabsState.initialState();
  const termInstances = new Map();
  let resizeObservers = new Map();

  async function newTab() {
    try {
      const { id } = await window.yamiterm.createTerm();
      const config = await window.yamiterm.getConfig();

      const terminal = new Terminal({
        fontFamily: config.fontFamily || 'Menlo, Monaco, "Courier New", monospace',
        fontSize: config.fontSize || 14,
        cursorBlink: config.cursorBlink !== false,
        theme: {
          background: 'rgba(13,13,18,0)',
        },
        allowTransparency: true,
      });

      const fitAddon = new FitAddon.FitAddon();
      const webLinksAddon = new WebLinksAddon.WebLinksAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      const pane = document.createElement('div');
      pane.className = 'term-pane';
      pane.id = `pane-${id}`;
      document.getElementById('terminals').appendChild(pane);

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

      termInstances.set(id, { terminal, fitAddon, pane });
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

  function getActiveId() {
    return state.activeId;
  }

  function render() {
    const tabBar = document.getElementById('tab-bar');
    tabBar.innerHTML = '';

    state.tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (tab.id === state.activeId ? ' active' : '');
      tabEl.id = `tab-${tab.id}`;

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

      tabBar.appendChild(tabEl);
    });

    document.querySelectorAll('.term-pane').forEach(pane => {
      const id = pane.id.replace('pane-', '');
      pane.style.display = id === state.activeId ? 'block' : 'none';
    });
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
    newTab,
    closeTab,
    activate,
    activeTerm,
    getRawTerm,
    getActiveId,
  };
})();
