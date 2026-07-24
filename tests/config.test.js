const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('config.js - ファイル無し時はDEFAULTSが返る', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    // モジュールキャッシュをクリアして再読み込み
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const result = config.load();
    assert.strictEqual(result.fontSize, 14);
    assert.strictEqual(result.fontFamily, 'Menlo');
    assert.strictEqual(result.cursorBlink, true);
    assert.strictEqual(result.opacity, 0.8);
    assert.strictEqual(result.accent, '#ff79c6');
    assert.strictEqual(result.suggest, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でファイルに保存され再loadで反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    // 初期状態
    config.set({ fontSize: 20 });

    // ファイルが作成されたか確認
    const configFile = path.join(tmpDir, '.yami-term.json');
    assert.strictEqual(fs.existsSync(configFile), true);

    // ファイルの内容を確認
    const content = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    assert.strictEqual(content.fontSize, 20);

    // デフォルト値が保持されているか確認
    assert.strictEqual(content.fontFamily, 'Menlo');
    assert.strictEqual(content.cursorBlink, true);
    assert.strictEqual(content.opacity, 0.8);

    // get()で取得
    const result = config.get();
    assert.strictEqual(result.fontSize, 20);
    assert.strictEqual(result.fontFamily, 'Menlo');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - 壊れたJSONはデフォルトへフォールバック', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    const configFile = path.join(tmpDir, '.yami-term.json');

    // 壊れたJSONを事前に書き込み
    fs.writeFileSync(configFile, '{ invalid json }', 'utf8');

    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const result = config.load();
    // デフォルト値にフォールバック
    assert.strictEqual(result.fontSize, 14);
    assert.strictEqual(result.fontFamily, 'Menlo');
    assert.strictEqual(result.cursorBlink, true);
    assert.strictEqual(result.opacity, 0.8);
    assert.strictEqual(result.accent, '#ff79c6');
    assert.strictEqual(result.suggest, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - get()はキャッシュをコピーで返す', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const result1 = config.get();
    const result2 = config.get();

    // 別のオブジェクトであることを確認
    assert.notStrictEqual(result1, result2);
    // 内容は同じ
    assert.deepStrictEqual(result1, result2);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - 複数プロパティのmerge設定', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    config.set({ fontSize: 16, accent: '#00ff00' });

    const result = config.get();
    assert.strictEqual(result.fontSize, 16);
    assert.strictEqual(result.accent, '#00ff00');
    // 他のプロパティはデフォルト
    assert.strictEqual(result.fontFamily, 'Menlo');
    assert.strictEqual(result.cursorBlink, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - DEFAULTSに新テーマ設定が含まれること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const defaults = config.DEFAULTS;
    assert.strictEqual(defaults.theme, 'yamikawa');
    assert.strictEqual(defaults.letterSpacing, 0);
    assert.strictEqual(defaults.lineHeight, 1.0);
    assert.strictEqual(defaults.scrollback, 1000);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()で別のテーマを設定して再loadで反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    // テーマを dracula に設定
    config.set({ theme: 'dracula' });

    // ファイルの内容を確認
    const configFile = path.join(tmpDir, '.yami-term.json');
    const content = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    assert.strictEqual(content.theme, 'dracula');

    // 他のデフォルト値は維持されているか確認
    assert.strictEqual(content.fontSize, 14);
    assert.strictEqual(content.fontFamily, 'Menlo');
    assert.strictEqual(content.cursorBlink, true);
    assert.strictEqual(content.opacity, 0.8);
    assert.strictEqual(content.letterSpacing, 0);
    assert.strictEqual(content.lineHeight, 1.0);
    assert.strictEqual(content.scrollback, 1000);

    // get()で取得してもテーマが反映されている
    const result = config.get();
    assert.strictEqual(result.theme, 'dracula');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
