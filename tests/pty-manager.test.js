const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const PtyManager = require('../main/pty-manager.js');

// フェイク pty プロセスオブジェクト
class FakePtyProcess extends EventEmitter {
  constructor() {
    super();
    this.writeCalls = [];
    this.resizeCalls = [];
    this.killCalled = false;
    this.pid = 12345;
  }

  write(data) {
    this.writeCalls.push(data);
  }

  resize(cols, rows) {
    this.resizeCalls.push({ cols, rows });
  }

  kill() {
    this.killCalled = true;
  }
}

// フェイク spawn 関数
function createFakeSpawnFn() {
  const spawnedProcesses = [];

  const spawnFn = (shell, args, options) => {
    const ptyProcess = new FakePtyProcess();
    spawnedProcesses.push({
      shell,
      args,
      options,
      process: ptyProcess,
    });
    return ptyProcess;
  };

  spawnFn.spawnedProcesses = spawnedProcesses;
  return spawnFn;
}

test('PtyManager - create()がspawnFnを呼び出し、idを返す', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });

  assert.strictEqual(typeof id, 'string');
  assert.strictEqual(id, '0');
  assert.strictEqual(spawnFn.spawnedProcesses.length, 1);
  assert.strictEqual(spawnFn.spawnedProcesses[0].shell, '/bin/zsh');
  assert.deepStrictEqual(spawnFn.spawnedProcesses[0].options, { cols: 80, rows: 24, env: process.env });
});

test('PtyManager - create()は複数呼び出しで異なるidを返す', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/bash' });

  const id1 = manager.create({ cols: 80, rows: 24 });
  const id2 = manager.create({ cols: 100, rows: 30 });

  assert.notStrictEqual(id1, id2);
  assert.strictEqual(id1, '0');
  assert.strictEqual(id2, '1');
  assert.strictEqual(spawnFn.spawnedProcesses.length, 2);
});

test('PtyManager - write()が対象ptyへデータを送信', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  manager.write(id, 'test data');

  const ptyProcess = spawnFn.spawnedProcesses[0].process;
  assert.deepStrictEqual(ptyProcess.writeCalls, ['test data']);
});

test('PtyManager - resize()が対象ptyをリサイズ', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  manager.resize(id, 120, 40);

  const ptyProcess = spawnFn.spawnedProcesses[0].process;
  assert.deepStrictEqual(ptyProcess.resizeCalls, [{ cols: 120, rows: 40 }]);
});

test('PtyManager - ptyのonData発火で\'data\'イベントを発行', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  const ptyProcess = spawnFn.spawnedProcesses[0].process;

  let receivedEvent = null;
  manager.on('data', (event) => {
    receivedEvent = event;
  });

  // pty の onData イベントをシミュレート
  ptyProcess.emit('data', 'test output');

  assert.deepStrictEqual(receivedEvent, { id, data: 'test output' });
});

test('PtyManager - ptyのonExit発火で\'exit\'イベントを発行', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  const ptyProcess = spawnFn.spawnedProcesses[0].process;

  let receivedEvent = null;
  manager.on('exit', (event) => {
    receivedEvent = event;
  });

  // pty の onExit イベントをシミュレート
  ptyProcess.emit('exit');

  assert.deepStrictEqual(receivedEvent, { id });
});

test('PtyManager - dispose()がptyのkill()を呼び出す', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  const ptyProcess = spawnFn.spawnedProcesses[0].process;

  assert.strictEqual(ptyProcess.killCalled, false);
  manager.dispose(id);
  assert.strictEqual(ptyProcess.killCalled, true);
});

test('PtyManager - 存在しないidへのwrite()はthrowしない', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  // エラーをスロー しない
  assert.doesNotThrow(() => {
    manager.write('nonexistent-id', 'data');
  });
});

test('PtyManager - 存在しないidへのresize()はthrowしない', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  assert.doesNotThrow(() => {
    manager.resize('nonexistent-id', 80, 24);
  });
});

test('PtyManager - 存在しないidへのdispose()はthrowしない', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  assert.doesNotThrow(() => {
    manager.dispose('nonexistent-id');
  });
});

test('PtyManager - disposeAll()がすべてのptyのkill()を呼び出す', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id1 = manager.create({ cols: 80, rows: 24 });
  const id2 = manager.create({ cols: 100, rows: 30 });
  const id3 = manager.create({ cols: 120, rows: 40 });

  const ptyProcess1 = spawnFn.spawnedProcesses[0].process;
  const ptyProcess2 = spawnFn.spawnedProcesses[1].process;
  const ptyProcess3 = spawnFn.spawnedProcesses[2].process;

  assert.strictEqual(ptyProcess1.killCalled, false);
  assert.strictEqual(ptyProcess2.killCalled, false);
  assert.strictEqual(ptyProcess3.killCalled, false);

  manager.disposeAll();

  assert.strictEqual(ptyProcess1.killCalled, true);
  assert.strictEqual(ptyProcess2.killCalled, true);
  assert.strictEqual(ptyProcess3.killCalled, true);
});

test('PtyManager - オプション引数のデフォルト値', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn });

  const id = manager.create();

  assert.strictEqual(spawnFn.spawnedProcesses.length, 1);
  assert.deepStrictEqual(spawnFn.spawnedProcesses[0].options, { cols: 80, rows: 24, env: process.env });
});

test('PtyManager - constructor()でshellとenvを設定', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const customEnv = { PATH: '/custom' };
  const manager = new PtyManager({ spawnFn, shell: '/bin/bash', env: customEnv });

  manager.create({ cols: 80, rows: 24 });

  assert.strictEqual(spawnFn.spawnedProcesses[0].shell, '/bin/bash');
  assert.deepStrictEqual(spawnFn.spawnedProcesses[0].options.env, customEnv);
});

test('PtyManager - getPid()が対象ptyのpidを返す', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  assert.strictEqual(manager.getPid(id), 12345);
});

test('PtyManager - 存在しないidへのgetPid()はnullを返す', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  assert.strictEqual(manager.getPid('nonexistent-id'), null);
});

test('PtyManager - dispose()後にwrite/resizeは無視される', async (t) => {
  const spawnFn = createFakeSpawnFn();
  const manager = new PtyManager({ spawnFn, shell: '/bin/zsh' });

  const id = manager.create({ cols: 80, rows: 24 });
  manager.dispose(id);

  // dispose後の操作はエラーを出さずに無視される
  assert.doesNotThrow(() => {
    manager.write(id, 'data');
    manager.resize(id, 100, 30);
  });
});
