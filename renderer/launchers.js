window.YamiLaunchers = (() => {
  let launchers = [];
  let initialized = false;

  async function init() {
    if (initialized) return;
    initialized = true;

    try {
      const config = await window.yamiterm.getConfig();
      launchers = Array.isArray(config.launchers) ? config.launchers : [];
    } catch (err) {
      launchers = [];
    }
    render();

    if (window.yamiterm?.onConfigChanged) {
      window.yamiterm.onConfigChanged(config => {
        launchers = Array.isArray(config.launchers) ? config.launchers : [];
        render();
      });
    }
  }

  function getLaunchers() {
    return launchers;
  }

  async function runLauncher(launcher) {
    if (!launcher) return;

    if (launcher.type === 'finder') {
      const activeId = window.YamiTabs?.getActiveId?.();
      if (!activeId) return;
      try {
        const result = await window.yamiterm.revealInFinder(activeId);
        if (!result?.success) {
          console.warn('[yami-term] revealInFinder failed:', result?.error);
        }
      } catch (err) {
        console.error('[yami-term] revealInFinder failed:', err);
      }
      return;
    }

    // type === 'command'
    if (window.YamiTabs?.newTabWithCommand) {
      window.YamiTabs.newTabWithCommand(launcher.command);
    }
  }

  function createButton(launcher, variant) {
    const btn = document.createElement('button');
    btn.className = variant === 'empty' ? 'empty-action-btn' : 'launcher-btn';
    btn.title = launcher.label;
    btn.dataset.launcherId = launcher.id;

    if (launcher.icon && launcher.icon.endsWith('.png')) {
      const img = document.createElement('img');
      img.src = launcher.icon;
      img.alt = launcher.label;
      img.className = variant === 'empty' ? 'empty-launcher-icon' : 'launcher-btn-icon';
      btn.appendChild(img);
    } else {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = launcher.type === 'finder' ? '📁' : '⚡';
      btn.appendChild(iconSpan);
    }

    if (variant === 'empty') {
      const label = document.createElement('span');
      label.textContent = launcher.label;
      btn.appendChild(label);
    }

    btn.addEventListener('click', () => runLauncher(launcher));
    return btn;
  }

  function render() {
    const titlebarContainer = document.getElementById('launcher-buttons');
    const emptyContainer = document.getElementById('empty-launcher-buttons');

    if (titlebarContainer) {
      titlebarContainer.innerHTML = '';
      launchers.forEach(l => titlebarContainer.appendChild(createButton(l, 'titlebar')));
    }
    if (emptyContainer) {
      emptyContainer.innerHTML = '';
      launchers.forEach(l => emptyContainer.appendChild(createButton(l, 'empty')));
    }
  }

  return {
    init,
    getLaunchers,
    runLauncher,
  };
})();
