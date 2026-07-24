window.YamiSettings = (() => {
  let isOpen = false;
  let debounceTimer = null;
  let initialized = false;
  const DEBOUNCE_MS = 200;

  const SETTINGS_SCHEMA = [
    {
      key: 'fontSize',
      label: 'Font Size',
      type: 'slider',
      min: 10,
      max: 24,
      step: 1,
      default: 14,
    },
    {
      key: 'fontFamily',
      label: 'Font Family',
      type: 'text',
      default: 'Menlo, Monaco, "Courier New", monospace',
      placeholder: 'e.g., Menlo, Monaco',
    },
    {
      key: 'opacity',
      label: 'Glass Opacity',
      type: 'slider',
      min: 0.3,
      max: 1.0,
      step: 0.05,
      default: 0.8,
    },
    {
      key: 'accent',
      label: 'Accent Color',
      type: 'color',
      default: '#ff79c6',
    },
    {
      key: 'cursorBlink',
      label: 'Cursor Blink',
      type: 'toggle',
      default: true,
    },
    {
      key: 'shell',
      label: 'Shell',
      type: 'text',
      default: '/bin/zsh',
      placeholder: 'e.g., /bin/zsh',
    },
    {
      key: 'suggest',
      label: 'Command Suggest',
      type: 'toggle',
      default: true,
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
    title.textContent = 'Settings';
    card.appendChild(title);

    SETTINGS_SCHEMA.forEach((schema, idx) => {
      const group = document.createElement('div');
      group.className = 'settings-group';

      const label = document.createElement('label');
      label.className = 'settings-label';

      const labelText = document.createElement('span');
      labelText.className = 'settings-label-text';
      labelText.textContent = schema.label;
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

      card.appendChild(group);

      // 区切り線（最後以外）
      if (idx < SETTINGS_SCHEMA.length - 1) {
        const divider = document.createElement('div');
        divider.className = 'settings-divider';
        card.appendChild(divider);
      }
    });

    modal.appendChild(card);
  }

  async function loadSettings() {
    try {
      const config = await window.yamiterm.getConfig();

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
