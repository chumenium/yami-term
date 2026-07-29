const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const ClaudeSessionDetector = require('../main/claude-session-detector.js');

// Fake execFile for mocking
let mockExecFile;
let execFileCallCount = 0;

function createMockExecFile(psOutput) {
  execFileCallCount = 0;
  return (cmd, args, callback) => {
    execFileCallCount++;
    // Simulate async execution
    setImmediate(() => {
      callback(null, psOutput);
    });
  };
}

// Utility to wait for an event with timeout
function waitForEvent(emitter, eventName, timeoutMs = 500) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    emitter.once(eventName, (...args) => {
      clearTimeout(timeout);
      resolve(args);
    });
  });
}

// Test: start() creates interval
test('ClaudeSessionDetector - start()がintervalを生成する', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 12345;

  assert.strictEqual(detector.intervals.has(ptyId), false);
  detector.start(ptyId, pid);
  assert.strictEqual(detector.intervals.has(ptyId), true);

  // Clean up
  detector.stop(ptyId);
});

// Test: stop() clears interval
test('ClaudeSessionDetector - stop()がintervalをクリアする', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 12345;

  detector.start(ptyId, pid);
  assert.strictEqual(detector.intervals.has(ptyId), true);

  detector.stop(ptyId);
  assert.strictEqual(detector.intervals.has(ptyId), false);
});

// Test: stop() on non-existent ptyId does not throw
test('ClaudeSessionDetector - 存在しないptyIdへのstop()はthrowしない', () => {
  const detector = new ClaudeSessionDetector();
  assert.doesNotThrow(() => {
    detector.stop('nonexistent-pty');
  });
});

// Test: start() twice on same ptyId ignores second call
test('ClaudeSessionDetector - 同じptyIdへのstart()が2回呼ばれた場合2番目は無視される', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 12345;

  detector.start(ptyId, pid);
  const interval1 = detector.intervals.get(ptyId);

  detector.start(ptyId, pid);
  const interval2 = detector.intervals.get(ptyId);

  assert.strictEqual(interval1, interval2);

  // Clean up
  detector.stop(ptyId);
});

// Test: active-changed event is emitted with correct arguments
test('ClaudeSessionDetector - active-changedイベントが正しい引数で発行される', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 1;
  const parentPid = process.pid;

  // Simulate process tree: current process with child
  const psOutput = `PID   PPID  COMM
${parentPid}     1     zsh
${pid}        ${parentPid}     bash
`;

  // Monkey patch execFile
  const childProcess = require('child_process');
  const originalExecFileFn = childProcess.execFile;
  childProcess.execFile = createMockExecFile(psOutput);

  try {
    detector.start(ptyId, pid);

    // Wait for active-changed event
    const [ptyIdArg, isActive] = await waitForEvent(detector, 'active-changed');

    assert.strictEqual(ptyIdArg, ptyId);
    assert.strictEqual(typeof isActive, 'boolean');

    // Clean up
    detector.stop(ptyId);
  } finally {
    // Restore original execFile
    childProcess.execFile = originalExecFileFn;
  }
});

// Test: active-changed is not emitted multiple times for same state
test('ClaudeSessionDetector - 同じptyIdで状態変化がない限りactive-changedが多重発行されない', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 1;

  const psOutput = `PID   PPID  COMM
${process.pid}     1     zsh
`;

  const childProcess = require('child_process');
  const originalExecFileFn = childProcess.execFile;
  childProcess.execFile = createMockExecFile(psOutput);

  try {
    let eventCount = 0;

    detector.on('active-changed', () => {
      eventCount++;
    });

    detector.start(ptyId, pid);

    // Wait for first event
    await waitForEvent(detector, 'active-changed', 1000);
    assert.strictEqual(eventCount, 1);

    // Wait more but no new event should fire (state unchanged)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should still be 1 (no new events for unchanged state)
    assert.strictEqual(eventCount, 1);

    // Clean up
    detector.stop(ptyId);
  } finally {
    childProcess.execFile = originalExecFileFn;
  }
});

