window.YamiClaudePanel = (() => {
  const tabPanelStates = new Map(); // { tabId: { active: bool } } - claudeがそのtabで実行中か(mainプロセス由来)
  let currentActiveTabId = null; // 現在画面に表示中のタブ(renderer内のタブ切替由来)
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    // Subscribe to claude process active/inactive changes from main process
    if (window.yamiterm?.claudePanel && typeof window.yamiterm.claudePanel.onActiveChanged === 'function') {
      window.yamiterm.claudePanel.onActiveChanged(({ id, active }) => {
        handleClaudeActiveChanged(id, active);
      });
    }
  }

  function handleClaudeActiveChanged(id, active) {
    // Store claude-active state for this tab
    if (!tabPanelStates.has(id)) {
      tabPanelStates.set(id, { active: false });
    }

    const tabState = tabPanelStates.get(id);
    tabState.active = active;

    if (id === currentActiveTabId) {
      updatePanelVisibility();
    }
  }

  // renderer/tabs.js から、表示中のタブが切り替わった際に呼ばれる
  function notifyActiveTabChanged(tabId) {
    currentActiveTabId = tabId;
    updatePanelVisibility();
  }

  function updatePanelVisibility() {
    const claudePanel = document.getElementById('claude-panel');
    if (!claudePanel) return;

    const tabState = tabPanelStates.get(currentActiveTabId);
    const shouldShow = tabState && tabState.active;

    if (shouldShow && !claudePanel.classList.contains('active')) {
      claudePanel.classList.add('active');
      // Trigger terminal refit after panel appears
      requestAnimationFrame(() => {
        if (window.YamiTabs && typeof window.YamiTabs.triggerTerminalRefit === 'function') {
          window.YamiTabs.triggerTerminalRefit();
        }
      });
    } else if (!shouldShow && claudePanel.classList.contains('active')) {
      claudePanel.classList.remove('active');
      // Trigger terminal refit after panel disappears
      requestAnimationFrame(() => {
        if (window.YamiTabs && typeof window.YamiTabs.triggerTerminalRefit === 'function') {
          window.YamiTabs.triggerTerminalRefit();
        }
      });
    }
  }

  function togglePanel(tabId) {
    if (!tabPanelStates.has(tabId)) {
      tabPanelStates.set(tabId, { active: false });
    }

    const tabState = tabPanelStates.get(tabId);
    tabState.active = !tabState.active;
    if (tabId === currentActiveTabId) {
      updatePanelVisibility();
    }
  }

  function isPanelActive(tabId) {
    const tabState = tabPanelStates.get(tabId);
    return tabState ? tabState.active : false;
  }

  function getFileTreeContainer() {
    return document.getElementById('file-tree-container');
  }

  function getFileViewerContainer() {
    return document.getElementById('file-viewer-container');
  }

  return {
    init,
    notifyActiveTabChanged,
    togglePanel,
    isPanelActive,
    getFileTreeContainer,
    getFileViewerContainer,
  };
})();

// Auto-initialize when window is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.YamiClaudePanel.init();
  });
} else {
  window.YamiClaudePanel.init();
}
