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
    const isMac = window.yamiterm?.platform === 'darwin';

    // Cmd(mac) / Ctrl(Windows・Linux) が押されている場合のみ処理
    const primaryModifier = isMac ? e.metaKey : e.ctrlKey;
    if (!primaryModifier) {
      return;
    }

    // Windows/LinuxのターミナルはCtrl+T/W/K/Fをreadline(bash/zsh)自体が
    // 単語削除・行末削除・文字入力等に使うため、素のCtrl+<key>と衝突する。
    // macはCmdキーがreadlineと競合しないため素のCmd+<key>のままでよいが、
    // Windows/LinuxではShiftも要求してWindows Terminal等と同じ配列にする。
    const needsShiftOnNonMac = !isMac && !e.shiftKey;

    // Cmd+T / Ctrl+Shift+T: 新規タブ
    if ((e.key === 't' || e.key === 'T') && !needsShiftOnNonMac) {
      e.preventDefault();
      if (window.YamiTabs && typeof window.YamiTabs.newTab === 'function') {
        window.YamiTabs.newTab();
      }
      return;
    }

    // Cmd+W / Ctrl+Shift+W: アクティブなタブを閉じる
    if ((e.key === 'w' || e.key === 'W') && !needsShiftOnNonMac) {
      e.preventDefault();
      if (window.YamiTabs) {
        const activeId = window.YamiTabs?.getActiveId?.();
        if (activeId && typeof window.YamiTabs.closeTab === 'function') {
          window.YamiTabs.closeTab(activeId);
        }
      }
      return;
    }

    // Cmd+1..9 / Ctrl+1..9: n番目タブへ(数字キーはreadlineと衝突しないため両OSとも素のまま)
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

    // Cmd+, / Ctrl+,: 設定モーダルを開く
    if (e.key === ',') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('yami:open-settings'));
      return;
    }

    // Cmd+K / Ctrl+Shift+K: コマンドパレットを開く
    if ((e.key === 'k' || e.key === 'K') && !needsShiftOnNonMac) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('yami:open-command-palette'));
      return;
    }

    // Cmd+Shift+] / Ctrl+Shift+]: 次のタブへ(循環)
    if (e.shiftKey && e.code === 'BracketRight') {
      e.preventDefault();
      window.YamiTabs?.activateRelative?.(1);
      return;
    }

    // Cmd+Shift+[ / Ctrl+Shift+[: 前のタブへ(循環)
    if (e.shiftKey && e.code === 'BracketLeft') {
      e.preventDefault();
      window.YamiTabs?.activateRelative?.(-1);
      return;
    }

    // Cmd+F / Ctrl+Shift+F: スクロールバック内検索を開く
    if ((e.key === 'f' || e.key === 'F') && !needsShiftOnNonMac) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('yami:open-search'));
      return;
    }

    // Cmd+=/Ctrl+=(Plus): フォントズームイン(ブラウザ等のズーム慣習に合わせ数字/記号キーは両OS共通)
    if (e.code === 'Equal') {
      e.preventDefault();
      adjustFontSize(1);
      return;
    }

    // Cmd+-/Ctrl+-: フォントズームアウト
    if (e.code === 'Minus') {
      e.preventDefault();
      adjustFontSize(-1);
      return;
    }

    // Cmd+0/Ctrl+0: フォントサイズをデフォルトにリセット
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
