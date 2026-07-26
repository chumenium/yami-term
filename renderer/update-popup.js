window.YamiUpdatePopup = (() => {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    if (!window.yamiterm?.onUpdateAvailable) return;

    window.yamiterm.onUpdateAvailable(payload => {
      show(payload);
    });
  }

  function show({ latestVersion, currentVersion, url }) {
    const modal = document.getElementById('update-modal');
    if (!modal) return;

    modal.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'update-card';

    const title = document.createElement('h2');
    title.className = 'update-title';
    title.textContent = window.YamiI18n?.t?.('update.available.title') || 'Update Available';
    card.appendChild(title);

    const body = document.createElement('p');
    body.className = 'update-body';
    const bodyTemplate = window.YamiI18n?.t?.('update.available.body')
      || 'Version {latest} is available (current: {current})';
    body.textContent = bodyTemplate
      .replace('{latest}', latestVersion)
      .replace('{current}', currentVersion);
    card.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'update-actions';

    const updateBtn = document.createElement('button');
    updateBtn.className = 'update-btn update-btn-primary';
    updateBtn.textContent = window.YamiI18n?.t?.('update.button.update') || 'Update';
    updateBtn.addEventListener('click', () => {
      window.yamiterm?.openReleasePage?.(url);
      close();
    });

    const skipBtn = document.createElement('button');
    skipBtn.className = 'update-btn update-btn-secondary';
    skipBtn.textContent = window.YamiI18n?.t?.('update.button.skip') || 'Skip';
    skipBtn.addEventListener('click', () => {
      window.yamiterm?.skipUpdateVersion?.(latestVersion);
      close();
    });

    actions.appendChild(updateBtn);
    actions.appendChild(skipBtn);
    card.appendChild(actions);

    const note = document.createElement('div');
    note.className = 'update-note';
    note.textContent = window.YamiI18n?.t?.('update.available.skipNote')
      || 'Even if you skip, you can update anytime from Settings.';
    card.appendChild(note);

    modal.appendChild(card);
    modal.classList.remove('hidden');
  }

  function close() {
    const modal = document.getElementById('update-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.innerHTML = '';
  }

  return {
    init,
  };
})();
