window.YamiSearch = (() => {
  let isOpen = false;
  let bar = null;
  let input = null;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    bar = document.getElementById('search-bar');
    if (!bar) {
      console.warn('search-bar element not found');
      return;
    }

    buildContent();

    document.addEventListener('yami:open-search', toggle);
  }

  function buildContent() {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-bar-input';
    input.placeholder = window.YamiI18n?.t?.('search.placeholder') || 'Find in scrollback…';
    input.addEventListener('input', () => doFind(false));
    input.addEventListener('keydown', handleKeyDown);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'search-bar-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', close);

    bar.appendChild(input);
    bar.appendChild(closeBtn);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doFind(e.shiftKey); // Shift+Enter で前方検索
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function doFind(backwards) {
    const addon = window.YamiTabs?.getActiveSearchAddon?.();
    if (!addon || !input || !input.value) return;

    if (backwards) {
      addon.findPrevious(input.value);
    } else {
      addon.findNext(input.value);
    }
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function open() {
    if (!bar) return;
    bar.classList.remove('hidden');
    isOpen = true;
    setTimeout(() => input?.focus(), 0);
  }

  function close() {
    if (!bar) return;
    bar.classList.add('hidden');
    isOpen = false;

    const addon = window.YamiTabs?.getActiveSearchAddon?.();
    if (addon && typeof addon.clearDecorations === 'function') {
      addon.clearDecorations();
    }
    window.YamiTabs?.activeTerm?.()?.focus();
  }

  return {
    init,
  };
})();
