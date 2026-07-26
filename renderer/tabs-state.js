function initialState() {
  return {
    tabs: [],
    activeId: null,
  };
}

function addTab(state, { id, title }) {
  const newTabs = [...state.tabs, { id, title }];
  return {
    tabs: newTabs,
    activeId: id,
  };
}

function removeTab(state, id) {
  const newTabs = state.tabs.filter(tab => tab.id !== id);
  let newActiveId = state.activeId;

  if (newActiveId === id) {
    if (newTabs.length === 0) {
      newActiveId = null;
    } else {
      const idx = state.tabs.findIndex(tab => tab.id === id);
      if (idx < newTabs.length) {
        newActiveId = newTabs[idx].id;
      } else {
        newActiveId = newTabs[newTabs.length - 1].id;
      }
    }
  }

  return {
    tabs: newTabs,
    activeId: newActiveId,
  };
}

function setActive(state, id) {
  return {
    tabs: state.tabs,
    activeId: id,
  };
}

function renameTab(state, id, title) {
  const newTabs = state.tabs.map(tab =>
    tab.id === id ? { ...tab, title } : tab
  );
  return {
    tabs: newTabs,
    activeId: state.activeId,
  };
}

function moveTab(state, id, toIndex) {
  const fromIndex = state.tabs.findIndex(tab => tab.id === id);
  if (fromIndex === -1) return state;

  const clampedToIndex = Math.max(0, Math.min(toIndex, state.tabs.length - 1));
  if (fromIndex === clampedToIndex) return state;

  const newTabs = [...state.tabs];
  const [moved] = newTabs.splice(fromIndex, 1);
  newTabs.splice(clampedToIndex, 0, moved);

  return {
    tabs: newTabs,
    activeId: state.activeId,
  };
}

// CommonJS + Browser両対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initialState,
    addTab,
    removeTab,
    setActive,
    renameTab,
    moveTab,
  };
} else {
  window.YamiTabsState = {
    initialState,
    addTab,
    removeTab,
    setActive,
    renameTab,
    moveTab,
  };
}
