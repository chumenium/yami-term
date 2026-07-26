const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const createSuggestSource = require('../main/suggest-source.js');

function createTempDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-test-'));
  return tmpDir;
}

function cleanupTempDir(dir) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      fs.rmSync(path.join(dir, file), { recursive: true, force: true });
    }
    fs.rmdirSync(dir);
  }
}

test('createSuggestSource returns object with query function', () => {
  const source = createSuggestSource();
  assert(source.query);
  assert(typeof source.query === 'function');
});

test('query() returns array', () => {
  const source = createSuggestSource();
  const result = source.query('git');
  assert(Array.isArray(result));
});

test('query() with prefix < 2 chars returns empty array', () => {
  const source = createSuggestSource();
  assert.deepStrictEqual(source.query('g'), []);
  assert.deepStrictEqual(source.query(''), []);
});

test('query() parses zsh extended history format and deduplicates', (t) => {
  const tmpDir = createTempDir();
  try {
    const historyFile = path.join(tmpDir, '.zsh_history');
    const content = [
      ': 1234567890:0;git status',
      ': 1234567891:0;git log',
      'cd /home',
      ': 1234567892:0;git status', // Duplicate
      ': 1234567893:0;git commit',
      'ls -la',
    ].join('\n');
    fs.writeFileSync(historyFile, content, 'utf8');

    const source = createSuggestSource({ historyFile });
    const results = source.query('git');

    assert(Array.isArray(results));
    const historyCommands = results.filter(r => r.type === 'history');
    const uniqueCommands = new Set(historyCommands.map(r => r.text));

    assert.strictEqual(uniqueCommands.size, historyCommands.length);
    assert(results.some(r => r.text === 'git status' && r.type === 'history'));
    assert(results.some(r => r.text === 'git log' && r.type === 'history'));
    assert(results.some(r => r.text === 'git commit' && r.type === 'history'));
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() history is in reverse order (newest first)', (t) => {
  const tmpDir = createTempDir();
  try {
    const historyFile = path.join(tmpDir, '.zsh_history');
    const content = [
      ': 1234567890:0;git log',
      ': 1234567891:0;git status',
      ': 1234567892:0;git commit',
      ': 1234567893:0;git diff',
    ].join('\n');
    fs.writeFileSync(historyFile, content, 'utf8');

    const source = createSuggestSource({ historyFile });
    const results = source.query('git');

    assert(Array.isArray(results));
    // First result should be the newest (last in file)
    const historyResults = results.filter(r => r.type === 'history');
    assert.strictEqual(historyResults[0].text, 'git diff');
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() type=command for executables in pathEnv', {
  // chmodによるUnixパーミッションビットの模擬はWindowsでは意味を持たない
  // (win32のisExecutableFile()は拡張子で判定するため)。Windows側の挙動は
  // 'isExecutableFile via query() uses extension check on win32' で別途検証済み。
  skip: process.platform === 'win32' ? 'chmod-based executable simulation is POSIX-only' : false,
}, (t) => {
  const tmpDir = createTempDir();
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir);

  try {
    // Create executable files
    fs.writeFileSync(path.join(binDir, 'git-custom'), 'echo test', 'utf8');
    fs.chmodSync(path.join(binDir, 'git-custom'), 0o755);

    fs.writeFileSync(path.join(binDir, 'gitignore'), 'text file', 'utf8');
    fs.chmodSync(path.join(binDir, 'gitignore'), 0o644); // non-executable

    fs.writeFileSync(path.join(binDir, 'git-status'), 'echo test', 'utf8');
    fs.chmodSync(path.join(binDir, 'git-status'), 0o755);

    const source = createSuggestSource({
      historyFile: path.join(tmpDir, '.zsh_history_nonexistent'),
      pathEnv: binDir,
    });
    const results = source.query('git');

    assert(Array.isArray(results));
    const commands = results.filter(r => r.type === 'command');
    assert(commands.some(r => r.text === 'git-custom'));
    assert(commands.some(r => r.text === 'git-status'));
    assert(!commands.some(r => r.text === 'gitignore')); // non-executable file, must be excluded
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() excludes child directories inside pathEnv dirs', {
  skip: process.platform === 'win32' ? 'chmod-based executable simulation is POSIX-only' : false,
}, (t) => {
  const tmpDir = createTempDir();
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir);

  try {
    fs.writeFileSync(path.join(binDir, 'gitk'), 'echo test', 'utf8');
    fs.chmodSync(path.join(binDir, 'gitk'), 0o755);

    // A subdirectory that happens to live alongside real commands
    // (e.g. node_modules/.bin style layouts) must never be suggested
    // as a runnable command.
    fs.mkdirSync(path.join(binDir, 'git-hooks'));
    fs.writeFileSync(path.join(binDir, 'git-hooks', 'pre-commit'), 'echo test', 'utf8');
    fs.chmodSync(path.join(binDir, 'git-hooks', 'pre-commit'), 0o755);

    const source = createSuggestSource({
      historyFile: path.join(tmpDir, '.zsh_history_nonexistent'),
      pathEnv: binDir,
    });
    const results = source.query('git');

    const commands = results.filter(r => r.type === 'command');
    assert(commands.some(r => r.text === 'gitk'));
    assert(!commands.some(r => r.text === 'git-hooks')); // directory, must be excluded
    assert(!commands.some(r => r.text === 'pre-commit')); // nested file, never scanned
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() non-existent history file does not error', (t) => {
  const tmpDir = createTempDir();
  const nonexistentFile = path.join(tmpDir, 'nonexistent.zsh_history');

  try {
    const source = createSuggestSource({
      historyFile: nonexistentFile,
      pathEnv: '/dev/null',
    });

    assert.doesNotThrow(() => {
      const results = source.query('test');
      assert(Array.isArray(results));
    });
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() front-match comes before partial-match', (t) => {
  const tmpDir = createTempDir();
  try {
    const historyFile = path.join(tmpDir, '.zsh_history');
    const content = [
      ': 1000:0;echo test',
      ': 1001:0;git log',
      ': 1002:0;git status',
    ].join('\n');
    fs.writeFileSync(historyFile, content, 'utf8');

    const source = createSuggestSource({ historyFile, pathEnv: '/dev/null' });
    const results = source.query('git');

    const gitResults = results.filter(r => r.text.includes('git'));
    assert(gitResults.length >= 2);
    // Front matches should come before partial matches
    const frontMatches = gitResults.filter(r => r.text.startsWith('git'));
    const partialMatches = gitResults.filter(r => !r.text.startsWith('git'));
    if (partialMatches.length > 0) {
      const lastFrontIdx = gitResults.findIndex(
        r => r.text === frontMatches[frontMatches.length - 1].text
      );
      const firstPartialIdx = gitResults.findIndex(r => partialMatches.includes(r));
      assert(lastFrontIdx < firstPartialIdx || partialMatches.length === 0);
    }
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() max 20 results', (t) => {
  const tmpDir = createTempDir();
  try {
    const historyFile = path.join(tmpDir, '.zsh_history');
    const lines = [];
    for (let i = 0; i < 30; i++) {
      lines.push(`: ${1000 + i}:0;git cmd${i}`);
    }
    fs.writeFileSync(historyFile, lines.join('\n'), 'utf8');

    const source = createSuggestSource({ historyFile, pathEnv: '/dev/null' });
    const results = source.query('git');

    assert(results.length <= 20);
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() mixed zsh extended and plain history format', (t) => {
  const tmpDir = createTempDir();
  try {
    const historyFile = path.join(tmpDir, '.zsh_history');
    const content = [
      ': 1234567890:0;git status',
      'plain line 1',
      ': 1234567891:0;git log',
      'another plain',
      ': 1234567892:0;git commit',
    ].join('\n');
    fs.writeFileSync(historyFile, content, 'utf8');

    const source = createSuggestSource({ historyFile, pathEnv: '/dev/null' });
    const results = source.query('git');

    const gitResults = results.filter(r => r.text.includes('git'));
    assert(gitResults.some(r => r.text === 'git status'));
    assert(gitResults.some(r => r.text === 'git log'));
    assert(gitResults.some(r => r.text === 'git commit'));
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('query() deduplicates across history and commands', (t) => {
  const tmpDir = createTempDir();
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir);

  try {
    // Create history file with 'git status'
    const historyFile = path.join(tmpDir, '.zsh_history');
    fs.writeFileSync(historyFile, ': 1000:0;git status', 'utf8');

    // Create command file with 'git status' as filename (duplicates history)
    fs.writeFileSync(path.join(binDir, 'git status'), 'echo binary', 'utf8');
    fs.chmodSync(path.join(binDir, 'git status'), 0o755);

    const source = createSuggestSource({ historyFile, pathEnv: binDir });
    const results = source.query('git');

    const gitStatusResults = results.filter(r => r.text === 'git status');
    // Same text should appear only once (history processed first, appears as history type)
    assert.strictEqual(gitStatusResults.length, 1);
    assert.strictEqual(gitStatusResults[0].type, 'history');
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('getHistoryFileForShell() returns .bash_history for bash', () => {
  const result = createSuggestSource.getHistoryFileForShell('/bin/bash');
  assert.ok(result.endsWith('.bash_history'));
});

test('getHistoryFileForShell() returns .zsh_history for zsh', () => {
  const result = createSuggestSource.getHistoryFileForShell('/bin/zsh');
  assert.ok(result.endsWith('.zsh_history'));
});

test('getHistoryFileForShell() falls back to .zsh_history for undefined/unknown shell', () => {
  assert.ok(createSuggestSource.getHistoryFileForShell(undefined).endsWith('.zsh_history'));
  assert.ok(createSuggestSource.getHistoryFileForShell('/bin/sh').endsWith('.zsh_history'));
});

test('query() splits pathEnv using platform delimiter (multiple dirs)', {
  skip: process.platform === 'win32' ? 'chmod-based executable simulation is POSIX-only' : false,
}, (t) => {
  const tmpDir = createTempDir();
  const binDir1 = path.join(tmpDir, 'bin1');
  const binDir2 = path.join(tmpDir, 'bin2');
  fs.mkdirSync(binDir1);
  fs.mkdirSync(binDir2);

  try {
    fs.writeFileSync(path.join(binDir1, 'git-one'), 'echo test', 'utf8');
    fs.chmodSync(path.join(binDir1, 'git-one'), 0o755);
    fs.writeFileSync(path.join(binDir2, 'git-two'), 'echo test', 'utf8');
    fs.chmodSync(path.join(binDir2, 'git-two'), 0o755);

    const source = createSuggestSource({
      historyFile: path.join(tmpDir, '.zsh_history_nonexistent'),
      pathEnv: [binDir1, binDir2].join(path.delimiter),
    });
    const results = source.query('git');

    const commands = results.filter(r => r.type === 'command');
    assert(commands.some(r => r.text === 'git-one'));
    assert(commands.some(r => r.text === 'git-two'));
  } finally {
    cleanupTempDir(tmpDir);
  }
});

test('isExecutableFile via query() uses extension check on win32', (t) => {
  const tmpDir = createTempDir();
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir);
  const originalPlatform = process.platform;

  try {
    fs.writeFileSync(path.join(binDir, 'git-tool.exe'), 'binary', 'utf8');
    fs.writeFileSync(path.join(binDir, 'git-readme.txt'), 'text', 'utf8');

    Object.defineProperty(process, 'platform', { value: 'win32' });

    const source = createSuggestSource({
      historyFile: path.join(tmpDir, '.zsh_history_nonexistent'),
      pathEnv: binDir,
    });
    const results = source.query('git');
    const commands = results.filter(r => r.type === 'command');

    assert(commands.some(r => r.text === 'git-tool.exe'));
    assert(!commands.some(r => r.text === 'git-readme.txt'));
  } finally {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    cleanupTempDir(tmpDir);
  }
});

test('query() result objects have text and type properties', (t) => {
  const tmpDir = createTempDir();
  try {
    const historyFile = path.join(tmpDir, '.zsh_history');
    fs.writeFileSync(historyFile, ': 1000:0;git status', 'utf8');

    const source = createSuggestSource({ historyFile, pathEnv: '/dev/null' });
    const results = source.query('git');

    for (const result of results) {
      assert(result.text);
      assert(result.type);
      assert(['history', 'command'].includes(result.type));
    }
  } finally {
    cleanupTempDir(tmpDir);
  }
});
