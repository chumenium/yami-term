const test = require('node:test');
const assert = require('node:assert');
const { ApprovalDetector, compilePatterns } = require('../main/approval-detector.js');

test('ApprovalDetector - パターンにマッチしない出力ではfeed()がfalseを返す', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  assert.strictEqual(detector.feed('$ ls\nfile1 file2\n'), false);
});

test('ApprovalDetector - パターンにマッチする出力ではfeed()がtrueを返す', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  assert.strictEqual(detector.feed('Do you want to proceed?\n'), true);
});

test('ApprovalDetector - enabled:falseのパターンは無視される', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: false }]);
  assert.strictEqual(detector.feed('Do you want to proceed?\n'), false);
});

test('ApprovalDetector - 不正な正規表現は無視され例外を投げない', () => {
  assert.doesNotThrow(() => {
    const detector = new ApprovalDetector([{ id: 'a', pattern: '[invalid(', enabled: true }]);
    detector.feed('some output');
  });
});

test('ApprovalDetector - 複数チャンクに分割された出力でもマッチする', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('Do you ');
  const result = detector.feed('want to proceed?\n');
  assert.strictEqual(result, true);
});

test('ApprovalDetector - reset()でバッファがクリアされマッチしなくなる', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('Do you want to proceed?\n');
  assert.strictEqual(detector.matched(), true);
  detector.reset();
  assert.strictEqual(detector.matched(), false);
});

test('ApprovalDetector - matchedSnippet()がマッチした行を返す', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('$ some command\nDo you want to proceed?\n1. Yes\n');
  assert.strictEqual(detector.matchedSnippet(), 'Do you want to proceed?');
});

test('ApprovalDetector - matchedSnippet()はANSIエスケープシーケンスを除去する', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('\x1b[1m\x1b[7mDo you want to proceed?\x1b[27m\x1b[0m\n');
  assert.strictEqual(detector.matchedSnippet(), 'Do you want to proceed?');
});

test('ApprovalDetector - マッチしない時matchedSnippet()は空文字列を返す', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('$ ls\n');
  assert.strictEqual(detector.matchedSnippet(), '');
});

test('ApprovalDetector - setPatterns()でパターンを差し替えられる', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('(y/n)?\n');
  assert.strictEqual(detector.matched(), false);

  detector.setPatterns([{ id: 'b', pattern: '\\(y/n\\)', enabled: true }]);
  assert.strictEqual(detector.matched(), true);
});

test('ApprovalDetector - バッファは上限を超えると古い部分が切り捨てられる', () => {
  const detector = new ApprovalDetector([{ id: 'a', pattern: 'Do you want to', enabled: true }]);
  detector.feed('Do you want to proceed?\n');
  // 大量の後続出力でバッファが上限(4000文字)を超えて古い部分が押し出される
  detector.feed('x'.repeat(5000));
  assert.strictEqual(detector.matched(), false);
});

test('compilePatterns() - enabled:false・不正なpatternを除外する', () => {
  const compiled = compilePatterns([
    { id: 'a', pattern: 'valid', enabled: true },
    { id: 'b', pattern: 'ignored', enabled: false },
    { id: 'c', pattern: '[invalid(', enabled: true },
  ]);
  assert.strictEqual(compiled.length, 1);
});
