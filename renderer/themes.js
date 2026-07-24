const THEMES = [
  {
    id: 'yamikawa',
    label: '闇かわ',
    accent: '#ff79c6',
    accent2: '#bd93f9',
    bgRgb: '13, 13, 18',
    xterm: { background: '#0d0d12', foreground: '#f8f8f2', cursor: '#ff79c6' },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    accent: '#bd93f9',
    accent2: '#ff79c6',
    bgRgb: '40, 42, 54',
    xterm: { background: '#282a36', foreground: '#f8f8f2', cursor: '#bd93f9' },
  },
  {
    id: 'nord',
    label: 'Nord',
    accent: '#88c0d0',
    accent2: '#81a1c1',
    bgRgb: '46, 52, 64',
    xterm: { background: '#2e3440', foreground: '#d8dee9', cursor: '#88c0d0' },
  },
  {
    id: 'matrix',
    label: 'Matrix',
    accent: '#00ff41',
    accent2: '#00b82e',
    bgRgb: '5, 10, 5',
    xterm: { background: '#0d0f0d', foreground: '#00ff41', cursor: '#00ff41' },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    accent: '#268bd2',
    accent2: '#2aa198',
    bgRgb: '0, 43, 54',
    xterm: { background: '#002b36', foreground: '#839496', cursor: '#268bd2' },
  },
];

const DEFAULT_ID = 'yamikawa';

function getById(id) {
  return THEMES.find(t => t.id === id) || THEMES.find(t => t.id === DEFAULT_ID);
}

const api = { THEMES, getById, DEFAULT_ID };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.YamiThemes = api;
}
