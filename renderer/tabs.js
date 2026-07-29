window.YamiTabs = (() => {
  const TabsState = window.YamiTabsState;
  let state = TabsState.initialState();
  const termInstances = new Map();
  let resizeObservers = new Map();
  let initialized = false;
  let resizerInitialized = false;
  let editingTabId = null;

  function sanitizeTitle(title) {
    if (!title) return '';
    // C0/C1制御文字と書式制御文字(RLO/ZWSP等のなりすまし文字)を除去
    let cleaned = title.replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
    // 先頭の装飾記号(絵文字/記号のみ)を除去。ラテン文字・キリル文字・ハングルは保持
    cleaned = cleaned.replace(/^[\p{So}\p{Sk}️\s]+/u, '');
    return cleaned.slice(0, 60);
  }

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
    editingTabId = null;
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

      terminal.onTitleChange(title => {
        // 手動編集中なら自動更新をスキップ
        if (editingTabId === id) return;

        const inst = termInstances.get(id);
        if (!inst) return;

        clearTimeout(inst.titleDebounceTimer);
        inst.titleDebounceTimer = setTimeout(() => {
          const sanitized = sanitizeTitle(title);
          if (!sanitized || sanitized.startsWith('Claude Code')) return;
          state = TabsState.updateAutoTitle(state, id, sanitized);
          render();
        }, 200);
      });

      terminal.onLineFeed(() => {
        if (id !== state.activeId) return;
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

      termInstances.set(id, { terminal, fitAddon, searchAddon, pane, titleDebounceTimer: null });
      resizeObservers.set(id, resizeObs);

      state = TabsState.addTab(state, { id, title: 'Shell' });
      render();
    } catch (err) {
      console.error('Failed to create terminal:', err);
    }
  }

  function closeTab(id) {
    editingTabId = null;
    const inst = termInstances.get(id);
    if (inst) {
      // titleDebounceTimer をクリア
      if (inst.titleDebounceTimer) {
        clearTimeout(inst.titleDebounceTimer);
      }
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
    editingTabId = null;
    if (id === state.activeId) return; // 既にアクティブなら再描画不要(dblclick成立のため重要)
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
    editingTabId = null;
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
    // editingTabId の自己修復ロジック：編集中DOM要素が実在しない場合は自動クリア
    if (editingTabId) {
      const editingEl = document.querySelector(`#tab-${editingTabId} .tab-title[contenteditable="true"]`);
      if (!editingEl) {
        editingTabId = null; // 編集要素が実在しない場合は自己修復
      } else {
        return; // 編集要素が実在する場合は再描画をスキップ
      }
    }

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

      // ダブルクリックで inline 編集モード
      titleEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (editingTabId === tab.id) return; // 既に編集中なら何もしない
        editingTabId = tab.id;
        titleEl.contentEditable = 'true';
        titleEl.focus();
        // テキスト全選択
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // ドラッグ不可に
        tabEl.draggable = false;

        // Paste: plain text のみ
        const pasteHandler = (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text/plain');
          document.execCommand('insertText', false, text);
        };
        titleEl.addEventListener('paste', pasteHandler);

        // キーボード処理
        const keydownHandler = (ke) => {
          if (ke.key === 'Enter') {
            ke.preventDefault();
            titleEl.blur();
          } else if (ke.key === 'Escape') {
            ke.preventDefault();
            titleEl.textContent = tab.title;
            titleEl.blur();
          }
        };
        titleEl.addEventListener('keydown', keydownHandler);

        // Blur: 編集確定
        const blurHandler = () => {
          titleEl.removeEventListener('keydown', keydownHandler);
          titleEl.removeEventListener('paste', pasteHandler);
          titleEl.removeEventListener('blur', blurHandler);
          titleEl.contentEditable = 'false';
          tabEl.draggable = true;
          editingTabId = null; // ← render()より前にクリア

          const newTitle = titleEl.textContent.trim();
          if (newTitle !== tab.title) {
            const sanitized = newTitle ? sanitizeTitle(newTitle) : '';
            state = TabsState.renameTab(state, tab.id, sanitized);
            render();
          } else {
            titleEl.textContent = tab.title;
          }
        };
        titleEl.addEventListener('blur', blurHandler);
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      tabEl.appendChild(closeBtn);

      tabEl.addEventListener('click', () => {
        if (editingTabId === tab.id) return; // 編集中は無視
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
    if (inst) {
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
