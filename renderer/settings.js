window.YamiSettings = (() => {
  let isOpen = false;
  let debounceTimer = null;
  let initialized = false;
  const DEBOUNCE_MS = 200;

  const CATEGORY_ORDER = ['general', 'appearance', 'font', 'terminal'];

  const SETTINGS_SCHEMA = [
    {
      key: 'language',
      category: 'general',
      labelKey: 'settings.language',
      noteKey: 'settings.language.note',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto' },
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' },
        { value: 'zh-Hans', label: '简体中文' },
        { value: 'zh-Hant', label: '繁體中文' },
        { value: 'ko', label: '한국어' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' },
        { value: 'pt', label: 'Português' },
        { value: 'ru', label: 'Русский' },
        { value: 'it', label: 'Italiano' },
        { value: 'id', label: 'Bahasa Indonesia' },
        { value: 'vi', label: 'Tiếng Việt' },
        { value: 'hi', label: 'हिन्दी' },
      ],
      default: 'auto',
    },
    {
      key: 'fontSize',
      category: 'font',
      labelKey: 'settings.fontSize',
      type: 'slider',
      min: 10,
      max: 24,
      step: 1,
      default: 14,
    },
    {
      key: 'fontFamily',
      category: 'font',
      labelKey: 'settings.fontFamily',
      type: 'text',
      default: 'Menlo, Monaco, "Courier New", monospace',
      placeholder: 'e.g., Menlo, Monaco',
    },
    {
      key: 'opacity',
      category: 'appearance',
      labelKey: 'settings.opacity',
      type: 'slider',
      min: 0.3,
      max: 1.0,
      step: 0.05,
      default: 0.8,
    },
    {
      key: 'accent',
      category: 'appearance',
      labelKey: 'settings.accent',
      type: 'color',
      default: '#ff79c6',
    },
    {
      key: 'cursorBlink',
      category: 'terminal',
      labelKey: 'settings.cursorBlink',
      type: 'toggle',
      default: true,
    },
    {
      key: 'shell',
      category: 'general',
      labelKey: 'settings.shell',
      type: 'text',
      default: '/bin/zsh',
      placeholder: 'e.g., /bin/zsh',
    },
    {
      key: 'suggest',
      category: 'terminal',
      labelKey: 'settings.suggest',
      type: 'toggle',
      default: true,
    },
    {
      key: 'theme',
      category: 'appearance',
      labelKey: 'settings.theme',
      type: 'select',
      options: (window.YamiThemes?.THEMES || []).map(t => ({ value: t.id, label: t.label })),
      default: 'yamikawa',
    },
    {
      key: 'letterSpacing',
      category: 'font',
      labelKey: 'settings.letterSpacing',
      type: 'slider',
      min: -2,
      max: 4,
      step: 0.5,
      default: 0,
    },
    {
      key: 'lineHeight',
      category: 'font',
      labelKey: 'settings.lineHeight',
      type: 'slider',
      min: 1.0,
      max: 2.0,
      step: 0.1,
      default: 1.0,
    },
    {
      key: 'scrollback',
      category: 'terminal',
      labelKey: 'settings.scrollback',
      type: 'slider',
      min: 500,
      max: 10000,
      step: 500,
      default: 1000,
    },
    {
      key: 'bloomEnabled',
      category: 'appearance',
      labelKey: 'settings.bloomEnabled',
      type: 'toggle',
      default: false,
    },
    {
      key: 'bloomIntensity',
      category: 'appearance',
      labelKey: 'settings.bloomIntensity',
      type: 'slider',
      min: 0,
      max: 12,
      step: 1,
      default: 4,
    },
  ];

  async function init() {
    if (initialized) return;
    initialized = true;

    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');

    if (!modal) {
      console.warn('settings-modal element not found');
      return;
    }

    // themeスキーマのoptions再計算（window.YamiThemesが読み込まれている場合）
    const themeSchema = SETTINGS_SCHEMA.find(s => s.key === 'theme');
    if (themeSchema && window.YamiThemes?.THEMES) {
      themeSchema.options = window.YamiThemes.THEMES.map(t => ({ value: t.id, label: t.label }));
    }

    // Modal内容を構築
    buildModalContent(modal);

    // #settings-btn のクリックで開閉
    if (settingsBtn) {
      settingsBtn.addEventListener('click', toggleModal);
    }

    // カスタムイベント 'yami:open-settings' で開閉
    document.addEventListener('yami:open-settings', toggleModal);

    // モーダル外クリックで閉じる
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escキーで閉じる
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    });

    // 初期値をロード
    await loadSettings();
  }

  function buildModalContent(modal) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    const title = document.createElement('h2');
    title.className = 'settings-title';
    title.textContent = window.YamiI18n?.t?.('settings.title') || 'Settings';
    card.appendChild(title);

    CATEGORY_ORDER.forEach((category, categoryIdx) => {
      const itemsInCategory = SETTINGS_SCHEMA.filter(s => s.category === category);
      if (itemsInCategory.length === 0) return;

      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'settings-category-title';
      categoryHeader.textContent = window.YamiI18n?.t?.(`settings.category.${category}`) || category;
      card.appendChild(categoryHeader);

      itemsInCategory.forEach((schema, idx) => {
      const group = document.createElement('div');
      group.className = 'settings-group';

      const label = document.createElement('label');
      label.className = 'settings-label';

      const labelText = document.createElement('span');
      labelText.className = 'settings-label-text';
      labelText.textContent = window.YamiI18n?.t?.(schema.labelKey) || schema.labelKey;
      label.appendChild(labelText);

      let inputElement;

      if (schema.type === 'slider') {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.width = '100%';

        inputElement = document.createElement('input');
        inputElement.type = 'range';
        inputElement.className = 'settings-slider';
        inputElement.min = schema.min;
        inputElement.max = schema.max;
        inputElement.step = schema.step;
        inputElement.dataset.key = schema.key;
        inputElement.style.flex = '1';

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'settings-value';
        valueDisplay.dataset.display = schema.key;
        valueDisplay.style.minWidth = '40px';
        valueDisplay.style.textAlign = 'right';
        valueDisplay.style.fontSize = '12px';

        container.appendChild(inputElement);
        container.appendChild(valueDisplay);

        inputElement.addEventListener('input', e => {
          const val = parseFloat(e.target.value);
          valueDisplay.textContent = schema.type === 'slider' && schema.max <= 1
            ? val.toFixed(2)
            : val.toFixed(0);
          onSettingChanged(schema.key, val);
        });

        label.appendChild(container);
      } else if (schema.type === 'color') {
        inputElement = document.createElement('input');
        inputElement.type = 'color';
        inputElement.className = 'settings-color-picker';
        inputElement.dataset.key = schema.key;

        inputElement.addEventListener('input', e => {
          onSettingChanged(schema.key, e.target.value);
        });

        label.appendChild(inputElement);
      } else if (schema.type === 'toggle') {
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'settings-toggle';

        const toggleSwitch = document.createElement('label');
        toggleSwitch.className = 'toggle-switch';

        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.dataset.key = schema.key;

        const knob = document.createElement('span');
        knob.className = 'toggle-switch-knob';

        toggleSwitch.appendChild(inputElement);
        toggleSwitch.appendChild(knob);
        toggleWrapper.appendChild(toggleSwitch);

        inputElement.addEventListener('change', e => {
          onSettingChanged(schema.key, e.target.checked);
        });

        label.appendChild(toggleWrapper);
      } else if (schema.type === 'select') {
        inputElement = document.createElement('select');
        inputElement.className = 'settings-select';
        inputElement.dataset.key = schema.key;
        schema.options.forEach(opt => {
          const optionEl = document.createElement('option');
          optionEl.value = opt.value;
          optionEl.textContent = opt.label;
          inputElement.appendChild(optionEl);
        });

        inputElement.addEventListener('change', e => {
          onSettingChanged(schema.key, e.target.value);
        });

        label.appendChild(inputElement);
      } else if (schema.type === 'text') {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'settings-input';
        inputElement.placeholder = schema.placeholder || '';
        inputElement.dataset.key = schema.key;

        inputElement.addEventListener('input', e => {
          onSettingChanged(schema.key, e.target.value);
        });

        group.appendChild(label);
        group.appendChild(inputElement);
      }

      if (schema.type !== 'text') {
        group.appendChild(label);
      }

      if (schema.noteKey) {
        const note = document.createElement('div');
        note.className = 'settings-note';
        note.textContent = window.YamiI18n?.t?.(schema.noteKey) || '';
        group.appendChild(note);
      }

      card.appendChild(group);

        // 区切り線（カテゴリ内、最後以外）
        if (idx < itemsInCategory.length - 1) {
          const divider = document.createElement('div');
          divider.className = 'settings-divider';
          card.appendChild(divider);
        }
      });

      // カテゴリ間の区切り線（最後のカテゴリ以外）
      if (categoryIdx < CATEGORY_ORDER.length - 1) {
        const categoryDivider = document.createElement('div');
        categoryDivider.className = 'settings-divider';
        card.appendChild(categoryDivider);
      }
    });

    // ランチャー管理セクション追加
    const launcherDivider = document.createElement('div');
    launcherDivider.className = 'settings-divider';
    card.appendChild(launcherDivider);

    const launcherSection = document.createElement('div');
    launcherSection.className = 'settings-launcher-section';

    const launcherTitle = document.createElement('div');
    launcherTitle.className = 'settings-launcher-title';
    launcherTitle.textContent = window.YamiI18n?.t?.('settings.launchers.title') || 'Launchers';
    launcherSection.appendChild(launcherTitle);

    const launcherList = document.createElement('div');
    launcherList.className = 'settings-launcher-list';
    launcherList.id = 'settings-launcher-list';
    launcherSection.appendChild(launcherList);

    const addForm = document.createElement('div');
    addForm.className = 'settings-launcher-add-form';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'settings-input settings-launcher-label-input';
    labelInput.placeholder = window.YamiI18n?.t?.('settings.launchers.labelPlaceholder') || 'Label';

    const commandInput = document.createElement('input');
    commandInput.type = 'text';
    commandInput.className = 'settings-input settings-launcher-command-input';
    commandInput.placeholder = window.YamiI18n?.t?.('settings.launchers.commandPlaceholder') || 'Command';

    const addBtn = document.createElement('button');
    addBtn.className = 'settings-launcher-add-btn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', async () => {
      const label = labelInput.value.trim();
      const command = commandInput.value.trim();
      if (!label || !command) return;

      const config = await window.yamiterm.getConfig();
      const current = Array.isArray(config.launchers) ? config.launchers : [];
      const newLauncher = { id: `custom-${Date.now()}`, label, type: 'command', command, builtin: false };
      const updated = [...current, newLauncher];

      await window.yamiterm.setConfig({ launchers: updated });
      labelInput.value = '';
      commandInput.value = '';
      renderLauncherList(updated);
    });

    addForm.appendChild(labelInput);
    addForm.appendChild(commandInput);
    addForm.appendChild(addBtn);
    launcherSection.appendChild(addForm);

    card.appendChild(launcherSection);

    // 承認待ちパターン管理セクション追加
    const approvalDivider = document.createElement('div');
    approvalDivider.className = 'settings-divider';
    card.appendChild(approvalDivider);

    const approvalSection = document.createElement('div');
    approvalSection.className = 'settings-launcher-section';

    const approvalTitle = document.createElement('div');
    approvalTitle.className = 'settings-launcher-title';
    approvalTitle.textContent = window.YamiI18n?.t?.('settings.approvalPatterns.title') || 'Approval Detection';
    approvalSection.appendChild(approvalTitle);

    const approvalList = document.createElement('div');
    approvalList.className = 'settings-launcher-list';
    approvalList.id = 'settings-approval-list';
    approvalSection.appendChild(approvalList);

    const approvalAddForm = document.createElement('div');
    approvalAddForm.className = 'settings-launcher-add-form';

    const approvalLabelInput = document.createElement('input');
    approvalLabelInput.type = 'text';
    approvalLabelInput.className = 'settings-input';
    approvalLabelInput.placeholder = window.YamiI18n?.t?.('settings.launchers.labelPlaceholder') || 'Label';

    const approvalPatternInput = document.createElement('input');
    approvalPatternInput.type = 'text';
    approvalPatternInput.className = 'settings-input';
    approvalPatternInput.placeholder = window.YamiI18n?.t?.('settings.approvalPatterns.patternPlaceholder') || 'Regex pattern';

    const approvalAddBtn = document.createElement('button');
    approvalAddBtn.className = 'settings-launcher-add-btn';
    approvalAddBtn.textContent = '+';
    approvalAddBtn.addEventListener('click', async () => {
      const label = approvalLabelInput.value.trim();
      const pattern = approvalPatternInput.value.trim();
      if (!label || !pattern) return;

      try {
        // eslint-disable-next-line no-new
        new RegExp(pattern);
      } catch (err) {
        return; // 不正な正規表現は追加しない
      }

      const config = await window.yamiterm.getConfig();
      const current = Array.isArray(config.approvalPatterns) ? config.approvalPatterns : [];
      const newPattern = { id: `custom-${Date.now()}`, label, pattern, enabled: true, builtin: false };
      const updated = [...current, newPattern];

      await window.yamiterm.setConfig({ approvalPatterns: updated });
      approvalLabelInput.value = '';
      approvalPatternInput.value = '';
      renderApprovalList(updated);
    });

    approvalAddForm.appendChild(approvalLabelInput);
    approvalAddForm.appendChild(approvalPatternInput);
    approvalAddForm.appendChild(approvalAddBtn);
    approvalSection.appendChild(approvalAddForm);

    card.appendChild(approvalSection);

    // アップデートセクション追加
    const updateDivider = document.createElement('div');
    updateDivider.className = 'settings-divider';
    card.appendChild(updateDivider);

    const updateSection = document.createElement('div');
    updateSection.className = 'settings-launcher-section';

    const updateTitle = document.createElement('div');
    updateTitle.className = 'settings-launcher-title';
    updateTitle.textContent = window.YamiI18n?.t?.('settings.update.title') || 'Update';
    updateSection.appendChild(updateTitle);

    const updateStatus = document.createElement('div');
    updateStatus.className = 'settings-note';
    updateStatus.id = 'settings-update-status';
    updateSection.appendChild(updateStatus);

    const updateCheckBtn = document.createElement('button');
    updateCheckBtn.className = 'update-btn update-btn-secondary';
    updateCheckBtn.id = 'settings-update-check-btn';
    updateCheckBtn.textContent = window.YamiI18n?.t?.('settings.update.checkButton') || 'Check for Updates';
    updateCheckBtn.addEventListener('click', () => checkForUpdateFromSettings(updateStatus, updateCheckBtn));
    updateSection.appendChild(updateCheckBtn);

    card.appendChild(updateSection);

    // Aboutセクション追加
    const aboutSection = document.createElement('div');
    aboutSection.className = 'settings-about';

    const aboutName = document.createElement('div');
    aboutName.className = 'settings-about-name';
    aboutName.textContent = 'yami-term';
    aboutSection.appendChild(aboutName);

    const aboutMeta = document.createElement('div');
    aboutMeta.className = 'settings-about-meta';
    aboutMeta.textContent = '...';
    aboutSection.appendChild(aboutMeta);

    card.appendChild(aboutSection);

    if (window.yamiterm?.getAppInfo) {
      window.yamiterm.getAppInfo().then(info => {
        const versionLabel = window.YamiI18n?.t?.('settings.about.version') || 'Version';
        const authorLabel = window.YamiI18n?.t?.('settings.about.author') || 'Author';
        aboutMeta.textContent = `${versionLabel} v${info.version} · ${authorLabel}: ${info.author}`;
        if (info.name && info.name !== 'yami-term') {
          aboutName.textContent = info.name;
        }
      }).catch(() => {
        aboutMeta.textContent = '';
      });
    }

    modal.appendChild(card);
  }

  async function checkForUpdateFromSettings(statusEl, checkBtn) {
    checkBtn.disabled = true;
    statusEl.innerHTML = '';
    statusEl.textContent = window.YamiI18n?.t?.('settings.update.checking') || 'Checking…';

    try {
      const result = await window.yamiterm.checkForUpdate();
      statusEl.innerHTML = '';

      if (result.error) {
        statusEl.textContent = window.YamiI18n?.t?.('settings.update.error') || 'Check failed';
      } else if (result.hasUpdate) {
        const availableTemplate = window.YamiI18n?.t?.('settings.update.available')
          || 'Version {latest} is available';
        statusEl.textContent = availableTemplate.replace('{latest}', result.latestVersion);

        const updateNowBtn = document.createElement('button');
        updateNowBtn.className = 'update-btn update-btn-primary';
        updateNowBtn.style.marginTop = '8px';
        updateNowBtn.textContent = window.YamiI18n?.t?.('settings.update.updateButton') || 'Update Now';
        updateNowBtn.addEventListener('click', () => {
          window.yamiterm?.openReleasePage?.(result.url);
        });
        statusEl.appendChild(document.createElement('br'));
        statusEl.appendChild(updateNowBtn);
      } else {
        statusEl.textContent = window.YamiI18n?.t?.('settings.update.upToDate') || "You're up to date";
      }
    } catch (err) {
      statusEl.textContent = window.YamiI18n?.t?.('settings.update.error') || 'Check failed';
    } finally {
      checkBtn.disabled = false;
    }
  }

  function renderLauncherList(launchers) {
    const listEl = document.getElementById('settings-launcher-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    launchers.forEach(launcher => {
      const item = document.createElement('div');
      item.className = 'settings-launcher-item';

      const label = document.createElement('span');
      label.className = 'settings-launcher-item-label';
      label.textContent = launcher.label + (launcher.type === 'command' ? ` (${launcher.command})` : '');
      item.appendChild(label);

      if (!launcher.builtin) {
        const delBtn = document.createElement('button');
        delBtn.className = 'settings-launcher-delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', async () => {
          const config = await window.yamiterm.getConfig();
          const current = Array.isArray(config.launchers) ? config.launchers : [];
          const updated = current.filter(l => l.id !== launcher.id);
          await window.yamiterm.setConfig({ launchers: updated });
          renderLauncherList(updated);
        });
        item.appendChild(delBtn);
      }

      listEl.appendChild(item);
    });
  }

  function renderApprovalList(patterns) {
    const listEl = document.getElementById('settings-approval-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    patterns.forEach(pattern => {
      const item = document.createElement('div');
      item.className = 'settings-launcher-item';

      const enabledCheckbox = document.createElement('input');
      enabledCheckbox.type = 'checkbox';
      enabledCheckbox.checked = pattern.enabled !== false;
      enabledCheckbox.addEventListener('change', async () => {
        const config = await window.yamiterm.getConfig();
        const current = Array.isArray(config.approvalPatterns) ? config.approvalPatterns : [];
        const updated = current.map(p => p.id === pattern.id ? { ...p, enabled: enabledCheckbox.checked } : p);
        await window.yamiterm.setConfig({ approvalPatterns: updated });
      });
      item.appendChild(enabledCheckbox);

      const label = document.createElement('span');
      label.className = 'settings-launcher-item-label';
      label.textContent = `${pattern.label} (${pattern.pattern})`;
      item.appendChild(label);

      if (!pattern.builtin) {
        const delBtn = document.createElement('button');
        delBtn.className = 'settings-launcher-delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', async () => {
          const config = await window.yamiterm.getConfig();
          const current = Array.isArray(config.approvalPatterns) ? config.approvalPatterns : [];
          const updated = current.filter(p => p.id !== pattern.id);
          await window.yamiterm.setConfig({ approvalPatterns: updated });
          renderApprovalList(updated);
        });
        item.appendChild(delBtn);
      }

      listEl.appendChild(item);
    });
  }

  async function loadSettings() {
    try {
      const config = await window.yamiterm.getConfig();

      renderLauncherList(Array.isArray(config.launchers) ? config.launchers : []);
      renderApprovalList(Array.isArray(config.approvalPatterns) ? config.approvalPatterns : []);

      SETTINGS_SCHEMA.forEach(schema => {
        const value = config[schema.key] !== undefined ? config[schema.key] : schema.default;
        const input = document.querySelector(`[data-key="${schema.key}"]`);

        if (!input) return;

        if (schema.type === 'slider') {
          input.value = value;
          const display = document.querySelector(`[data-display="${schema.key}"]`);
          if (display) {
            display.textContent = schema.max <= 1 ? value.toFixed(2) : value.toFixed(0);
          }
        } else if (schema.type === 'color') {
          input.value = value;
        } else if (schema.type === 'toggle') {
          input.checked = value === true;
        } else if (schema.type === 'select') {
          input.value = value;
        } else if (schema.type === 'text') {
          input.value = value || '';
        }
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  function onSettingChanged(key, value) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      try {
        await window.yamiterm.setConfig({ [key]: value });
      } catch (err) {
        console.error('Failed to save setting:', err);
      }
    }, DEBOUNCE_MS);
  }

  function toggleModal() {
    if (isOpen) {
      closeModal();
    } else {
      openModal();
    }
  }

  function openModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    isOpen = true;
  }

  function closeModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    isOpen = false;
  }

  return {
    init,
  };
})();