// Test: sessionState is initialized to false
test('ClaudeSessionDetector - start()後のsessionStateはfalseで初期化される', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 12345;

  detector.start(ptyId, pid);

  assert.strictEqual(detector.sessionState.has(ptyId), true);
  // Initially false (Claude process not expected to be present in test)
  assert.strictEqual(detector.sessionState.get(ptyId), false);

  // Clean up
  detector.stop(ptyId);
});

// Test: sessionState is deleted on stop()
test('ClaudeSessionDetector - stop()後のsessionStateが削除される', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId = 'pty-0';
  const pid = 12345;

  detector.start(ptyId, pid);
  assert.strictEqual(detector.sessionState.has(ptyId), true);

  detector.stop(ptyId);
  assert.strictEqual(detector.sessionState.has(ptyId), false);
});

// Test: _findClaudeProcess detects claude command in process tree
test('ClaudeSessionDetector - _findClaudeProcess()がプロセス木からclaudeコマンドを検出', () => {
  const detector = new ClaudeSessionDetector();

  const psOutput = `PID   PPID  COMM
100   1     zsh
101   100   bash
102   101   claude
`;

  const result = detector._findClaudeProcess(100, psOutput);
  assert.strictEqual(result, true);
});

// Test: _findClaudeProcess returns false when claude is not found
test('ClaudeSessionDetector - _findClaudeProcess()がclaudeコマンドがない場合falseを返す', () => {
  const detector = new ClaudeSessionDetector();

  const psOutput = `PID   PPID  COMM
100   1     zsh
101   100   bash
102   101   node
`;

  const result = detector._findClaudeProcess(100, psOutput);
  assert.strictEqual(result, false);
});

// Test: _findClaudeProcess finds claude in grandchild processes
test('ClaudeSessionDetector - _findClaudeProcess()がネストされたプロセス木でclaudeを検出', () => {
  const detector = new ClaudeSessionDetector();

  const psOutput = `PID   PPID  COMM
100   1     zsh
101   100   bash
102   101   node
103   102   claude
`;

  const result = detector._findClaudeProcess(100, psOutput);
  assert.strictEqual(result, true);
});

// Test: _findClaudeProcess ignores processes not in the tree
test('ClaudeSessionDetector - _findClaudeProcess()が親プロセス以外のclaudeを無視', () => {
  const detector = new ClaudeSessionDetector();

  const psOutput = `PID   PPID  COMM
100   1     zsh
101   100   bash
200   1     zsh
201   200   claude
`;

  const result = detector._findClaudeProcess(100, psOutput);
  assert.strictEqual(result, false);
});

// Test: Multiple ptyIds can be tracked independently
test('ClaudeSessionDetector - 複数のptyIdが独立して追跡される', async () => {
  const detector = new ClaudeSessionDetector();
  const ptyId1 = 'pty-0';
  const ptyId2 = 'pty-1';
  const pid1 = 111;
  const pid2 = 222;

  detector.start(ptyId1, pid1);
  detector.start(ptyId2, pid2);

  assert.strictEqual(detector.intervals.has(ptyId1), true);
  assert.strictEqual(detector.intervals.has(ptyId2), true);
  assert.notStrictEqual(detector.intervals.get(ptyId1), detector.intervals.get(ptyId2));

  detector.stop(ptyId1);
  assert.strictEqual(detector.intervals.has(ptyId1), false);
  assert.strictEqual(detector.intervals.has(ptyId2), true);

  detector.stop(ptyId2);
  assert.strictEqual(detector.intervals.has(ptyId2), false);
});

// Test: Event emitter behavior
test('ClaudeSessionDetector - EventEmitterとしての機能', () => {
  const detector = new ClaudeSessionDetector();
  assert.strictEqual(detector instanceof require('events').EventEmitter, true);
});
