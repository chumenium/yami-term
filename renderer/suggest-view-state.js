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
    cursorPos: 0,
  };
}

function setCandidates(state, list, buffer, cursorPos = (buffer ? buffer.length : 0)) {
  const newBuffer = buffer || '';
  return {
    ...state,
    candidates: Array.isArray(list) ? list : [],
    buffer: newBuffer,
    cursorPos,
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
  // Do not show ghost text if cursor is not at the end of buffer
  if (state.cursorPos !== state.buffer.length) {
    return '';
  }
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

function insertAt(state, char) {
  const before = state.buffer.slice(0, state.cursorPos);
  const after = state.buffer.slice(state.cursorPos);
  return {
    ...state,
    buffer: before + char + after,
    cursorPos: state.cursorPos + 1,
  };
}

function deleteBefore(state) {
  if (state.cursorPos <= 0) {
    return state;
  }
  const before = state.buffer.slice(0, state.cursorPos - 1);
  const after = state.buffer.slice(state.cursorPos);
  return {
    ...state,
    buffer: before + after,
    cursorPos: state.cursorPos - 1,
  };
}

function deleteAt(state) {
  if (state.cursorPos >= state.buffer.length) {
    return state;
  }
  const before = state.buffer.slice(0, state.cursorPos);
  const after = state.buffer.slice(state.cursorPos + 1);
  return {
    ...state,
    buffer: before + after,
  };
}

function moveCursor(state, delta) {
  const newCursorPos = Math.max(0, Math.min(state.cursorPos + delta, state.buffer.length));
  return {
    ...state,
    cursorPos: newCursorPos,
  };
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
    insertAt,
    deleteBefore,
    deleteAt,
    moveCursor,
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
    insertAt,
    deleteBefore,
    deleteAt,
    moveCursor,
    reset,
  };
}
