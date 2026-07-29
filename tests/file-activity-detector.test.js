const test = require('node:test');
const assert = require('node:assert');
const FileActivityDetector = require('../main/file-activity-detector.js');

test('FileActivityDetector - feed()にRead()を含むテキストでfile-touchedイベントが発行される', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventFired = false;
  let eventData = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    eventFired = true;
    eventData = { ptyId: ptyIdArg, ...data };
  });

  detector.feed(ptyId, 'Read(/Users/sakai.satoshi/Documents/yami-term/main/test.js)\n');

  assert.strictEqual(eventFired, true);
  assert.strictEqual(eventData.ptyId, ptyId);
  assert.strictEqual(eventData.filePath, '/Users/sakai.satoshi/Documents/yami-term/main/test.js');
  assert.strictEqual(eventData.action, 'read');
  assert.strictEqual(typeof eventData.timestamp, 'number');
});

test('FileActivityDetector - feed()にEdit()を含むテキストでfile-touchedイベントが発行される', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventFired = false;
  let eventData = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    eventFired = true;
    eventData = { ptyId: ptyIdArg, ...data };
  });

  detector.feed(ptyId, 'Edit(src/foo.js)\n');

  assert.strictEqual(eventFired, true);
  assert.strictEqual(eventData.filePath, 'src/foo.js');
  assert.strictEqual(eventData.action, 'edit');
});

test('FileActivityDetector - feed()にWrite()を含むテキストでfile-touchedイベントが発行される', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventFired = false;
  let eventData = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    eventFired = true;
    eventData = { ptyId: ptyIdArg, ...data };
  });

  detector.feed(ptyId, 'Write(/path/to/file.txt)\n');

  assert.strictEqual(eventFired, true);
  assert.strictEqual(eventData.filePath, '/path/to/file.txt');
  assert.strictEqual(eventData.action, 'write');
});

test('FileActivityDetector - ANSIエスケープシーケンス付きテキストからファイルを正しく抽出', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventData = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    eventData = data;
  });

  // ANSI: bold, reverse, clear
  detector.feed(ptyId, '\x1b[1m\x1b[7mRead(/path/to/file.js)\x1b[27m\x1b[0m\n');

  assert.strictEqual(eventData.filePath, '/path/to/file.js');
  assert.strictEqual(eventData.action, 'read');
});

test('FileActivityDetector - 同じファイルへのアクションは一度だけイベント発行', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventCount = 0;

  detector.on('file-touched', () => {
    eventCount++;
  });

  detector.feed(ptyId, 'Read(/path/to/file.js)\n');
  detector.feed(ptyId, 'Read(/path/to/file.js)\n');
  detector.feed(ptyId, 'Read(/path/to/file.js)\n');

  assert.strictEqual(eventCount, 1);
});

test('FileActivityDetector - 異なるファイルは複数イベント発行', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventCount = 0;
  let files = [];

  detector.on('file-touched', (ptyIdArg, data) => {
    eventCount++;
    files.push(data.filePath);
  });

  detector.feed(ptyId, 'Read(/path/to/file1.js)\n');
  detector.feed(ptyId, 'Edit(/path/to/file2.js)\n');
  detector.feed(ptyId, 'Write(/path/to/file3.js)\n');

  assert.strictEqual(eventCount, 3);
  assert.deepStrictEqual(files, ['/path/to/file1.js', '/path/to/file2.js', '/path/to/file3.js']);
});

test('FileActivityDetector - 複数行からファイルを抽出', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventCount = 0;

  detector.on('file-touched', () => {
    eventCount++;
  });

  detector.feed(ptyId, '$ some command\nRead(/file1.js)\n$ another\nEdit(/file2.js)\n');

  assert.strictEqual(eventCount, 2);
});

test('FileActivityDetector - アクション検出なし（Read/Edit/Writeなし）', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventFired = false;

  detector.on('file-touched', () => {
    eventFired = true;
  });

  detector.feed(ptyId, '$ ls -la\nfile1.js file2.js\n');

  assert.strictEqual(eventFired, false);
});

test('FileActivityDetector - バッファが上限(4000文字)を超えると古い部分が切り捨てられる', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventCount = 0;

  detector.on('file-touched', () => {
    eventCount++;
  });

  // First, add a file detection
  detector.feed(ptyId, 'Read(/file1.js)\n');
  assert.strictEqual(eventCount, 1);

  // Add large amount of data to push buffer over 4000 chars
  // This will cause the buffer to keep only the last 4000 chars
  detector.feed(ptyId, 'x'.repeat(5000));

  // The buffer now contains mostly 'x' characters, but seenFiles still has /file1.js
  // So a new file should still trigger an event
  detector.feed(ptyId, 'Read(/file2.js)\n');
  assert.strictEqual(eventCount, 2);

  // The old file (now outside buffer) is still in seenFiles, so it won't fire
  detector.feed(ptyId, 'Read(/file1.js)\n');
  assert.strictEqual(eventCount, 2); // No new event
});

