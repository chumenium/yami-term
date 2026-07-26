const test = require('node:test');
const assert = require('node:assert');
const createApprovalManager = require('../main/approval-manager.js');

const PATTERNS = [{ id: 'a', pattern: 'Do you want to', enabled: true }];

test('ApprovalManager - feed()でマッチすると変化ありtrueを返しgetAwaitingListに含まれる', () => {
  const manager = createApprovalManager(() => PATTERNS);
  const changed = manager.feed('0', 'Do you want to proceed?\n');

  assert.strictEqual(changed, true);
  const list = manager.getAwaitingList();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, '0');
});

test('ApprovalManager - 既にawaiting状態のidへの再feed()はchanged:falseを返す', () => {
  const manager = createApprovalManager(() => PATTERNS);
  manager.feed('0', 'Do you want to proceed?\n');
  const changed = manager.feed('0', 'more output\n');

  assert.strictEqual(changed, false);
  assert.strictEqual(manager.getAwaitingList().length, 1);
});

test('ApprovalManager - マッチしない出力ではawaitingListに含まれない', () => {
  const manager = createApprovalManager(() => PATTERNS);
  const changed = manager.feed('0', '$ ls\n');

  assert.strictEqual(changed, false);
  assert.strictEqual(manager.getAwaitingList().length, 0);
});

test('ApprovalManager - clear()でawaiting状態が解除される', () => {
  const manager = createApprovalManager(() => PATTERNS);
  manager.feed('0', 'Do you want to proceed?\n');

  const changed = manager.clear('0');
  assert.strictEqual(changed, true);
  assert.strictEqual(manager.getAwaitingList().length, 0);
});

test('ApprovalManager - awaitingでないidへのclear()はchanged:falseを返す', () => {
  const manager = createApprovalManager(() => PATTERNS);
  const changed = manager.clear('nonexistent');
  assert.strictEqual(changed, false);
});

test('ApprovalManager - remove()でタブが完全に除去される', () => {
  const manager = createApprovalManager(() => PATTERNS);
  manager.feed('0', 'Do you want to proceed?\n');
  manager.remove('0');

  assert.strictEqual(manager.getAwaitingList().length, 0);
});

test('ApprovalManager - 複数タブを独立して追跡できる', () => {
  const manager = createApprovalManager(() => PATTERNS);
  manager.feed('0', 'Do you want to proceed?\n');
  manager.feed('1', '$ ls\n');

  const list = manager.getAwaitingList();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, '0');
});

test('ApprovalManager - refreshPatterns()で既存detectorのパターンが更新される', () => {
  let patterns = [{ id: 'a', pattern: 'Do you want to', enabled: true }];
  const manager = createApprovalManager(() => patterns);

  manager.feed('0', '(y/n)?\n');
  assert.strictEqual(manager.getAwaitingList().length, 0);

  patterns = [{ id: 'b', pattern: '\\(y/n\\)', enabled: true }];
  manager.refreshPatterns();

  const changed = manager.feed('0', 'more\n');
  assert.strictEqual(manager.getAwaitingList().length, 1);
});

test('ApprovalManager - getAwaitingList()がsnippetを含む', () => {
  const manager = createApprovalManager(() => PATTERNS);
  manager.feed('0', '$ cmd\nDo you want to proceed?\n');

  const list = manager.getAwaitingList();
  assert.strictEqual(list[0].snippet, 'Do you want to proceed?');
});
