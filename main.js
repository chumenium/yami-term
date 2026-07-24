const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const PtyManager = require('./main/pty-manager');
const config = require('./main/config');
const pkg = require('./package.json');

// Load config on startup
config.load();

let mainWindow = null;
let ptyManager = null;

// Helper to clamp cols/rows to 1-512
function clampDimension(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed)) return null;
  return Math.max(1, Math.min(512, parsed));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    vibrancy: 'fullscreen-ui',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#00000000',
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const indexPath = path.join(__dirname, 'renderer', 'index.html');
  mainWindow.loadFile(indexPath);

  if (process.env.YAMI_TERM_DEBUG) {
    mainWindow.webContents.openDevTools();
  }
}

// Safely send an IPC message to the renderer, guarding against a
// window/webContents that has already been destroyed (e.g. during quit,
// when a PTY's async 'exit' event arrives after app.quit() has run).
function sendToRenderer(channel, payload) {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    mainWindow.webContents &&
    !mainWindow.webContents.isDestroyed()
  ) {
    mainWindow.webContents.send(channel, payload);
  }
}

function setupPtyManager() {
  const currentConfig = config.get();
  ptyManager = new PtyManager({
    shell: currentConfig.shell,
    env: process.env,
  });

  // Forward PTY data to renderer
  ptyManager.on('data', (payload) => {
    sendToRenderer('term:data', payload);
  });

  // Forward PTY exit to renderer
  ptyManager.on('exit', (payload) => {
    sendToRenderer('term:exit', payload);
  });
}

function setupIpcChannels() {
  // term:create - create new PTY session
  ipcMain.handle('term:create', (event, options) => {
    const { cols = 80, rows = 24 } = options || {};
    const clampedCols = clampDimension(cols) || 80;
    const clampedRows = clampDimension(rows) || 24;
    const id = ptyManager.create({ cols: clampedCols, rows: clampedRows });
    return { id };
  });

  // term:input - write data to PTY
  ipcMain.on('term:input', (event, payload) => {
    const { id, data } = payload;
    // Validate data: must be string and <= 64KB
    if (typeof data === 'string' && data.length <= 65536) {
      ptyManager.write(id, data);
    }
  });

  // term:resize - resize PTY
  ipcMain.on('term:resize', (event, payload) => {
    const { id, cols, rows } = payload;
    const clampedCols = clampDimension(cols);
    const clampedRows = clampDimension(rows);
    if (clampedCols && clampedRows) {
      ptyManager.resize(id, clampedCols, clampedRows);
    }
  });

  // term:close - close PTY session
  ipcMain.on('term:close', (event, payload) => {
    const { id } = payload;
    ptyManager.dispose(id);
  });

  // config:get - get current config
  ipcMain.handle('config:get', (event) => {
    return config.get();
  });

  // config:set - set partial config and broadcast change
  ipcMain.handle('config:set', (event, partial) => {
    config.set(partial);
    // Broadcast config change to all windows
    sendToRenderer('config:changed', config.get());
  });

  // suggest:query - query command suggestions
  ipcMain.handle('suggest:query', (event, payload) => {
    const { prefix } = payload;
    try {
      const createSuggestSource = require('./main/suggest-source');
      const suggestSource = createSuggestSource({
        pathEnv: process.env.PATH,
      });
      const suggestions = suggestSource.query(prefix);
      return suggestions || [];
    } catch (err) {
      // Fallback to empty array if suggest-source is not available
      return [];
    }
  });

  // app:getInfo - get app info
  ipcMain.handle('app:getInfo', () => {
    return {
      name: pkg.productName || pkg.name,
      version: pkg.version,
      author: pkg.author,
      homepage: pkg.homepage || '',
    };
  });
}

app.on('ready', () => {
  createWindow();
  setupPtyManager();
  setupIpcChannels();

  // Smoke test mode
  if (process.env.YAMI_TERM_SMOKE === '1') {
    console.log('SMOKE_OK');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (ptyManager) {
    ptyManager.disposeAll();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
