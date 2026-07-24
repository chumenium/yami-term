const test = require('node:test');
const assert = require('node:assert');
const {
  initialState,
  addTab,
  removeTab,
  setActive,
  renameTab,
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
  assert.deepStrictEqual(s1.tabs[0], { id: 'tab1', title: 'Tab 1' });
  assert.strictEqual(s1.activeId, 'tab1');

  const s2 = addTab(s1, { id: 'tab2', title: 'Tab 2' });
  assert.strictEqual(s2.tabs.length, 2);
  assert.deepStrictEqual(s2.tabs[1], { id: 'tab2', title: 'Tab 2' });
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
  assert.deepStrictEqual(s_after.tabs[0], { id: 'tab1', title: 'Tab 1' });
  assert.deepStrictEqual(s_after.tabs[1], { id: 'tab3', title: 'Tab 3' });
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
