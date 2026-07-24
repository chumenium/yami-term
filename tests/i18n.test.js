const test = require('node:test');
const assert = require('node:assert');

test('i18n.js - dict.enとdict.jaのキー集合が完全一致', async (t) => {
  const i18n = require('../renderer/i18n.js');

  const enKeys = Object.keys(i18n.dict.en).sort();
  const jaKeys = Object.keys(i18n.dict.ja).sort();

  assert.deepStrictEqual(jaKeys, enKeys, 'dict.ja と dict.en のキー集合が一致すべき');
});

test('i18n.js - en/jaのキー数が3以上ある', async (t) => {
  const i18n = require('../renderer/i18n.js');

  const enKeyCount = Object.keys(i18n.dict.en).length;
  const jaKeyCount = Object.keys(i18n.dict.ja).length;

  assert.ok(enKeyCount >= 3, 'dict.en に3個以上のキーが存在すべき');
  assert.ok(jaKeyCount >= 3, 'dict.ja に3個以上のキーが存在すべき');
  assert.strictEqual(enKeyCount, jaKeyCount, 'en と ja のキー数が同じであるべき');
});

test('i18n.js - 主要キー(settings.title, empty.newTab等)がen/ja両方に存在し空文字列でない', async (t) => {
  const i18n = require('../renderer/i18n.js');
  const requiredKeys = ['settings.title', 'empty.newTab', 'empty.launchClaude', 'empty.settings'];

  for (const key of requiredKeys) {
    assert.ok(key in i18n.dict.en, `en に ${key} が存在すべき`);
    assert.ok(key in i18n.dict.ja, `ja に ${key} が存在すべき`);

    assert.strictEqual(typeof i18n.dict.en[key], 'string', `en.${key} は文字列であるべき`);
    assert.strictEqual(typeof i18n.dict.ja[key], 'string', `ja.${key} は文字列であるべき`);

    assert.ok(i18n.dict.en[key].length > 0, `en.${key} は空文字列でないべき`);
    assert.ok(i18n.dict.ja[key].length > 0, `ja.${key} は空文字列でないべき`);
  }
});

test('i18n.js - t()関数が既存キーを正しく返す', async (t) => {
  const i18n = require('../renderer/i18n.js');

  // テスト環境では locale は 'en' になる
  assert.strictEqual(i18n.t('settings.title'), i18n.dict.en['settings.title']);
  assert.strictEqual(i18n.t('empty.newTab'), i18n.dict.en['empty.newTab']);
});

test('i18n.js - t()関数が未知のキーに対してenフォールバックまたはキー自体を返す', async (t) => {
  const i18n = require('../renderer/i18n.js');

  const unknownKey = 'unknown.key.that.does.not.exist';
  const result = i18n.t(unknownKey);

  // 実装: (dict[locale] && dict[locale][key]) || dict.en[key] || key
  // locale='en' の場合、dict.en[key] || key なので、key が返るはず
  assert.strictEqual(result, unknownKey, `未知のキーに対してキー自体が返されるべき`);
});

test('i18n.js - 全en/jaキーが空文字列でない', async (t) => {
  const i18n = require('../renderer/i18n.js');

  for (const [key, value] of Object.entries(i18n.dict.en)) {
    assert.ok(typeof value === 'string', `en.${key} は文字列であるべき`);
    assert.ok(value.length > 0, `en.${key} は空文字列でないべき`);
  }

  for (const [key, value] of Object.entries(i18n.dict.ja)) {
    assert.ok(typeof value === 'string', `ja.${key} は文字列であるべき`);
    assert.ok(value.length > 0, `ja.${key} は空文字列でないべき`);
  }
});

test('i18n.js - localeプロパティが"en"または"ja"', async (t) => {
  const i18n = require('../renderer/i18n.js');

  assert.ok(['en', 'ja'].includes(i18n.locale), `locale は "en" または "ja" であるべき`);
});
