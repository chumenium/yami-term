document.addEventListener('DOMContentLoaded', async () => {
  try {
    const config = await window.yamiterm.getConfig();

    await window.YamiTabs.newTab();

    window.yamiterm.onConfigChanged(newConfig => {
      const activeTerm = window.YamiTabs.activeTerm();
      if (activeTerm) {
        activeTerm.options.fontSize = newConfig.fontSize || 14;
        activeTerm.options.fontFamily = newConfig.fontFamily || 'Menlo, Monaco, "Courier New", monospace';
        activeTerm.options.cursorBlink = newConfig.cursorBlink !== false;
      }

      document.documentElement.style.setProperty('--accent', newConfig.accent || '#ff79c6');
      document.documentElement.style.setProperty('--glass-opacity', (newConfig.opacity || 0.8).toString());
    });

    if (window.YamiSuggest && typeof window.YamiSuggest.init === 'function') {
      window.YamiSuggest.init();
    }

    if (window.YamiSettings && typeof window.YamiSettings.init === 'function') {
      window.YamiSettings.init();
    }

    if (window.YamiShortcuts && typeof window.YamiShortcuts.init === 'function') {
      window.YamiShortcuts.init();
    }
  } catch (err) {
    console.error('Failed to initialize renderer:', err);
  }
});
