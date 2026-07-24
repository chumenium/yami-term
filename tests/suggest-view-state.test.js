const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  setCandidates,
  moveSelection,
  currentGhost,
  reset,
} = require('../renderer/suggest-view-state.js');

test('createState() returns initial state', () => {
  const state = createState();
  assert.deepStrictEqual(state, {
    selectedIndex: -1,
    candidates: [],
    buffer: '',
  });
});

test('setCandidates() sets candidates list and buffer, resets selectedIndex to 0', () => {
  const s0 = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
    { text: 'git pull', type: 'history' },
  ];
  const s1 = setCandidates(s0, list, 'git ');

  assert.strictEqual(s1.candidates.length, 3);
  assert.deepStrictEqual(s1.candidates[0], { text: 'git status', type: 'history' });
  assert.strictEqual(s1.selectedIndex, 0);
  assert.strictEqual(s1.buffer, 'git ');
});

test('setCandidates() resets selectedIndex even if candidates already exist', () => {
  let s = createState();
  const list1 = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
  ];
  s = setCandidates(s, list1, 'git ');
  s = moveSelection(s, 1); // Move selectedIndex to 1

  assert.strictEqual(s.selectedIndex, 1);

  const list2 = [
    { text: 'ls -la', type: 'history' },
    { text: 'ls -l', type: 'history' },
  ];
  const s_after = setCandidates(s, list2, 'ls ');

  assert.strictEqual(s_after.selectedIndex, 0);
  assert.strictEqual(s_after.buffer, 'ls ');
  assert.strictEqual(s_after.candidates.length, 2);
});

test('moveSelection() moves selectedIndex down by delta', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
    { text: 'git pull', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');

  const s1 = moveSelection(s, 1);
  assert.strictEqual(s1.selectedIndex, 1);

  const s2 = moveSelection(s1, 1);
  assert.strictEqual(s2.selectedIndex, 2);
});

test('moveSelection() moves selectedIndex up by negative delta', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
    { text: 'git pull', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');
  s = moveSelection(s, 2); // Move to index 2

  assert.strictEqual(s.selectedIndex, 2);

  const s1 = moveSelection(s, -1);
  assert.strictEqual(s1.selectedIndex, 1);

  const s2 = moveSelection(s1, -1);
  assert.strictEqual(s2.selectedIndex, 0);
});

test('moveSelection() at end wraps or clamps without error', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
    { text: 'git pull', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');
  s = moveSelection(s, 2); // At index 2 (last)

  // Move forward again - should either wrap to 0 or stay at 2
  const s_at_end = moveSelection(s, 1);
  assert(
    s_at_end.selectedIndex === 2 || s_at_end.selectedIndex === 0,
    'moveSelection at end should clamp or wrap'
  );
});

test('moveSelection() at start moves backward or wraps without error', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');

  // Move backward from index 0 - should either clamp to 0 or wrap
  const s_at_start = moveSelection(s, -1);
  assert(
    s_at_start.selectedIndex === 0 || s_at_start.selectedIndex === 1,
    'moveSelection at start should clamp or wrap'
  );
});

test('currentGhost() returns remainder of selected candidate after buffer', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
  ];
  s = setCandidates(s, list, 'git s');

  const ghost = currentGhost(s);
  assert.strictEqual(ghost, 'tatus');
});

test('currentGhost() returns empty string when no candidates', () => {
  const s = createState();
  const ghost = currentGhost(s);
  assert.strictEqual(ghost, '');
});

test('currentGhost() returns empty string when buffer is empty', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
  ];
  s = setCandidates(s, list, '');

  const ghost = currentGhost(s);
  // If buffer is empty, ghost is either full text or empty depending on implementation
  assert(ghost === 'git status' || ghost === '', 'ghost with empty buffer should be full text or empty');
});

test('currentGhost() returns empty string when buffer does not match prefix', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
  ];
  s = setCandidates(s, list, 'xyz');

  // Implementation requires prefix match - 'git status' does not start with 'xyz'
  const ghost = currentGhost(s);
  assert.strictEqual(ghost, '');
});

test('currentGhost() changes when selectedIndex changes', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');

  const ghost0 = currentGhost(s);
  assert.strictEqual(ghost0, 'status');

  const s_moved = moveSelection(s, 1);
  const ghost1 = currentGhost(s_moved);
  assert.strictEqual(ghost1, 'push');
});

test('reset() returns state to initial values', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');
  s = moveSelection(s, 0); // Ensure selectedIndex is set

  const s_reset = reset(s);

  assert.deepStrictEqual(s_reset, {
    selectedIndex: -1,
    candidates: [],
    buffer: '',
  });
});

test('all functions are immutable - setCandidates does not mutate original state', () => {
  const s0 = createState();
  const list = [
    { text: 'git status', type: 'history' },
  ];
  const original_buffer = s0.buffer;

  const s1 = setCandidates(s0, list, 'git ');

  assert.strictEqual(s0.buffer, original_buffer);
  assert.strictEqual(s0.candidates.length, 0);
  assert.notStrictEqual(s1.candidates, s0.candidates);
});

test('all functions are immutable - moveSelection does not mutate original state', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');
  const original_selectedIndex = s.selectedIndex;
  const original_candidates = s.candidates;

  const s_moved = moveSelection(s, 1);

  assert.strictEqual(s.selectedIndex, original_selectedIndex);
  assert.strictEqual(s.candidates, original_candidates);
  assert.notStrictEqual(s_moved, s);
});

test('all functions are immutable - reset does not mutate original state', () => {
  let s = createState();
  const list = [
    { text: 'git status', type: 'history' },
  ];
  s = setCandidates(s, list, 'git ');
  const original_state = JSON.stringify(s);

  const s_reset = reset(s);

  assert.strictEqual(JSON.stringify(s), original_state);
  assert.notStrictEqual(s_reset, s);
});

test('currentGhost() with multibyte characters (Japanese)', () => {
  let s = createState();
  const list = [
    { text: 'こんにちは', type: 'history' },
  ];
  s = setCandidates(s, list, 'こんに');

  const ghost = currentGhost(s);
  assert.strictEqual(ghost, 'ちは');
});

test('currentGhost() with mixed ASCII and multibyte characters', () => {
  let s = createState();
  const list = [
    { text: 'git merge こんにちは', type: 'history' },
  ];
  s = setCandidates(s, list, 'git merge こ');

  const ghost = currentGhost(s);
  assert.strictEqual(ghost, 'んにちは');
});

test('all functions maintain immutability with Object.freeze', () => {
  let s = createState();
  Object.freeze(s);

  const list = [
    { text: 'git status', type: 'history' },
    { text: 'git push', type: 'history' },
  ];
  const s1 = setCandidates(s, list, 'git ');
  assert.strictEqual(s.candidates.length, 0);
  assert.strictEqual(s1.candidates.length, 2);

  Object.freeze(s1);
  const s2 = moveSelection(s1, 1);
  assert.strictEqual(s1.selectedIndex, 0);
  assert.strictEqual(s2.selectedIndex, 1);

  Object.freeze(s2);
  const s3 = reset(s2);
  assert.strictEqual(s2.buffer, 'git ');
  assert.strictEqual(s3.buffer, '');
});
