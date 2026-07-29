const test = require('node:test');
const assert = require('node:assert');
const {
  initialState,
  addTab,
  removeTab,
  setActive,
  renameTab,
  updateAutoTitle,
  moveTab,
} = require('../renderer/tabs-state.js');

test('initialState() returns {tabs: [], activeId: null}', () => {
  const state = initialState();
  assert.deepStrictEqual(state, {
    tabs: [],
    activeId: null,
  });
});

test('addTab() adds tab to end and sets activeId', () => {
  const s0 = initialState();
  const s1 = addTab(s0, { id: 'tab1', title: 'Tab 1' });

  assert.strictEqual(s1.tabs.length, 1);
  assert.deepStrictEqual(s1.tabs[0], { id: 'tab1', title: 'Tab 1', manuallyRenamed: false });
  assert.strictEqual(s1.activeId, 'tab1');

  const s2 = addTab(s1, { id: 'tab2', title: 'Tab 2' });
  assert.strictEqual(s2.tabs.length, 2);
  assert.deepStrictEqual(s2.tabs[1], { id: 'tab2', title: 'Tab 2', manuallyRenamed: false });
  assert.strictEqual(s2.activeId, 'tab2');
});

test('addTab() does not mutate original state', () => {
  const s0 = initialState();
  const s1 = addTab(s0, { id: 'tab1', title: 'Tab 1' });

  assert.deepStrictEqual(s0, { tabs: [], activeId: null });
  assert.notStrictEqual(s1.tabs, s0.tabs);
});

test('removeTab() removes tab from middle', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  s = addTab(s, { id: 'tab3', title: 'Tab 3' });

  const s_after = removeTab(s, 'tab2');

  assert.strictEqual(s_after.tabs.length, 2);
  assert.deepStrictEqual(s_after.tabs[0], { id: 'tab1', title: 'Tab 1', manuallyRenamed: false });
  assert.deepStrictEqual(s_after.tabs[1], { id: 'tab3', title: 'Tab 3', manuallyRenamed: false });
  assert.strictEqual(s_after.activeId, 'tab3');
});

test('removeTab() when activeTab is removed, sets next tab (right priority)', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  s = addTab(s, { id: 'tab3', title: 'Tab 3' });
  s = setActive(s, 'tab2');

  const s_after = removeTab(s, 'tab2');

  assert.strictEqual(s_after.tabs.length, 2);
  assert.strictEqual(s_after.activeId, 'tab3'); // Next (right) tab
});

test('removeTab() when activeTab is removed and no right tab, sets left tab', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  s = addTab(s, { id: 'tab3', title: 'Tab 3' });
  s = setActive(s, 'tab3');

  const s_after = removeTab(s, 'tab3');

  assert.strictEqual(s_after.tabs.length, 2);
  assert.strictEqual(s_after.activeId, 'tab2'); // Left tab
});

test('removeTab() last tab sets activeId to null', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });

  const s_after = removeTab(s, 'tab1');

  assert.strictEqual(s_after.tabs.length, 0);
  assert.strictEqual(s_after.activeId, null);
});

test('removeTab() non-active tab does not change activeId', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  s = setActive(s, 'tab1');

  const s_after = removeTab(s, 'tab2');

  assert.strictEqual(s_after.tabs.length, 1);
  assert.strictEqual(s_after.activeId, 'tab1');
});

test('removeTab() does not mutate original state', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  const original_tabs = s.tabs;

  const s_after = removeTab(s, 'tab1');

  assert.strictEqual(s.tabs, original_tabs);
  assert.notStrictEqual(s_after.tabs, original_tabs);
});

test('setActive() sets activeId', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });

  const s_after = setActive(s, 'tab1');

  assert.strictEqual(s_after.activeId, 'tab1');
  assert.deepStrictEqual(s_after.tabs, s.tabs);
});

test('setActive() with non-existent id still sets activeId (not in spec, but test impl)', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });

  const s_after = setActive(s, 'non-existent');

  // Implementation allows setting non-existent id
  assert.strictEqual(s_after.activeId, 'non-existent');
});

test('setActive() does not mutate original state', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  const original_tabs = s.tabs;

  const s_after = setActive(s, 'tab1');

  assert.strictEqual(s_after.tabs, original_tabs);
});

test('renameTab() renames tab title', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Old Title' });

  const s_after = renameTab(s, 'tab1', 'New Title');

  assert.strictEqual(s_after.tabs[0].title, 'New Title');
  assert.strictEqual(s_after.activeId, s.activeId);
});

test('renameTab() does not mutate original state', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Old Title' });
  const original_title = s.tabs[0].title;
  const original_tabs = s.tabs;

  const s_after = renameTab(s, 'tab1', 'New Title');

  assert.strictEqual(s.tabs[0].title, original_title);
  assert.notStrictEqual(s_after.tabs, original_tabs);
  assert.notStrictEqual(s_after.tabs[0], original_tabs[0]);
});

test('renameTab() non-existent id does nothing', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });

  const s_after = renameTab(s, 'non-existent', 'New Title');

  assert.deepStrictEqual(s_after.tabs, s.tabs);
});

test('moveTab() moves a tab from one index to another', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  s = addTab(s, { id: 'tab3', title: 'Tab 3' });

  const s_after = moveTab(s, 'tab1', 2);

  assert.deepStrictEqual(s_after.tabs.map(t => t.id), ['tab2', 'tab3', 'tab1']);
});

test('moveTab() preserves activeId', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  s = setActive(s, 'tab1');

  const s_after = moveTab(s, 'tab2', 0);

  assert.strictEqual(s_after.activeId, 'tab1');
});

