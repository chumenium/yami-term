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

// CommonJS + Browser両対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initialState,
    addTab,
    removeTab,
    setActive,
    renameTab,
  };
} else {
  window.YamiTabsState = {
    initialState,
    addTab,
    removeTab,
    setActive,
    renameTab,
  };
}
