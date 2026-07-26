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

test('config.js - DEFAULTSにBloomエフェクト設定が含まれること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const defaults = config.DEFAULTS;
    assert.strictEqual(defaults.bloomEnabled, false);
    assert.strictEqual(defaults.bloomIntensity, 4);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でbloomEnabledをtrueに設定して反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    // bloomEnabled を true に設定
    config.set({ bloomEnabled: true });

    // ファイルの内容を確認
    const configFile = path.join(tmpDir, '.yami-term.json');
    const content = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    assert.strictEqual(content.bloomEnabled, true);

    // 他のデフォルト値は維持されているか確認
    assert.strictEqual(content.bloomIntensity, 4);
    assert.strictEqual(content.fontSize, 14);
    assert.strictEqual(content.fontFamily, 'Menlo');

    // get()で取得しても反映されている
    const result = config.get();
    assert.strictEqual(result.bloomEnabled, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でbloomIntensityを8に設定して反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    // bloomIntensity を 8 に設定
    config.set({ bloomIntensity: 8 });

    // ファイルの内容を確認
    const configFile = path.join(tmpDir, '.yami-term.json');
    const content = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    assert.strictEqual(content.bloomIntensity, 8);

    // 他のデフォルト値は維持されているか確認
    assert.strictEqual(content.bloomEnabled, false);
    assert.strictEqual(content.fontSize, 14);
    assert.strictEqual(content.fontFamily, 'Menlo');

    // get()で取得しても反映されている
    const result = config.get();
    assert.strictEqual(result.bloomIntensity, 8);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - DEFAULTSにlaunchersのビルトインプリセット(claude/finder)が含まれること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const defaults = config.DEFAULTS;
    assert.ok(Array.isArray(defaults.launchers));
    assert.strictEqual(defaults.launchers.length, 2);

    const claude = defaults.launchers.find(l => l.id === 'claude');
    assert.ok(claude);
    assert.strictEqual(claude.type, 'command');
    assert.strictEqual(claude.command, 'claude');
    assert.strictEqual(claude.builtin, true);

    const finder = defaults.launchers.find(l => l.id === 'finder');
    assert.ok(finder);
    assert.strictEqual(finder.type, 'finder');
    assert.strictEqual(finder.builtin, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でカスタムlauncherを追加して反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const customLauncher = { id: 'custom-1', label: 'htop', type: 'command', command: 'htop', builtin: false };
    config.set({ launchers: [...config.DEFAULTS.launchers, customLauncher] });

    const result = config.get();
    assert.strictEqual(result.launchers.length, 3);
    assert.deepStrictEqual(result.launchers[2], customLauncher);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でlaunchersに不正な要素があればフィルタされる', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const malformed = { id: 'bad', label: 'Bad', type: 'command' }; // command欠落
    const valid = { id: 'ok', label: 'OK', type: 'command', command: 'ok' };
    config.set({ launchers: [malformed, valid] });

    const result = config.get();
    assert.strictEqual(result.launchers.length, 1);
    assert.strictEqual(result.launchers[0].id, 'ok');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でlaunchersに配列以外を渡すと無視される', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    config.set({ launchers: 'not-an-array' });

    const result = config.get();
    // 元のDEFAULTS(ビルトイン2件)のまま維持される
    assert.strictEqual(result.launchers.length, 2);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - DEFAULTSにapprovalPatternsのビルトインプリセットが含まれること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const defaults = config.DEFAULTS;
    assert.ok(Array.isArray(defaults.approvalPatterns));
    assert.strictEqual(defaults.approvalPatterns.length, 2);

    const claudePattern = defaults.approvalPatterns.find(p => p.id === 'claude-code');
    assert.ok(claudePattern);
    assert.strictEqual(claudePattern.enabled, true);
    assert.strictEqual(claudePattern.builtin, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でカスタムapprovalPatternを追加して反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const custom = { id: 'custom-1', label: 'Aider', pattern: 'Apply edit', enabled: true, builtin: false };
    config.set({ approvalPatterns: [...config.DEFAULTS.approvalPatterns, custom] });

    const result = config.get();
    assert.strictEqual(result.approvalPatterns.length, 3);
    assert.deepStrictEqual(result.approvalPatterns[2], custom);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でapprovalPatternsのenabled省略時はtrue扱いになる', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    config.set({ approvalPatterns: [{ id: 'x', label: 'X', pattern: 'foo' }] });

    const result = config.get();
    assert.strictEqual(result.approvalPatterns[0].enabled, true);
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でapprovalPatternsに不正な要素があればフィルタされる', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    const malformed = { id: 'bad', label: 'Bad' }; // pattern欠落
    const valid = { id: 'ok', label: 'OK', pattern: 'foo' };
    config.set({ approvalPatterns: [malformed, valid] });

    const result = config.get();
    assert.strictEqual(result.approvalPatterns.length, 1);
    assert.strictEqual(result.approvalPatterns[0].id, 'ok');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - DEFAULTSのlanguageは"auto"', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    assert.strictEqual(config.DEFAULTS.language, 'auto');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でサポート対象言語(例: zh-Hans)を設定して反映', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    config.set({ language: 'zh-Hans' });

    const result = config.get();
    assert.strictEqual(result.language, 'zh-Hans');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('config.js - set()でサポート外のlanguage値は無視される', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-config-'));
  const originalHome = process.env.HOME;

  try {
    process.env.HOME = tmpDir;
    delete require.cache[require.resolve('../main/config.js')];
    const config = require('../main/config.js');

    config.set({ language: 'xx-not-supported' });

    const result = config.get();
    // 元のDEFAULTS('auto')のまま維持される
    assert.strictEqual(result.language, 'auto');
  } finally {
    process.env.HOME = originalHome;
    delete require.cache[require.resolve('../main/config.js')];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
