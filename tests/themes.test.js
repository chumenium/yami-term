const test = require('node:test');
const assert = require('node:assert');

test('themes.js - THEMESが配列で5件以上ある', async (t) => {
  const themes = require('../renderer/themes.js');

  assert.strictEqual(Array.isArray(themes.THEMES), true);
  assert.ok(themes.THEMES.length >= 5, 'THEMESには5件以上のテーマが含まれるべき');
});

test('themes.js - 各テーマが必須プロパティを持つ', async (t) => {
  const themes = require('../renderer/themes.js');
  const requiredProps = ['id', 'label', 'accent', 'accent2', 'bgRgb', 'xterm'];

  for (const theme of themes.THEMES) {
    for (const prop of requiredProps) {
      assert.ok(prop in theme, `テーマ ${theme.id} に ${prop} プロパティが存在するべき`);
    }

    // xterm オブジェクトの必須サブプロパティ
    assert.ok('background' in theme.xterm, `テーマ ${theme.id} の xterm に background が存在するべき`);
    assert.ok('foreground' in theme.xterm, `テーマ ${theme.id} の xterm に foreground が存在するべき`);
    assert.ok('cursor' in theme.xterm, `テーマ ${theme.id} の xterm に cursor が存在するべき`);
  }
});

test('themes.js - getById()が正しいテーマを返す', async (t) => {
  const themes = require('../renderer/themes.js');

  const yamikawaTheme = themes.getById('yamikawa');
  assert.strictEqual(yamikawaTheme.id, 'yamikawa');
  assert.strictEqual(yamikawaTheme.label, '闇かわ');
  assert.strictEqual(yamikawaTheme.accent, '#ff79c6');
  assert.strictEqual(yamikawaTheme.accent2, '#bd93f9');
});

test('themes.js - getById()で存在しないIDはDEFAULT_IDにフォールバック', async (t) => {
  const themes = require('../renderer/themes.js');

  const unknownTheme = themes.getById('nonexistent-theme-id');
  assert.strictEqual(unknownTheme.id, themes.DEFAULT_ID);
  assert.strictEqual(unknownTheme.id, 'yamikawa');
});

test('themes.js - DEFAULT_IDがTHEMES内のいずれかのIDと一致', async (t) => {
  const themes = require('../renderer/themes.js');

  const defaultThemeExists = themes.THEMES.some(t => t.id === themes.DEFAULT_ID);
  assert.strictEqual(defaultThemeExists, true, `DEFAULT_ID (${themes.DEFAULT_ID}) がTHEMES内に存在するべき`);
});

test('themes.js - accents/accent2が有効なHEXカラーコード形式', async (t) => {
  const themes = require('../renderer/themes.js');
  const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

  for (const theme of themes.THEMES) {
    assert.ok(hexColorRegex.test(theme.accent), `テーマ ${theme.id} の accent (${theme.accent}) は有効なHEXコード形式であるべき`);
    assert.ok(hexColorRegex.test(theme.accent2), `テーマ ${theme.id} の accent2 (${theme.accent2}) は有効なHEXコード形式であるべき`);
    assert.ok(hexColorRegex.test(theme.xterm.background), `テーマ ${theme.id} の xterm.background (${theme.xterm.background}) は有効なHEXコード形式であるべき`);
    assert.ok(hexColorRegex.test(theme.xterm.foreground), `テーマ ${theme.id} の xterm.foreground (${theme.xterm.foreground}) は有効なHEXコード形式であるべき`);
    assert.ok(hexColorRegex.test(theme.xterm.cursor), `テーマ ${theme.id} の xterm.cursor (${theme.xterm.cursor}) は有効なHEXコード形式であるべき`);
  }
});
