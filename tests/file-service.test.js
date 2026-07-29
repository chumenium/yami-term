const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readFile, listDir, watchFile, unwatchFile, writeFile } = require('../main/file-service.js');

test('file-service.js - readFile: 存在するファイルの内容が正しく読めること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'test.txt');

  try {
    const content = 'Hello, World!';
    fs.writeFileSync(testFile, content, 'utf8');

    const result = await readFile(testFile);
    assert.strictEqual(result.content, content);
    assert.strictEqual(result.truncated, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - readFile: 大きいファイルでtruncated:trueになること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'large.txt');

  try {
    // 1MB (MAX_FILE_SIZE) を超える内容
    const content = 'a'.repeat(1024 * 1024 + 100);
    fs.writeFileSync(testFile, content, 'utf8');

    const result = await readFile(testFile);
    assert.strictEqual(result.content.length, 1024 * 1024);
    assert.strictEqual(result.truncated, true);
    // 最初の1MBが正しく取得されていることを確認
    assert.strictEqual(result.content, 'a'.repeat(1024 * 1024));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - readFile: 存在しないパスでエラーになること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'nonexistent.txt');

  try {
    await assert.rejects(
      async () => {
        await readFile(testFile);
      },
      /ENOENT|Failed to read file/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - listDir: ディレクトリエントリがname/path/isDirectoryの形で返される', async (t) => {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-')));
  const subDir = path.join(tmpDir, 'subdir');
  const testFile = path.join(tmpDir, 'test.txt');

  try {
    fs.mkdirSync(subDir);
    fs.writeFileSync(testFile, 'content', 'utf8');

    const result = await listDir(tmpDir);
    assert.strictEqual(result.length, 2);

    // ファイルとディレクトリがそれぞれ含まれているか確認
    const entries = result.reduce((acc, entry) => {
      acc[entry.name] = entry;
      return acc;
    }, {});

    // test.txt はファイル
    assert.ok(entries['test.txt']);
    assert.strictEqual(entries['test.txt'].isDirectory, false);
    assert.strictEqual(entries['test.txt'].path, fs.realpathSync(testFile));

    // subdir はディレクトリ
    assert.ok(entries['subdir']);
    assert.strictEqual(entries['subdir'].isDirectory, true);
    assert.strictEqual(entries['subdir'].path, fs.realpathSync(subDir));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - watchFile/unwatchFile: ファイル変更時にコールバックが呼ばれること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'watch.txt');

  try {
    fs.writeFileSync(testFile, 'initial', 'utf8');

    let callCount = 0;
    const onChange = () => {
      callCount += 1;
    };

    watchFile(testFile, onChange);

    // ファイルの内容を変更
    await new Promise((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(testFile, 'modified', 'utf8');
        // fs.watchはイベント駆動なので、変更検出を待つ
        setTimeout(resolve, 100);
      }, 50);
    });

    // コールバックが呼ばれたことを確認
    assert.ok(callCount > 0);

    // 後処理
    unwatchFile(testFile);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - unwatchFile後はコールバックが呼ばれなくなること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'watch2.txt');

  try {
    fs.writeFileSync(testFile, 'initial', 'utf8');

    let callCount = 0;
    const onChange = () => {
      callCount += 1;
    };

    watchFile(testFile, onChange);

    // 1回目の変更
    await new Promise((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(testFile, 'modified1', 'utf8');
        setTimeout(resolve, 100);
      }, 50);
    });

    const callCountAfterFirstChange = callCount;

    // unwatchFileで監視を停止
    unwatchFile(testFile);

    // 2回目の変更（watcherが削除されているはず）
    await new Promise((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(testFile, 'modified2', 'utf8');
        setTimeout(resolve, 100);
      }, 50);
    });

    // 2回目の変更後もコールバック呼び出し数は増えていないはず
    assert.strictEqual(callCount, callCountAfterFirstChange);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - 同じpathへの複数watchFile呼び出しがref-countで管理されること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'watch-refcount.txt');

  try {
    fs.writeFileSync(testFile, 'initial', 'utf8');

    let callCount1 = 0;
    let callCount2 = 0;

    const onChange1 = () => {
      callCount1 += 1;
    };

    const onChange2 = () => {
      callCount2 += 1;
    };

    // 同じファイルに対して2回watchFileを呼び出し（実装はref-countで管理）
    watchFile(testFile, onChange1);
    watchFile(testFile, onChange2);

    // ファイルを変更
    await new Promise((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(testFile, 'modified', 'utf8');
        setTimeout(resolve, 100);
      }, 50);
    });

    // 両方のコールバックが呼ばれることはないはず（watchers.get()で返される同じhandlerが使われる）
    // 実装上、2回目のwatchFileはcountをインクリメントするだけで新しいwatcherは作られないので、
    // コールバックは最初のonChange1だけが呼ばれるはず
    assert.ok(callCount1 > 0);

    // 1回目のunwatchFile（count: 2 -> 1）
    unwatchFile(testFile);

    const callCountAfterFirstUnwatch = callCount1;

    // ファイルを再度変更
    await new Promise((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(testFile, 'modified-again', 'utf8');
        setTimeout(resolve, 100);
      }, 50);
    });

    // 2回目のunwatchFileまで監視は続いているはず
    assert.ok(callCount1 > callCountAfterFirstUnwatch);

    // 2回目のunwatchFile（count: 1 -> 0、watcher削除）
    unwatchFile(testFile);

    const callCountAfterSecondUnwatch = callCount1;

    // ファイルを3度目に変更
    await new Promise((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(testFile, 'modified-thrice', 'utf8');
        setTimeout(resolve, 100);
      }, 50);
    });

    // 監視が停止されているはずなのでコールバック呼び出し数は変わらないはず
    assert.strictEqual(callCount1, callCountAfterSecondUnwatch);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - パストラバーサル対策: 相対パス指定での挙動', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const targetFile = path.join(tmpDir, 'target.txt');
  const subDir = path.join(tmpDir, 'subdir');

  try {
    fs.mkdirSync(subDir);
    fs.writeFileSync(targetFile, 'target content', 'utf8');

    // リアルパスが解決されるため、..を使った相対パスもnormalizeAndResolvePathで
    // 実際のファイルに解決される。ただし、存在しないファイルへのアクセスは失敗するはず
    const traversalPath = path.join(subDir, '..', '..', '..', 'etc', 'passwd');

    await assert.rejects(
      async () => {
        await readFile(traversalPath);
      },
      /ENOENT|Failed to read file/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - writeFile: 存在するファイルに書き込み、内容が更新されることを確認', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'overwrite.txt');

  try {
    // 初期内容でファイルを作成
    const initialContent = 'Initial content';
    fs.writeFileSync(testFile, initialContent, 'utf8');

    // 新しい内容で上書き
    const newContent = 'Updated content';
    await writeFile(testFile, newContent);

    // readFileで確認
    const result = await readFile(testFile);
    assert.strictEqual(result.content, newContent);
    assert.strictEqual(result.truncated, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - writeFile: パストラバーサル対策で許可ルート外への書き込みが拒否されること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const testFile = path.join(tmpDir, 'test.txt');

  try {
    // 既存ファイルを作成
    fs.writeFileSync(testFile, 'original', 'utf8');

    // 許可ルート外へのパストラバーサルを含むパスで上書き試行
    // 例: /tmp/.../test.txt を /tmp/../../../etc/passwd のような形式で参照
    const traversalPath = path.join(testFile, '..', '..', '..', 'etc', 'passwd');

    await assert.rejects(
      async () => {
        await writeFile(traversalPath, 'malicious content');
      },
      /Access denied|path outside allowed directories|Parent directory does not exist/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - writeFile: 存在しないファイルパスへの書き込みで親ディレクトリ非存在時にエラーになること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const nonexistentDir = path.join(tmpDir, 'nonexistent');
  const newFilePath = path.join(nonexistentDir, 'new-file.txt');

  try {
    // 親ディレクトリが存在しないのでエラーになるはず
    await assert.rejects(
      async () => {
        await writeFile(newFilePath, 'new content');
      },
      /Parent directory does not exist|ENOENT|Failed to write file/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - writeFile: 存在する親ディレクトリ配下に新規ファイルを作成できること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  const newFilePath = path.join(tmpDir, 'new-file.txt');

  try {
    // 新規ファイル作成
    const content = 'New file content';
    await writeFile(newFilePath, content);

    // readFileで確認
    const result = await readFile(newFilePath);
    assert.strictEqual(result.content, content);
    assert.strictEqual(result.truncated, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('file-service.js - writeFile: 許可ルート内のdanglingシンボリックリンク経由での許可ルート外書き込みが拒否されること', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-file-service-'));
  // /private/tmp is outside the realpath'd os.tmpdir() (which resolves under
  // /private/var/folders/.../T on macOS), so it's a reliable "outside allowed roots" target here.
  const outsideDir = fs.mkdtempSync('/private/tmp/yami-term-outside-');
  const danglingLinkPath = path.join(tmpDir, 'evil-link.txt');
  const outsideTarget = path.join(outsideDir, 'pwned.txt');

  try {
    fs.symlinkSync(outsideTarget, danglingLinkPath);

    await assert.rejects(
      async () => {
        await writeFile(danglingLinkPath, 'PWNED');
      },
      /Access denied/
    );
    assert.strictEqual(fs.existsSync(outsideTarget), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
    if (fs.existsSync(outsideTarget)) fs.unlinkSync(outsideTarget);
  }
});
