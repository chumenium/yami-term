const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const watchers = new Map(); // { [filePath]: { watcher, count } }

let allowedRootsPromise = null;
function getAllowedRoots() {
  if (!allowedRootsPromise) {
    allowedRootsPromise = Promise.all(
      [os.homedir(), os.tmpdir()].map((root) =>
        fs.promises.realpath(root).catch(() => path.resolve(root))
      )
    );
  }
  return allowedRootsPromise;
}

function isWithinRoot(target, root) {
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return target === root || target.startsWith(rootWithSep);
}

async function normalizeAndResolvePath(filePath) {
  const resolved = path.resolve(filePath);
  const real = await fs.promises.realpath(resolved);
  const roots = await getAllowedRoots();
  if (!roots.some((root) => isWithinRoot(real, root))) {
    throw new Error('Access denied: path outside allowed directories');
  }
  return real;
}

// For writeFile: allow non-existent files by validating the parent directory
async function normalizeAndResolvePathForWrite(filePath) {
  const resolved = path.resolve(filePath);
  const roots = await getAllowedRoots();

  // Refuse to write through a symlink at the target itself — including a
  // dangling one, whose link target doesn't exist yet. Without this check,
  // a symlink planted inside an allowed root (e.g. ~/evil -> /outside/x)
  // would let writeFile create /outside/x once we fall through to the
  // "new file" branch below, since realpath() on a dangling link fails
  // with ENOENT just like a plain missing path does.
  try {
    const lst = await fs.promises.lstat(resolved);
    if (lst.isSymbolicLink()) {
      throw new Error('Access denied: refusing to write through a symbolic link');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  // First try: file exists, use standard realpath
  try {
    const real = await fs.promises.realpath(resolved);
    if (!roots.some((root) => isWithinRoot(real, root))) {
      throw new Error('Access denied: path outside allowed directories');
    }
    return real;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  // File doesn't exist: validate the parent directory's real path (in case
  // the parent itself is a symlink) and rebuild the path from that resolved
  // parent rather than trusting `resolved` verbatim.
  const dir = path.dirname(resolved);
  const base = path.basename(resolved);
  try {
    const realDir = await fs.promises.realpath(dir);
    if (!roots.some((root) => isWithinRoot(realDir, root))) {
      throw new Error('Access denied: path outside allowed directories');
    }
    return path.join(realDir, base);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Parent directory does not exist: ${dir}`);
    }
    throw err;
  }
}

async function readFile(filePath) {
  const normalPath = await normalizeAndResolvePath(filePath);

  try {
    const stat = await fs.promises.stat(normalPath);
    if (stat.size > MAX_FILE_SIZE) {
      const fd = await fs.promises.open(normalPath, 'r');
      try {
        const buffer = Buffer.alloc(MAX_FILE_SIZE);
        const { bytesRead } = await fd.read(buffer, 0, MAX_FILE_SIZE, 0);
        return { content: buffer.toString('utf8', 0, bytesRead), truncated: true };
      } finally {
        await fd.close();
      }
    }

    const content = await fs.promises.readFile(normalPath, { encoding: 'utf8', flag: 'r' });
    return { content, truncated: false };
  } catch (err) {
    throw new Error(`Failed to read file ${filePath}: ${err.message}`);
  }
}

async function listDir(dirPath) {
  const normalPath = await normalizeAndResolvePath(dirPath);

  try {
    const entries = await fs.promises.readdir(normalPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      path: path.join(normalPath, entry.name),
      isDirectory: entry.isDirectory(),
    }));
  } catch (err) {
    throw new Error(`Failed to list directory ${dirPath}: ${err.message}`);
  }
}

// watchFile/unwatchFile both need to await normalizeAndResolvePath() before
// touching the `watchers` ref-count map. Two calls for the same path fired
// without awaiting the first (as callers reasonably do, since the path is
// already known synchronously) would otherwise race: both would see no
// existing entry and create two independent fs.watch() instances, and the
// second `watchers.set()` clobbers the reference to the first — leaking a
// watcher that never gets closed and keeps the event loop alive forever.
// Serializing operations per raw (pre-resolve) path closes that race.
const pathOperationQueues = new Map(); // rawPath -> Promise chain

function serializeByPath(rawPath, fn) {
  const prev = pathOperationQueues.get(rawPath) || Promise.resolve();
  const run = prev.then(fn, fn);
  pathOperationQueues.set(
    rawPath,
    run.then(
      () => {},
      () => {}
    )
  );
  return run;
}

async function watchFile(filePath, onChange) {
  return serializeByPath(filePath, async () => {
    const normalPath = await normalizeAndResolvePath(filePath);

    if (watchers.has(normalPath)) {
      const record = watchers.get(normalPath);
      record.count += 1;
      return;
    }

    try {
      const watcher = fs.watch(normalPath, (eventType) => {
        if (eventType === 'change') {
          onChange();
        }
      });

      // Handle watcher errors to prevent resource leaks
      watcher.on('error', (err) => {
        console.error(`Watch error for ${normalPath}: ${err.message}`);
        watcher.close();
        watchers.delete(normalPath);
      });

      watchers.set(normalPath, { watcher, count: 1 });
    } catch (err) {
      console.error(`Failed to watch file ${filePath}: ${err.message}`);
      throw err;
    }
  });
}

async function unwatchFile(filePath) {
  return serializeByPath(filePath, async () => {
    let normalPath;
    try {
      normalPath = await normalizeAndResolvePath(filePath);
    } catch (err) {
      // If path normalization fails (e.g., file deleted), we can't locate the watcher.
      // Log the error but don't throw, since the goal is to unwatch anyway.
      console.warn(`Unable to normalize path for unwatchFile: ${filePath}: ${err.message}`);
      return;
    }

    if (!watchers.has(normalPath)) {
      return;
    }

    const record = watchers.get(normalPath);
    record.count -= 1;

    if (record.count <= 0) {
      try {
        record.watcher.close();
      } catch (err) {
        console.error(`Failed to close watcher for ${normalPath}: ${err.message}`);
      }
      watchers.delete(normalPath);
    }
  });
}

// O_NOFOLLOW closes the TOCTOU gap between the symlink check in
// normalizeAndResolvePathForWrite() and the actual write below: if the
// target path is swapped for a symlink in between, the write fails (ELOOP)
// instead of silently following it. Not available on Windows, where this
// falls back to a plain write.
const WRITE_FLAGS =
  typeof fs.constants.O_NOFOLLOW === 'number'
    ? fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW
    : 'w';

async function writeFile(filePath, content) {
  const normalPath = await normalizeAndResolvePathForWrite(filePath);

  try {
    await fs.promises.writeFile(normalPath, content, { encoding: 'utf8', flag: WRITE_FLAGS });
  } catch (err) {
    throw new Error(`Failed to write file ${filePath}: ${err.message}`);
  }
}

module.exports = {
  readFile,
  listDir,
  watchFile,
  unwatchFile,
  writeFile,
};
