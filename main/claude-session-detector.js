const { EventEmitter } = require('events');
const { execFile } = require('child_process');

class ClaudeSessionDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.intervals = new Map();
    this.sessionState = new Map();
    this._execFile = (options && options.execFile) || execFile;
    this._platform = (options && options.platform) || process.platform;
  }

  start(ptyId, pid) {
    if (this.intervals.has(ptyId)) {
      return;
    }

    const interval = setInterval(() => {
      this._checkClaude(ptyId, pid);
    }, 1500);

    this.intervals.set(ptyId, interval);
    this.sessionState.set(ptyId, false);
    this._checkClaude(ptyId, pid);
  }

  stop(ptyId) {
    const interval = this.intervals.get(ptyId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(ptyId);
    }
    this.sessionState.delete(ptyId);
  }

  _checkClaude(ptyId, pid) {
    // Claude process detection is only supported on macOS.
    // On other platforms (Windows, Linux), ps -A output format differs
    // and locating 'claude' command is not reliable.
    if (this._platform !== 'darwin') {
      return;
    }

    this._execFile('ps', ['-A', '-o', 'pid,ppid,comm'], (err, stdout) => {
      if (err) {
        return;
      }

      const isActive = this._findClaudeProcess(pid, stdout);
      const prevState = this.sessionState.get(ptyId) || false;

      if (isActive !== prevState) {
        this.sessionState.set(ptyId, isActive);
        this.emit('active-changed', ptyId, isActive);
      }
    });
  }

  _findClaudeProcess(parentPid, psOutput) {
    const lines = psOutput.split('\n').slice(1);
    const processes = new Map();
    const children = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const pid = parseInt(parts[0], 10);
        const ppid = parseInt(parts[1], 10);
        const comm = parts[2];

        if (!isNaN(pid) && !isNaN(ppid)) {
          processes.set(pid, { ppid, comm });
          if (ppid === parentPid) {
            children.add(pid);
          }
        }
      }
    }

    const toCheck = new Set(children);
    let found = false;

    while (toCheck.size > 0) {
      const pids = Array.from(toCheck);
      toCheck.clear();

      for (const pid of pids) {
        const proc = processes.get(pid);
        if (!proc) continue;

        if (proc.comm === 'claude') {
          found = true;
          break;
        }

        for (const [childPid, childProc] of processes) {
          if (childProc.ppid === pid && !children.has(childPid)) {
            children.add(childPid);
            toCheck.add(childPid);
          }
        }
      }

      if (found) break;
    }

    return found;
  }
}

module.exports = ClaudeSessionDetector;
