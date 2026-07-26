const test = require('node:test');
const assert = require('node:assert');
const { checkForUpdate, compareVersions } = require('../main/update-checker.js');

test('compareVersions() - 新しいバージョンは正の値を返す', () => {
  assert.ok(compareVersions('0.7.0', '0.6.3') > 0);
});

test('compareVersions() - 古いバージョンは負の値を返す', () => {
  assert.ok(compareVersions('0.6.0', '0.6.3') < 0);
});

test('compareVersions() - 同じバージョンは0を返す', () => {
  assert.strictEqual(compareVersions('0.6.3', '0.6.3'), 0);
});

test('compareVersions() - 先頭のvプレフィックスを無視する', () => {
  assert.strictEqual(compareVersions('v0.6.3', '0.6.3'), 0);
});

test('compareVersions() - メジャーバージョン差を正しく比較する', () => {
  assert.ok(compareVersions('1.0.0', '0.9.9') > 0);
});

test('compareVersions() - 桁数が異なるバージョンも正しく比較する(1.0 vs 1.0.1)', () => {
  assert.ok(compareVersions('1.0', '1.0.1') < 0);
});

test('checkForUpdate() - 新しいリリースがある場合hasUpdate:trueを返す', async () => {
  const fetchLatest = async () => ({ tag_name: 'v0.7.0', html_url: 'https://github.com/chumenium/yami-term/releases/tag/v0.7.0' });
  const result = await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(result.hasUpdate, true);
  assert.strictEqual(result.latestVersion, '0.7.0');
  assert.strictEqual(result.currentVersion, '0.6.3');
  assert.strictEqual(result.url, 'https://github.com/chumenium/yami-term/releases/tag/v0.7.0');
  assert.strictEqual(result.error, null);
});

test('checkForUpdate() - 最新版の場合hasUpdate:falseを返す', async () => {
  const fetchLatest = async () => ({ tag_name: 'v0.6.3', html_url: 'https://example.com' });
  const result = await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(result.hasUpdate, false);
  assert.strictEqual(result.latestVersion, '0.6.3');
});

test('checkForUpdate() - 現在バージョンの方が新しい場合hasUpdate:falseを返す', async () => {
  const fetchLatest = async () => ({ tag_name: 'v0.6.0', html_url: 'https://example.com' });
  const result = await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(result.hasUpdate, false);
});

test('checkForUpdate() - ネットワークエラー時は例外を投げずhasUpdate:falseを返す', async () => {
  const fetchLatest = async () => { throw new Error('network unreachable'); };
  const result = await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(result.hasUpdate, false);
  assert.strictEqual(result.latestVersion, null);
  assert.ok(result.error);
});

test('checkForUpdate() - タイムアウト(reject)時もクラッシュせずhasUpdate:falseを返す', async () => {
  const fetchLatest = () => Promise.reject(new Error('update check request timed out'));
  const result = await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(result.hasUpdate, false);
  assert.strictEqual(result.error, 'update check request timed out');
});

test('checkForUpdate() - tag_nameが無いレスポンスはエラーとして扱う', async () => {
  const fetchLatest = async () => ({});
  const result = await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(result.hasUpdate, false);
  assert.ok(result.error);
});

test('checkForUpdate() - html_urlが無い場合はrepoから組み立てたURLを返す', async () => {
  const fetchLatest = async () => ({ tag_name: 'v0.7.0' });
  const result = await checkForUpdate({ currentVersion: '0.6.3', repo: 'chumenium/yami-term', fetchLatest });

  assert.strictEqual(result.url, 'https://github.com/chumenium/yami-term/releases/tag/v0.7.0');
});

test('checkForUpdate() - fetchLatestに渡すrepoはデフォルトでchumenium/yami-term', async () => {
  let receivedRepo = null;
  const fetchLatest = async (repo) => {
    receivedRepo = repo;
    return { tag_name: 'v0.6.3' };
  };
  await checkForUpdate({ currentVersion: '0.6.3', fetchLatest });

  assert.strictEqual(receivedRepo, 'chumenium/yami-term');
});
