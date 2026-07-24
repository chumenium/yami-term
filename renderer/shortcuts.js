window.YamiShortcuts = (() => {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e) {
    // Cmd (Meta) キーが押されている場合のみ処理
    if (!e.metaKey) {
      return;
    }

    // Cmd+T: 新規タブ
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      if (window.YamiTabs && typeof window.YamiTabs.newTab === 'function') {
        window.YamiTabs.newTab();
      }
      return;
    }

    // Cmd+W: アクティブなタブを閉じる
    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      if (window.YamiTabs) {
        const activeId = window.YamiTabs?.getActiveId?.();
        if (activeId && typeof window.YamiTabs.closeTab === 'function') {
          window.YamiTabs.closeTab(activeId);
        }
      }
      return;
    }

    // Cmd+1..9: n番目タブへ
    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const tabIndex = parseInt(e.key, 10) - 1; // 0-indexed
      const tabs = document.querySelectorAll('.tab');
      if (tabs.length > tabIndex && window.YamiTabs) {
        const tabEl = tabs[tabIndex];
        const tabId = tabEl.id.replace('tab-', '');
        if (typeof window.YamiTabs.activate === 'function') {
          window.YamiTabs.activate(tabId);
        }
      }
      return;
    }

    // Cmd+,: 設定モーダルを開く
    if (e.key === ',') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('yami:open-settings'));
      return;
    }
  }

  return {
    init,
  };
})();