test('moveTab() clamps toIndex to valid range', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });

  const s_after = moveTab(s, 'tab1', 100);

  assert.deepStrictEqual(s_after.tabs.map(t => t.id), ['tab2', 'tab1']);
});

test('moveTab() with non-existent id returns state unchanged', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });

  const s_after = moveTab(s, 'non-existent', 0);

  assert.deepStrictEqual(s_after.tabs, s.tabs);
});

test('moveTab() with same fromIndex/toIndex returns equivalent state', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });

  const s_after = moveTab(s, 'tab1', 0);

  assert.deepStrictEqual(s_after.tabs.map(t => t.id), ['tab1', 'tab2']);
});

test('moveTab() does not mutate original state', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  s = addTab(s, { id: 'tab2', title: 'Tab 2' });
  const original_tabs = s.tabs;

  const s_after = moveTab(s, 'tab1', 1);

  assert.deepStrictEqual(s.tabs.map(t => t.id), ['tab1', 'tab2']);
  assert.notStrictEqual(s_after.tabs, original_tabs);
});

test('all functions maintain immutability with Object.freeze', () => {
  let s = initialState();
  Object.freeze(s);

  const s1 = addTab(s, { id: 'tab1', title: 'Tab 1' });
  assert.strictEqual(s.tabs.length, 0); // Original not mutated
  assert.strictEqual(s1.tabs.length, 1);

  Object.freeze(s1);
  const s2 = addTab(s1, { id: 'tab2', title: 'Tab 2' });
  assert.strictEqual(s1.tabs.length, 1);
  assert.strictEqual(s2.tabs.length, 2);

  Object.freeze(s2);
  const s3 = removeTab(s2, 'tab1');
  assert.strictEqual(s2.tabs.length, 2);
  assert.strictEqual(s3.tabs.length, 1);
});

test('addTab() creates tab with manuallyRenamed: false', () => {
  const s0 = initialState();
  const s1 = addTab(s0, { id: 'tab1', title: 'Tab 1' });

  assert.strictEqual(s1.tabs[0].manuallyRenamed, false);
});

test('renameTab() sets manuallyRenamed to true and updates title', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Original Title' });

  const s_after = renameTab(s, 'tab1', 'New Title');

  assert.strictEqual(s_after.tabs[0].title, 'New Title');
  assert.strictEqual(s_after.tabs[0].manuallyRenamed, true);
});

test('updateAutoTitle() updates title when manuallyRenamed: false', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Auto Title 1' });

  const s_after = updateAutoTitle(s, 'tab1', 'Auto Title 2');

  assert.strictEqual(s_after.tabs[0].title, 'Auto Title 2');
  assert.strictEqual(s_after.tabs[0].manuallyRenamed, false);
});

test('updateAutoTitle() does not update title when manuallyRenamed: true', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Manual Title' });
  s = renameTab(s, 'tab1', 'Manual Title');

  const s_after = updateAutoTitle(s, 'tab1', 'Auto Title');

  assert.strictEqual(s_after.tabs[0].title, 'Manual Title');
  assert.strictEqual(s_after.tabs[0].manuallyRenamed, true);
});

test('updateAutoTitle() with non-existent id returns state unchanged', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Tab 1' });
  const original_tabs = s.tabs;

  const s_after = updateAutoTitle(s, 'non-existent', 'New Title');

  assert.deepStrictEqual(s_after.tabs, s.tabs);
  assert.notStrictEqual(s_after.tabs, original_tabs);
});

test('updateAutoTitle() does not mutate original state', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Auto Title 1' });
  const original_title = s.tabs[0].title;
  const original_tabs = s.tabs;

  const s_after = updateAutoTitle(s, 'tab1', 'Auto Title 2');

  assert.strictEqual(s.tabs[0].title, original_title);
  assert.notStrictEqual(s_after.tabs, original_tabs);
  assert.notStrictEqual(s_after.tabs[0], original_tabs[0]);
});

test('renameTab() with empty string reverts manuallyRenamed to false', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Original Title' });
  // First, rename manually
  s = renameTab(s, 'tab1', 'Manual Title');
  assert.strictEqual(s.tabs[0].manuallyRenamed, true);

  // Then, renameTab with empty string to revert to auto mode
  const s_after = renameTab(s, 'tab1', '');

  assert.strictEqual(s_after.tabs[0].manuallyRenamed, false);
  assert.strictEqual(s_after.tabs[0].title, 'Manual Title');
});

test('renameTab() with whitespace-only string reverts manuallyRenamed to false', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Original Title' });
  s = renameTab(s, 'tab1', 'Manual Title');
  assert.strictEqual(s.tabs[0].manuallyRenamed, true);

  const s_after = renameTab(s, 'tab1', '   ');

  assert.strictEqual(s_after.tabs[0].manuallyRenamed, false);
  assert.strictEqual(s_after.tabs[0].title, 'Manual Title');
});

test('updateAutoTitle() resumes auto update after manual rename was reverted with empty string', () => {
  let s = initialState();
  s = addTab(s, { id: 'tab1', title: 'Auto Title 1' });

  // Manually rename
  s = renameTab(s, 'tab1', 'Manual Title');
  assert.strictEqual(s.tabs[0].manuallyRenamed, true);

  // Revert manual rename by passing empty string
  s = renameTab(s, 'tab1', '');
  assert.strictEqual(s.tabs[0].manuallyRenamed, false);

  // Now updateAutoTitle should work again
  const s_after = updateAutoTitle(s, 'tab1', 'Auto Title 2');

  assert.strictEqual(s_after.tabs[0].title, 'Auto Title 2');
  assert.strictEqual(s_after.tabs[0].manuallyRenamed, false);
});
