// グローバルエラーハンドラー
window.addEventListener('error', event => {
  console.error('[yami-term] uncaught error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', event => {
  console.error('[yami-term] unhandled rejection:', event.reason);
});

// モジュールスコープ変数（onConfigChanged で更新）
let currentConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
  // (a) getConfig + 初期タブ作成
  try {
    currentConfig = await window.yamiterm.getConfig();
    await window.YamiTabs.newTab();
    console.log('[yami-term] config loaded and initial tab created');
  } catch (err) {
    console.error('[yami-term] init failed: getConfig/newTab', err);
    return;
  }

  // (a3) empty-state のアプリ情報表示
  try {
    if (window.yamiterm?.getAppInfo) {
      const info = await window.yamiterm.getAppInfo();
      const nameEl = document.getElementById('empty-state-name');
      const versionEl = document.getElementById('empty-state-version');
      if (nameEl && info.name) nameEl.textContent = info.name;
      if (versionEl && info.version) versionEl.textContent = `v${info.version}`;
    }
  } catch (err) {
    console.warn('[yami-term] empty-state app info failed:', err);
  }

  // (a2) 起動時の初期テーマ適用
  try {
    if (window.YamiThemes?.getById && typeof window.YamiThemes.getById === 'function') {
      const initialTheme = window.YamiThemes.getById(currentConfig.theme || window.YamiThemes.DEFAULT_ID);
      if (initialTheme) {
        document.documentElement.style.setProperty('--accent', initialTheme.accent);
        document.documentElement.style.setProperty('--accent2', initialTheme.accent2);
        document.documentElement.style.setProperty('--color-base-rgb', initialTheme.bgRgb);
      }
    }
  } catch (err) {
    console.warn('[yami-term] initial theme application failed:', err);
  }

  // (a4) 起動時のbloomエフェクト適用
  try {
    document.documentElement.style.setProperty('--bloom-blur', `${currentConfig.bloomIntensity ?? 4}px`);
    const allTermPanes = document.querySelectorAll('.term-pane');
    allTermPanes.forEach(pane => {
      pane.classList.toggle('bloom-enabled', currentConfig.bloomEnabled === true);
    });
  } catch (err) {
    console.warn('[yami-term] initial bloom application failed:', err);
  }

  // (b) YamiTabs.init()呼び出し（存在ガード付き）
  try {
    if (window.YamiTabs && typeof window.YamiTabs.init === 'function') {
      window.YamiTabs.init();
      console.log('[yami-term] YamiTabs.init completed');
    }
  } catch (err) {
    console.error('[yami-term] init failed: YamiTabs', err);
  }

  // onConfigChanged ハンドラー登録（全段階前に一度だけ）
  try {
    window.yamiterm.onConfigChanged(newConfig => {
      currentConfig = newConfig;

      // 全タブに fontSize/fontFamily/cursorBlink/letterSpacing/lineHeight/scrollback を反映
      const allTerms = window.YamiTabs?.getAllTerms?.();
      if (Array.isArray(allTerms)) {
        allTerms.forEach(term => {
          if (term && term.options) {
            term.options.fontSize = newConfig.fontSize || 14;
            term.options.fontFamily = newConfig.fontFamily || 'Menlo, Monaco, "Courier New", monospace';
            term.options.cursorBlink = newConfig.cursorBlink !== false;
            term.options.letterSpacing = newConfig.letterSpacing || 0;
            term.options.lineHeight = newConfig.lineHeight || 1.0;
            term.options.scrollback = newConfig.scrollback || 1000;
          }
        });
      } else {
        // getAllTerms が無い場合は activeTermのみ
        const activeTerm = window.YamiTabs?.activeTerm?.();
        if (activeTerm) {
          activeTerm.options.fontSize = newConfig.fontSize || 14;
          activeTerm.options.fontFamily = newConfig.fontFamily || 'Menlo, Monaco, "Courier New", monospace';
          activeTerm.options.cursorBlink = newConfig.cursorBlink !== false;
          activeTerm.options.letterSpacing = newConfig.letterSpacing || 0;
          activeTerm.options.lineHeight = newConfig.lineHeight || 1.0;
          activeTerm.options.scrollback = newConfig.scrollback || 1000;
        }
        console.warn('[yami-term] getAllTerms not available, applying to activeTermOnly');
      }

      // CSS変数更新
      document.documentElement.style.setProperty('--accent', newConfig.accent || '#ff79c6');
      document.documentElement.style.setProperty('--glass-opacity', (newConfig.opacity || 0.8).toString());

      // bloomエフェクト反映
      document.documentElement.style.setProperty('--bloom-blur', `${newConfig.bloomIntensity ?? 4}px`);
      const termPanes = document.querySelectorAll('.term-pane');
      termPanes.forEach(pane => {
        pane.classList.toggle('bloom-enabled', newConfig.bloomEnabled === true);
      });

      // テーマ適用（color-base-rgb および xterm theme）
      if (window.YamiThemes?.getById && typeof window.YamiThemes.getById === 'function') {
        const theme = window.YamiThemes.getById(newConfig.theme || window.YamiThemes.DEFAULT_ID);
        if (theme) {
          document.documentElement.style.setProperty('--accent', theme.accent);
          document.documentElement.style.setProperty('--accent2', theme.accent2);
          document.documentElement.style.setProperty('--color-base-rgb', theme.bgRgb);
          const allTermsForTheme = window.YamiTabs?.getAllTerms?.();
          if (Array.isArray(allTermsForTheme)) {
            allTermsForTheme.forEach(term => {
              if (term && term.options && term.options.theme) {
                term.options.theme = {
                  ...term.options.theme,
                  background: 'rgba(13,13,18,0)',
                  foreground: theme.xterm?.foreground || '#e0e0e0',
                  cursor: theme.xterm?.cursor || '#ff79c6'
                };
              }
            });
          }
        }
      }
    });
  } catch (err) {
    console.error('[yami-term] init failed: onConfigChanged', err);
  }

  // (c) YamiSuggest.init()
  try {
    if (window.YamiSuggest && typeof window.YamiSuggest.init === 'function') {
      window.YamiSuggest.init({
        getActiveTerm: () => window.YamiTabs?.activeTerm?.(),
        isEnabled: () => currentConfig.suggest !== false
      });
      console.log('[yami-term] YamiSuggest.init completed');
    }
  } catch (err) {
    console.error('[yami-term] init failed: YamiSuggest', err);
  }

  // (d) YamiSettings.init()
  try {
    if (window.YamiSettings && typeof window.YamiSettings.init === 'function') {
      window.YamiSettings.init();
      console.log('[yami-term] YamiSettings.init completed');
    }
  } catch (err) {
    console.error('[yami-term] init failed: YamiSettings', err);
  }

  // (e) YamiShortcuts.init()
  try {
    if (window.YamiShortcuts && typeof window.YamiShortcuts.init === 'function') {
      window.YamiShortcuts.init();
      console.log('[yami-term] YamiShortcuts.init completed');
    }
  } catch (err) {
    console.error('[yami-term] init failed: YamiShortcuts', err);
  }

  // (f) Claude Code起動ボタンの配線
  try {
    const claudeLaunchBtn = document.getElementById('claude-launch-btn');
    if (claudeLaunchBtn && window.YamiTabs?.newTabWithCommand && typeof window.YamiTabs.newTabWithCommand === 'function') {
      claudeLaunchBtn.addEventListener('click', () => {
        window.YamiTabs.newTabWithCommand('claude');
      });
      console.log('[yami-term] claude-launch-btn wired');
    }
  } catch (err) {
    console.error('[yami-term] claude-launch-btn wiring failed:', err);
  }

  // (g) empty-state ボタンのi18nラベル反映
  try {
    const emptyNewTabBtn = document.getElementById('empty-new-tab-btn');
    const emptyClaudeBtn = document.getElementById('empty-claude-btn');
    const emptySettingsBtn = document.getElementById('empty-settings-btn');
    if (emptyNewTabBtn) emptyNewTabBtn.textContent = window.YamiI18n?.t?.('empty.newTab') || 'New Tab';
    if (emptyClaudeBtn) {
      const emptyClaudeLabel = emptyClaudeBtn.querySelector('span');
      if (emptyClaudeLabel) emptyClaudeLabel.textContent = window.YamiI18n?.t?.('empty.launchClaude') || 'Launch Claude Code';
    }
    if (emptySettingsBtn) emptySettingsBtn.textContent = '⚙ ' + (window.YamiI18n?.t?.('empty.settings') || 'Settings');
  } catch (err) {
    console.warn('[yami-term] empty-state i18n failed:', err);
  }
});
