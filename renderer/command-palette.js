window.YamiCommandPalette = (() => {
  let isOpen = false;
  let selectedIndex = 0;
  let filterText = '';
  let modal = null;
  let inputEl = null;
  let listEl = null;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    modal = document.getElementById('command-palette');
    if (!modal) {
      console.warn('command-palette element not found');
      return;
    }

    buildContent();

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        close();
      }
    });

    document.addEventListener('yami:open-command-palette', toggle);
  }

  function buildContent() {
    const card = document.createElement('div');
    card.className = 'command-palette-card';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'command-palette-input';
    inputEl.placeholder = window.YamiI18n?.t?.('palette.placeholder') || 'Search a command to run…';
    inputEl.addEventListener('input', () => {
      filterText = inputEl.value;
      selectedIndex = 0;
      renderList();
    });
    inputEl.addEventListener('keydown', handleKeyDown);

    listEl = document.createElement('div');
    listEl.className = 'command-palette-list';

    card.appendChild(inputEl);
    card.appendChild(listEl);
    modal.appendChild(card);
  }

  function getFilteredLaunchers() {
    const launchers = window.YamiLaunchers?.getLaunchers?.() || [];
    const activeId = window.YamiTabs?.getActiveId?.();
    const needle = filterText.trim().toLowerCase();

    return launchers
      .filter(l => l.type !== 'finder' || activeId)
      .filter(l => !needle || l.label.toLowerCase().includes(needle));
  }

  function renderList() {
    if (!listEl) return;
    const items = getFilteredLaunchers();
    if (selectedIndex >= items.length) {
      selectedIndex = Math.max(0, items.length - 1);
    }

    listEl.innerHTML = '';
    items.forEach((launcher, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'command-palette-item' + (index === selectedIndex ? ' selected' : '');
      itemEl.textContent = launcher.label;
      itemEl.addEventListener('mouseenter', () => {
        selectedIndex = index;
        renderList();
      });
      itemEl.addEventListener('click', () => {
        selectedIndex = index;
        execute();
      });
      listEl.appendChild(itemEl);
    });
  }

  function handleKeyDown(e) {
    const items = getFilteredLaunchers();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function execute() {
    const items = getFilteredLaunchers();
    const launcher = items[selectedIndex];
    if (launcher) {
      window.YamiLaunchers?.runLauncher?.(launcher);
    }
    close();
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function open() {
    if (!modal) return;
    filterText = '';
    selectedIndex = 0;
    if (inputEl) inputEl.value = '';
    modal.classList.remove('hidden');
    isOpen = true;
    renderList();
    setTimeout(() => inputEl?.focus(), 0);
  }

  function close() {
    if (!modal) return;
    modal.classList.add('hidden');
    isOpen = false;
  }

  return {
    init,
  };
})();
