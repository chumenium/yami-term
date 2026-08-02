const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * すべてのJavaScriptファイルの構文をnodeの--checkオプションで検証する
 *
 * 背景: renderer/file-tree.jsのような、非asyncなforEachコールバック内でawaitを使う
 * 構文エラーが、既存テストやチェックスクリプトで検出されず、
 * ファイル全体がSyntaxErrorになり、ウィンドウオブジェクトが未定義になるという
 * 致命的なバグが発生したことがある。
 *
 * このテストはそのような構文エラーを事前に検出するために追加された。
 */

/**
 * リポジトリルート配下のすべての.jsファイルを動的に探索して返す
 */
function getJavaScriptFiles() {
  const repoRoot = path.join(__dirname, '..');
  const targetPaths = [
    path.join(repoRoot, 'main.js'),
    path.join(repoRoot, 'preload.js'),
    path.join(repoRoot, 'main'),
    path.join(repoRoot, 'renderer'),
    path.join(repoRoot, 'scripts'),
    path.join(repoRoot, 'tests'),
  ];

  const jsFiles = [];

  for (const targetPath of targetPaths) {
    if (!fs.existsSync(targetPath)) {
      continue;
    }

    if (fs.statSync(targetPath).isFile()) {
      // ファイルそのもの
      jsFiles.push(targetPath);
    } else {
      // ディレクトリを再帰探索
      const walkDir = (dirPath) => {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry);
          const stat = fs.statSync(fullPath);

          // node_modules, dist, .gitは除外
          if (entry === 'node_modules' || entry === 'dist' || entry === '.git') {
            continue;
          }

          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.endsWith('.js')) {
            jsFiles.push(fullPath);
          }
        }
      };
      walkDir(targetPath);
    }
  }

  return jsFiles.sort();
}

test('全JavaScriptファイルの構文が有効であること', async (t) => {
  const jsFiles = getJavaScriptFiles();

  assert.ok(jsFiles.length > 0, 'チェック対象のJavaScriptファイルが見つかるべき');

  const syntaxErrors = [];

  for (const filePath of jsFiles) {
    try {
      // node --check は構文チェック専用（実行はしない）
      execFileSync('node', ['--check', filePath], {
        stdio: 'pipe', // stdoutとstderrをキャプチャ
      });
    } catch (error) {
      // 非ゼロ終了 = 構文エラー
      syntaxErrors.push({
        file: path.relative(path.join(__dirname, '..'), filePath),
        error: error.stderr ? error.stderr.toString() : error.message,
      });
    }
  }

  if (syntaxErrors.length > 0) {
    const errorMessage = syntaxErrors
      .map((e) => `\n${e.file}:\n${e.error}`)
      .join('\n---\n');
    assert.fail(`以下のファイルに構文エラーが見つかりました:${errorMessage}`);
  }
});

test('対象ファイル数が予想範囲内であること', async (t) => {
  const jsFiles = getJavaScriptFiles();

  // main.js, preload.js + main/*/ + renderer/*/ + scripts/* + tests/*
  // 大幅な追加がない限り30ファイル以上あるはず
  assert.ok(
    jsFiles.length >= 30,
    `検査対象のJavaScriptファイル数が30以上であるべき (実際: ${jsFiles.length})`
  );
});
