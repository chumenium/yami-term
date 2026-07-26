const fs = require('fs');
const path = require('path');
const os = require('os');

// 設定されたshellに応じた履歴ファイルを選ぶ(zsh拡張履歴 or bashプレーン履歴)。
// main.jsがconfig.shell変更時に再利用する(Electron非依存なのでここに置きテスト可能にする)。
function getHistoryFileForShell(shellPath) {
  const home = os.homedir();
  if (typeof shellPath === 'string' && shellPath.includes('bash')) {
    return path.join(home, '.bash_history');
  }
  return path.join(home, '.zsh_history');
}

function createSuggestSource(options = {}) {
  const {
    historyFile = getHistoryFileForShell(),
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

  // Windows実行可能ファイルの拡張子一覧(PATHEXT相当、大文字小文字を無視して比較)
  const WINDOWS_EXECUTABLE_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.ps1'];

  // A command must be a top-level file (not a child directory) and
  // executable by someone, otherwise it isn't a real runnable command.
  // Windows にはUnixの実行権限ビットが無いため、拡張子で判定する。
  function isExecutableFile(fullPath) {
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return false;

      if (process.platform === 'win32') {
        const ext = path.extname(fullPath).toLowerCase();
        return WINDOWS_EXECUTABLE_EXTENSIONS.includes(ext);
      }

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
    // PATH区切りはUnix=':' / Windows=';'。path.delimiterでプラットフォーム非依存にする。
    const dirs = pathEnv.split(path.delimiter).filter(d => d);

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

createSuggestSource.getHistoryFileForShell = getHistoryFileForShell;

module.exports = createSuggestSource;
