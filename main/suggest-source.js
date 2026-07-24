const fs = require('fs');
const path = require('path');
const os = require('os');

function createSuggestSource(options = {}) {
  const {
    historyFile = path.join(os.homedir(), '.zsh_history'),
    pathEnv = process.env.PATH,
  } = options;

  let historyCache = null;
  let historyCacheTime = 0;
  const CACHE_TTL = 60000; // 60 seconds

  let commandCache = null;

  // Parse zsh extended history format: ": timestamp:0;command"
  function parseZshHistory(content) {
    const lines = content.split('\n');
    const commands = new Map(); // Map to deduplicate, key=command, value=timestamp

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip multi-line commands (lines ending with backslash)
      if (i + 1 < lines.length && lines[i + 1].trim().endsWith('\\')) {
        continue;
      }

      let cmd = null;

      // Try to parse zsh extended history format
      const match = line.match(/^:\s*(\d+):0;(.+)$/);
      if (match) {
        cmd = match[2];
      } else if (!line.startsWith(':')) {
        // Plain line (non-extended format)
        cmd = line;
      }

      if (cmd && !commands.has(cmd)) {
        commands.set(cmd, parseInt(lines[i].match(/\d+/) ? lines[i].match(/\d+/)[0] : 0, 10));
      }
    }

    return Array.from(commands.keys());
  }

  // Load history file with caching
  function loadHistory() {
    const now = Date.now();
    if (historyCache !== null && now - historyCacheTime < CACHE_TTL) {
      return historyCache;
    }

    historyCache = [];
    try {
      const content = fs.readFileSync(historyFile, 'utf8');
      historyCache = parseZshHistory(content);
    } catch (err) {
      // File doesn't exist or can't be read - return empty array
      if (err.code !== 'ENOENT') {
        // Attempt latin1 fallback only for encoding errors
        try {
          const content = fs.readFileSync(historyFile, 'latin1');
          historyCache = parseZshHistory(content);
        } catch (innerErr) {
          // Still failed, keep empty array
        }
      }
    }
    historyCacheTime = now;
    return historyCache;
  }

  // A command must be a top-level file (not a child directory) and
  // executable by someone, otherwise it isn't a real runnable command.
  function isExecutableFile(fullPath) {
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return false;
      return (stat.mode & 0o111) !== 0;
    } catch (err) {
      return false;
    }
  }

  // Load command cache (run once at initialization)
  function loadCommandCache() {
    if (commandCache !== null) {
      return commandCache;
    }

    commandCache = new Set();
    const dirs = pathEnv.split(':').filter(d => d);

    for (const dir of dirs) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (isExecutableFile(path.join(dir, file))) {
            commandCache.add(file);
          }
        });
      } catch (err) {
        // Directory doesn't exist or can't be read - skip
      }
    }

    return commandCache;
  }

  // Query suggestions by prefix
  function query(prefix) {
    if (!prefix || prefix.length < 2 || prefix.length > 256) {
      return [];
    }

    const results = [];
    const seen = new Set();

    // Load history and commands
    const history = loadHistory();
    const commands = loadCommandCache();

    // History: front-match first, then partial match
    const historyFrontMatch = [];
    const historyPartialMatch = [];

    for (const cmd of history) {
      if (seen.has(cmd)) continue;

      if (cmd.startsWith(prefix)) {
        historyFrontMatch.push({ text: cmd, type: 'history' });
        seen.add(cmd);
      } else if (cmd.includes(prefix)) {
        historyPartialMatch.push({ text: cmd, type: 'history' });
        seen.add(cmd);
      }
    }

    results.push(...historyFrontMatch);
    results.push(...historyPartialMatch);

    // Commands: front-match first, then partial match
    const commandFrontMatch = [];
    const commandPartialMatch = [];

    for (const cmd of commands) {
      if (seen.has(cmd)) continue;

      if (cmd.startsWith(prefix)) {
        commandFrontMatch.push({ text: cmd, type: 'command' });
        seen.add(cmd);
      } else if (cmd.includes(prefix)) {
        commandPartialMatch.push({ text: cmd, type: 'command' });
        seen.add(cmd);
      }
    }

    results.push(...commandFrontMatch);
    results.push(...commandPartialMatch);

    // Return up to 20 suggestions
    return results.slice(0, 20);
  }

  return {
    query,
  };
}

module.exports = createSuggestSource;