test('FileActivityDetector - reset()でバッファと履歴がクリアされる', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventCount = 0;

  detector.on('file-touched', () => {
    eventCount++;
  });

  detector.feed(ptyId, 'Read(/file1.js)\n');
  assert.strictEqual(eventCount, 1);

  // Reset should clear the seenFiles and buffer
  detector.reset(ptyId);

  // Feed the same file again
  detector.feed(ptyId, 'Read(/file1.js)\n');

  // Should fire again after reset
  assert.strictEqual(eventCount, 2);
});

test('FileActivityDetector - 複数のptyIdが独立して追跡される', () => {
  const detector = new FileActivityDetector();
  const ptyId1 = 'pty-0';
  const ptyId2 = 'pty-1';

  let events1 = [];
  let events2 = [];

  detector.on('file-touched', (ptyIdArg, data) => {
    if (ptyIdArg === ptyId1) {
      events1.push(data.filePath);
    } else if (ptyIdArg === ptyId2) {
      events2.push(data.filePath);
    }
  });

  detector.feed(ptyId1, 'Read(/path/to/file1.js)\n');
  detector.feed(ptyId2, 'Edit(/path/to/file2.js)\n');

  assert.deepStrictEqual(events1, ['/path/to/file1.js']);
  assert.deepStrictEqual(events2, ['/path/to/file2.js']);
});

test('FileActivityDetector - ptyId1で読んだファイルはptyId2でも読める', () => {
  const detector = new FileActivityDetector();
  const ptyId1 = 'pty-0';
  const ptyId2 = 'pty-1';

  let eventCount = 0;

  detector.on('file-touched', () => {
    eventCount++;
  });

  detector.feed(ptyId1, 'Read(/shared/file.js)\n');
  assert.strictEqual(eventCount, 1);

  // Same file on different ptyId
  detector.feed(ptyId2, 'Read(/shared/file.js)\n');

  assert.strictEqual(eventCount, 2);
});

test('FileActivityDetector - 空の行は無視される', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventCount = 0;

  detector.on('file-touched', () => {
    eventCount++;
  });

  detector.feed(ptyId, '\n\n\nRead(/file.js)\n\n\n');

  assert.strictEqual(eventCount, 1);
});

test('FileActivityDetector - 相対パスを抽出', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let filePath = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    filePath = data.filePath;
  });

  detector.feed(ptyId, 'Read(./src/index.js)\n');

  assert.strictEqual(filePath, './src/index.js');
});

test('FileActivityDetector - チルダ含むパスを抽出', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let filePath = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    filePath = data.filePath;
  });

  detector.feed(ptyId, 'Read(~/Documents/file.js)\n');

  assert.strictEqual(filePath, '~/Documents/file.js');
});

test('FileActivityDetector - ハイフンやドットを含むパスを抽出', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let filePath = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    filePath = data.filePath;
  });

  detector.feed(ptyId, 'Read(src/my-module.test.js)\n');

  assert.strictEqual(filePath, 'src/my-module.test.js');
});

test('FileActivityDetector - 複数のANSIシーケンスが混在', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let filePath = null;
  let action = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    filePath = data.filePath;
    action = data.action;
  });

  // Multiple ANSI sequences
  const text = '\x1b[1m\x1b[32mEdit(\x1b[0m\x1b[1msrc/app.js\x1b[0m\x1b[32m)\x1b[0m\n';
  detector.feed(ptyId, text);

  assert.strictEqual(filePath, 'src/app.js');
  assert.strictEqual(action, 'edit');
});

test('FileActivityDetector - feed()が文字列でない場合は無視される', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let eventFired = false;

  detector.on('file-touched', () => {
    eventFired = true;
  });

  // Non-string inputs
  detector.feed(ptyId, null);
  detector.feed(ptyId, undefined);
  detector.feed(ptyId, 123);
  detector.feed(ptyId, {});

  assert.strictEqual(eventFired, false);
});

test('FileActivityDetector - EventEmitterとしての機能', () => {
  const detector = new FileActivityDetector();
  assert.strictEqual(detector instanceof require('events').EventEmitter, true);
});

test('FileActivityDetector - 長いファイルパスを正しく抽出', () => {
  const detector = new FileActivityDetector();
  const ptyId = 'pty-0';

  let filePath = null;

  detector.on('file-touched', (ptyIdArg, data) => {
    filePath = data.filePath;
  });

  const longPath = '/Users/sakai.satoshi/Documents/yami-term/main/very/deeply/nested/path/to/file.js';
  detector.feed(ptyId, `Read(${longPath})\n`);

  assert.strictEqual(filePath, longPath);
});
