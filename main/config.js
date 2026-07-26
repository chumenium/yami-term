const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  fontSize: 14,
  fontFamily: 'Menlo',
  cursorBlink: true,
  opacity: 0.8,
  accent: '#ff79c6',
  shell: process.env.SHELL || '/bin/zsh',
  suggest: true,
  theme: 'yamikawa',
  letterSpacing: 0,
  lineHeight: 1.0,
  scrollback: 1000,
  bloomEnabled: false,
  bloomIntensity: 4,
  launchers: [
    { id: 'claude', label: 'Claude Code', type: 'command', command: 'claude', icon: 'claude-icon.png', builtin: true },
    { id: 'finder', label: 'Finder', type: 'finder', icon: null, builtin: true },
  ],
  approvalPatterns: [
    { id: 'claude-code', label: 'Claude Code', pattern: 'Do you want to', enabled: true, builtin: true },
    { id: 'generic-yn', label: 'y/n prompt', pattern: '\\(y/n\\)|\\[y/N\\]|\\[Y/n\\]', enabled: true, builtin: true },
  ],
  language: 'auto',
};

// 'auto'はシステム言語(navigator.language)への自動追従。RTL言語(アラビア語等)は
// レイアウト対応が別途必要になるため今回はスコープ外(将来課題)。
const ALLOWED_LANGUAGES = ['auto', 'en', 'ja', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'it', 'id', 'vi', 'hi'];

const CONFIG_FILE = path.join(process.env.HOME, '.yami-term.json');

let config = null;

function load() {
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(content);
    config = { ...DEFAULTS, ...parsed };
  } catch (err) {
    // Fallback to defaults if file doesn't exist or is malformed
    config = { ...DEFAULTS };
  }
  return config;
}

function get() {
  if (config === null) {
    load();
  }
  return { ...config };
}

function set(partial) {
  if (config === null) {
    load();
  }

  // Whitelist allowed keys
  const allowedKeys = ['fontSize', 'fontFamily', 'cursorBlink', 'opacity', 'accent', 'shell', 'suggest', 'theme', 'letterSpacing', 'lineHeight', 'scrollback', 'bloomEnabled', 'bloomIntensity', 'launchers', 'approvalPatterns', 'language'];
  const filtered = {};

  for (const key of allowedKeys) {
    if (key in partial) {
      if (key === 'shell') {
        // Validate shell path
        const shell = partial[key];
        if (typeof shell === 'string' && isShellAllowed(shell)) {
          filtered[key] = shell;
        }
      } else if (key === 'launchers') {
        // Validate launchers: must be an array of well-formed entries
        const launchers = partial[key];
        if (Array.isArray(launchers)) {
          filtered[key] = launchers.filter(l =>
            l && typeof l.id === 'string' && typeof l.label === 'string' && typeof l.type === 'string' &&
            (l.type !== 'command' || typeof l.command === 'string')
          );
        }
      } else if (key === 'approvalPatterns') {
        // Validate approvalPatterns: must be an array of well-formed entries
        const approvalPatterns = partial[key];
        if (Array.isArray(approvalPatterns)) {
          filtered[key] = approvalPatterns
            .filter(p => p && typeof p.id === 'string' && typeof p.label === 'string' && typeof p.pattern === 'string')
            .map(p => ({ ...p, enabled: p.enabled !== false }));
        }
      } else if (key === 'language') {
        // Validate language: must be 'auto' or a supported locale code
        const language = partial[key];
        if (typeof language === 'string' && ALLOWED_LANGUAGES.includes(language)) {
          filtered[key] = language;
        }
      } else {
        filtered[key] = partial[key];
      }
    }
  }

  config = { ...config, ...filtered };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    // ignore write errors
  }
}

function isShellAllowed(shellPath) {
  const allowedPatterns = [
    /^\/bin\/(zsh|bash|sh)$/,
    /^\/usr\/local\/bin\//,
    /^\/opt\/homebrew\/bin\//,
  ];

  if (!fs.existsSync(shellPath)) {
    return false;
  }

  for (const pattern of allowedPatterns) {
    if (pattern.test(shellPath)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  load,
  get,
  set,
  DEFAULTS,
};
