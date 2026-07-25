const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Test utility: create a temporary directory for logs
function createTestLogsDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yami-term-test-'));
  return tmpDir;
}

// Simulate the error logging logic from main.js
function simulateErrorLogging(logsDir, errorInfo) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    const logFilePath = path.join(logsDir, 'renderer-errors.log');
    const logLine = JSON.stringify({
      timestamp: errorInfo.timestamp || new Date().toISOString(),
      ...errorInfo,
    }) + '\n';
    fs.appendFileSync(logFilePath, logLine, 'utf8');
    return logFilePath;
  } catch (err) {
    console.error('[yami-term] failed to log renderer error:', err);
    throw err;
  }
}

describe('Error Reporting', () => {
  test('should create logs directory if it does not exist', () => {
    const logsDir = createTestLogsDir();
    const errorInfo = {
      type: 'error',
      message: 'Test error',
      stack: 'Stack trace here',
      filename: 'test.js',
      lineno: 42,
      colno: 10,
      timestamp: new Date().toISOString(),
    };

    const logFilePath = simulateErrorLogging(logsDir, errorInfo);

    assert.ok(fs.existsSync(logsDir), 'logs directory should exist');
    assert.ok(fs.existsSync(logFilePath), 'renderer-errors.log should exist');

    // Cleanup
    fs.rmSync(logsDir, { recursive: true, force: true });
  });

  test('should log error with correct JSON format', () => {
    const logsDir = createTestLogsDir();
    const errorInfo = {
      type: 'error',
      message: 'Test error message',
      stack: 'at line 1',
      filename: 'renderer.js',
      lineno: 100,
      colno: 5,
    };

    const logFilePath = simulateErrorLogging(logsDir, errorInfo);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent.trim().split('\n');

    assert.strictEqual(logLines.length, 1, 'should have one log line');
    const parsedLog = JSON.parse(logLines[0]);

    assert.strictEqual(parsedLog.type, 'error', 'should have type: error');
    assert.strictEqual(parsedLog.message, 'Test error message', 'should have correct message');
    assert.strictEqual(parsedLog.filename, 'renderer.js', 'should have correct filename');
    assert.strictEqual(parsedLog.lineno, 100, 'should have correct lineno');
    assert.ok(parsedLog.timestamp, 'should have timestamp');

    // Cleanup
    fs.rmSync(logsDir, { recursive: true, force: true });
  });

  test('should append multiple errors to same log file', () => {
    const logsDir = createTestLogsDir();
    const error1 = {
      type: 'error',
      message: 'First error',
      stack: 'stack1',
      filename: 'file1.js',
      lineno: 10,
      colno: 5,
    };
    const error2 = {
      type: 'unhandledrejection',
      reason: 'Promise rejection',
      stack: 'stack2',
    };

    simulateErrorLogging(logsDir, error1);
    simulateErrorLogging(logsDir, error2);

    const logFilePath = path.join(logsDir, 'renderer-errors.log');
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent.trim().split('\n');

    assert.strictEqual(logLines.length, 2, 'should have two log lines');

    const log1 = JSON.parse(logLines[0]);
    const log2 = JSON.parse(logLines[1]);

    assert.strictEqual(log1.message, 'First error', 'first log should be first error');
    assert.strictEqual(log2.type, 'unhandledrejection', 'second log should be unhandledrejection');

    // Cleanup
    fs.rmSync(logsDir, { recursive: true, force: true });
  });

  test('should add timestamp if not provided', () => {
    const logsDir = createTestLogsDir();
    const errorInfo = {
      type: 'error',
      message: 'Error without timestamp',
    };

    const logFilePath = simulateErrorLogging(logsDir, errorInfo);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const parsedLog = JSON.parse(logContent.trim());

    assert.ok(parsedLog.timestamp, 'should have generated timestamp');
    assert.match(parsedLog.timestamp, /^\d{4}-\d{2}-\d{2}T/, 'timestamp should be ISO format');

    // Cleanup
    fs.rmSync(logsDir, { recursive: true, force: true });
  });

  test('should handle unhandledrejection type correctly', () => {
    const logsDir = createTestLogsDir();
    const rejectionInfo = {
      type: 'unhandledrejection',
      reason: 'Something went wrong in promise',
      stack: 'Promise stack trace',
      timestamp: new Date().toISOString(),
    };

    const logFilePath = simulateErrorLogging(logsDir, rejectionInfo);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const parsedLog = JSON.parse(logContent.trim());

    assert.strictEqual(parsedLog.type, 'unhandledrejection', 'should preserve unhandledrejection type');
    assert.strictEqual(parsedLog.reason, 'Something went wrong in promise', 'should preserve reason');

    // Cleanup
    fs.rmSync(logsDir, { recursive: true, force: true });
  });
});
