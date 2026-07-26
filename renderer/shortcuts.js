window.YamiShortcuts = (() => {
  let initialized = false;

  const FONT_SIZE_MIN = 10;
  const FONT_SIZE_MAX = 24;
  const FONT_SIZE_DEFAULT = 14;

  function init() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('keydown', handleKeyDown);
  }

  async function adjustFontSize(delta) {
    if (!window.yamiterm?.getConfig || !window.yamiterm?.setConfig) return;
    try {
      const config = await window.yamiterm.getConfig();
      const current = config.fontSize || FONT_SIZE_DEFAULT;
      const next = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, current + delta));
      if (next !== current) {
        await window.yamiterm.setConfig({ fontSize: next });
      }
    } catch (err) {
      console.error('[yami-term] adjustFontSize failed:', err);
    }
  }

  async function resetFontSize() {
    if (!window.yamiterm?.setConfig) return;
    try {
      await window.yamiterm.setConfig({ fontSize: FONT_SIZE_DEFAULT });
    } catch (err) {
      console.error('[yami-term] resetFontSize failed:', err);
    }
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

    // Cmd+K: コマンドパレットを開く
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('yami:open-command-palette'));
      return;
    }

    // Cmd+Shift+]: 次のタブへ(循環)
    if (e.shiftKey && e.code === 'BracketRight') {
      e.preventDefault();
      window.YamiTabs?.activateRelative?.(1);
      return;
    }

    // Cmd+Shift+[: 前のタブへ(循環)
    if (e.shiftKey && e.code === 'BracketLeft') {
      e.preventDefault();
      window.YamiTabs?.activateRelative?.(-1);
      return;
    }

    // Cmd+F: スクロールバック内検索を開く
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('yami:open-search'));
      return;
    }

    // Cmd+=/Cmd+Shift+=(Plus): フォントズームイン
    if (e.code === 'Equal') {
      e.preventDefault();
      adjustFontSize(1);
      return;
    }

    // Cmd+-: フォントズームアウト
    if (e.code === 'Minus') {
      e.preventDefault();
      adjustFontSize(-1);
      return;
    }

    // Cmd+0: フォントサイズをデフォルトにリセット
    if (e.code === 'Digit0') {
      e.preventDefault();
      resetFontSize();
      return;
    }
  }

  return {
    init,
  };
})();
