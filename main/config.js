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
};

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
  const allowedKeys = ['fontSize', 'fontFamily', 'cursorBlink', 'opacity', 'accent', 'shell', 'suggest', 'theme', 'letterSpacing', 'lineHeight', 'scrollback', 'bloomEnabled', 'bloomIntensity'];
  const filtered = {};

  for (const key of allowedKeys) {
    if (key in partial) {
      if (key === 'shell') {
        // Validate shell path
        const shell = partial[key];
        if (typeof shell === 'string' && isShellAllowed(shell)) {
          filtered[key] = shell;
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
