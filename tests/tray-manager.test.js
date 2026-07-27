const test = require('node:test');
const assert = require('node:assert');

// tray-manager.jsはrequire('electron')のTray/Menu/nativeImageに依存するため、
// 実Electronランタイム無しの`node --test`実行ではrequire.cacheにモックを
// 差し込んでから読み込む。プロセスを跨がないよう都度cacheを復元する。
function loadWithMockElectron() {
  const electronPath = require.resolve('electron');
  const originalEntry = require.cache[electronPath];

  class MockTray {
    constructor(icon) {
      this.icon = icon;
      this.title = '';
      this.tooltip = '';
      this.destroyed = false;
      this.handlers = {};
    }
    setTitle(text) { this.title = text; }
    setToolTip(text) { this.tooltip = text; }
    on(event, handler) { this.handlers[event] = handler; }
    popUpContextMenu() {}
    destroy() { this.destroyed = true; }
  }

  const createdTrays = [];
  const MockTrayTracking = class extends MockTray {
    constructor(icon) {
      super(icon);
      createdTrays.push(this);
    }
  };

  const mockElectron = {
    Tray: MockTrayTracking,
    Menu: { buildFromTemplate: (items) => ({ items }) },
    nativeImage: { createFromPath: (p) => ({ path: p }) },
  };

  require.cache[electronPath] = { id: electronPath, filename: electronPath, loaded: true, exports: mockElectron };
  delete require.cache[require.resolve('../main/tray-manager.js')];
  const createTrayManager = require('../main/tray-manager.js');

  const restore = () => {
    if (originalEntry) {
      require.cache[electronPath] = originalEntry;
    } else {
      delete require.cache[electronPath];
    }
    delete require.cache[require.resolve('../main/tray-manager.js')];
  };

  return { createTrayManager, createdTrays, restore };
}

test('tray-manager - updateState()でtitle/tooltipが承認待ち件数に応じて変わる', () => {
  const { createTrayManager, createdTrays, restore } = loadWithMockElectron();
  try {
    const trayManager = createTrayManager({ iconPath: '/tmp/icon.png', onActivateTab: () => {}, onShowWindow: () => {} });
    const tray = createdTrays[0];

    trayManager.updateState([]);
    assert.strictEqual(tray.title, '');
    assert.strictEqual(tray.tooltip, 'yami-term');

    trayManager.updateState([{ id: 1, snippet: 'foo' }]);
    assert.strictEqual(tray.title, '🔴');
    assert.match(tray.tooltip, /1 tab/);
  } finally {
    restore();
  }
});

test('tray-manager - destroy()はTray.destroy()を呼ぶ', () => {
  const { createTrayManager, createdTrays, restore } = loadWithMockElectron();
  try {
    const trayManager = createTrayManager({ iconPath: '/tmp/icon.png', onActivateTab: () => {}, onShowWindow: () => {} });
    const tray = createdTrays[0];

    trayManager.destroy();
    assert.strictEqual(tray.destroyed, true);
  } finally {
    restore();
  }
});

test('tray-manager - destroy()後にupdateState()を呼んでも例外を投げない(終了時クラッシュの回帰テスト)', () => {
  const { createTrayManager, restore } = loadWithMockElectron();
  try {
    const trayManager = createTrayManager({ iconPath: '/tmp/icon.png', onActivateTab: () => {}, onShowWindow: () => {} });

    trayManager.destroy();

    assert.doesNotThrow(() => {
      trayManager.updateState([{ id: 1, snippet: 'late exit event' }]);
    });
  } finally {
    restore();
  }
});
