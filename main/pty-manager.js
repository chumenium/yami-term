const { EventEmitter } = require('events');

class PtyManager extends EventEmitter {
  constructor(options = {}) {
    super();
    const { spawnFn, shell, env } = options;

    this.spawnFn = spawnFn;
    this.shell = shell;
    this.env = env;
    this.ptys = new Map();
    this.nextId = 0;
  }

  _getSpawnFn() {
    if (this.spawnFn) {
      return this.spawnFn;
    }
    try {
      const pty = require('node-pty');
      return pty.spawn;
    } catch (err) {
      throw new Error(`Failed to load node-pty: ${err.message}`);
    }
  }

  create(options = {}) {
    const { cols = 80, rows = 24 } = options;
    const id = String(this.nextId++);

    try {
      const spawnFn = this._getSpawnFn();
      const ptyProcess = spawnFn(this.shell, [], {
        cols,
        rows,
        env: this.env || process.env,
      });

      const ptyRecord = {
        process: ptyProcess,
        cols,
        rows,
      };

      this.ptys.set(id, ptyRecord);

      // Forward data events
      ptyProcess.on('data', (data) => {
        this.emit('data', { id, data });
      });

      // Forward exit events
      ptyProcess.on('exit', () => {
        this.emit('exit', { id });
        this.dispose(id);
      });

      return id;
    } catch (err) {
      this.emit('error', { id, err });
      return id;
    }
  }

  write(id, data) {
    const record = this.ptys.get(id);
    if (!record) {
      return; // silently ignore non-existent id
    }
    try {
      record.process.write(data);
    } catch (err) {
      // ignore write errors
    }
  }

  resize(id, cols, rows) {
    const record = this.ptys.get(id);
    if (!record) {
      return; // silently ignore non-existent id
    }
    try {
      record.process.resize(cols, rows);
      record.cols = cols;
      record.rows = rows;
    } catch (err) {
      // ignore resize errors
    }
  }

  dispose(id) {
    const record = this.ptys.get(id);
    if (!record) {
      return;
    }
    try {
      record.process.kill();
    } catch (err) {
      // ignore kill errors
    }
    this.ptys.delete(id);
  }

  disposeAll() {
    const ids = Array.from(this.ptys.keys());
    ids.forEach((id) => this.dispose(id));
  }
}

module.exports = PtyManager;
