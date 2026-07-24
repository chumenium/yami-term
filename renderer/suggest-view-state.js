/**
 * Pure state management for Kiro-style inline suggestions.
 * CommonJS + window.YamiSuggestViewState compatible.
 * No DOM operations.
 */

function createState() {
  return {
    selectedIndex: -1,
    candidates: [],
    buffer: '',
  };
}

function setCandidates(state, list, buffer) {
  return {
    ...state,
    candidates: Array.isArray(list) ? list : [],
    buffer: buffer || '',
    selectedIndex: (list && list.length > 0) ? 0 : -1,
  };
}

function moveSelection(state, direction) {
  if (state.candidates.length === 0) {
    return state;
  }
  let newIndex = state.selectedIndex + direction;
  newIndex = Math.max(0, Math.min(newIndex, state.candidates.length - 1));
  return {
    ...state,
    selectedIndex: newIndex,
  };
}

function currentGhost(state) {
  if (state.selectedIndex < 0 || state.selectedIndex >= state.candidates.length) {
    return '';
  }
  const candidate = state.candidates[state.selectedIndex];
  if (!candidate || !candidate.text) return '';
  const bufLen = state.buffer.length;
  // Check if candidate starts with buffer (prefix match required)
  if (!candidate.text.startsWith(state.buffer)) {
    return '';
  }
  if (candidate.text.length > bufLen) {
    return candidate.text.slice(bufLen);
  }
  return '';
}

function reset(state) {
  return createState();
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    setCandidates,
    moveSelection,
    currentGhost,
    reset,
  };
}

// window.YamiSuggestViewState for browser
if (typeof window !== 'undefined') {
  window.YamiSuggestViewState = {
    createState,
    setCandidates,
    moveSelection,
    currentGhost,
    reset,
  };
}
