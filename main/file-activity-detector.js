const { EventEmitter } = require('events');

const MAX_BUFFER_LENGTH = 4000;
const ANSI_REGEX = /\x1b\][^\x07]*\x07|\x1b\[[0-9;?]*[a-zA-Z]|\x1b[()][A-Za-z0-9]|\x1b[=>]/g;

function stripAnsi(str) {
  return str.replace(ANSI_REGEX, '');
}

class FileActivityDetector extends EventEmitter {
  constructor() {
    super();
    this.buffers = new Map();
    this.seenFiles = new Map();
  }

  feed(ptyId, chunk) {
    if (typeof chunk !== 'string') {
      return;
    }

    if (!this.buffers.has(ptyId)) {
      this.buffers.set(ptyId, '');
      this.seenFiles.set(ptyId, new Set());
    }

    const buffer = (this.buffers.get(ptyId) + chunk).slice(-MAX_BUFFER_LENGTH);
    this.buffers.set(ptyId, buffer);

    this._extractFiles(ptyId, buffer);
  }

  _extractFiles(ptyId, buffer) {
    const lines = buffer.split('\n');
    const seenSet = this.seenFiles.get(ptyId);

    for (const rawLine of lines) {
      const line = stripAnsi(rawLine).trim();
      if (!line) continue;

      const action = this._detectAction(line);
      if (!action) continue;

      const filePath = this._extractFilePath(line);
      if (!filePath) continue;

      if (!seenSet.has(filePath)) {
        seenSet.add(filePath);
        this.emit('file-touched', ptyId, {
          filePath,
          action,
          timestamp: Date.now(),
        });
      }
    }
  }

  _detectAction(line) {
    if (line.includes('Read(')) return 'read';
    if (line.includes('Edit(')) return 'edit';
    if (line.includes('Write(')) return 'write';
    return null;
  }

  _extractFilePath(line) {
    // Try to extract path from action parentheses: Read(...), Edit(...), Write(...)
    // This avoids issues with paths containing parentheses.
    const actionMatch = line.match(/(?:Read|Edit|Write)\(([^)]*)\)/);
    if (actionMatch && actionMatch[1]) {
      const candidate = actionMatch[1].trim();
      if (candidate && candidate.length >= 2) {
        return candidate;
      }
    }

    // Fallback to pattern-based extraction for robustness
    const pathRegex = /(\/[^\s]+|\.\/[^\s]+|[~\w\-\.\/]+\/[^\s]+)/;
    const match = line.match(pathRegex);

    if (!match) return null;

    const candidate = match[1].trim();
    if (!candidate || candidate.length < 2) {
      return null;
    }

    return candidate;
  }

  reset(ptyId) {
    this.buffers.delete(ptyId);
    this.seenFiles.delete(ptyId);
  }
}

module.exports = FileActivityDetector;
