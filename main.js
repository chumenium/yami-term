const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const PtyManager = require('./main/pty-manager');
const config = require('./main/config');
const createApprovalManager = require('./main/approval-manager');
const createTrayManager = require('./main/tray-manager');
const createSuggestSource = require('./main/suggest-source');
const pkg = require('./package.json');

// Load config on startup
config.load();

let mainWindow = null;
let ptyManager = null;
let approvalManager = null;
let trayManager = null;
let suggestSource = null;

// suggestSourceは内部にhistory/commandキャッシュを持つため、毎回new生成すると
// キャッシュが効かず起動のたびPATH全ディレクトリを再スキャンしてしまう。
// 1度だけ生成して使い回し、shell設定が変わった時のみ再構築する。
function rebuildSuggestSource() {
  const currentConfig = config.get();
  suggestSource = createSuggestSource({
    pathEnv: process.env.PATH,
    historyFile: createSuggestSource.getHistoryFileForShell(currentConfig.shell),
  });
}

function showAndFocusWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function updateTray() {
  if (trayManager && approvalManager) {
    trayManager.updateState(approvalManager.getAwaitingList());
  }
}

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
    if (approvalManager && approvalManager.feed(payload.id, payload.data)) {
      updateTray();
    }
  });

  // Forward PTY exit to renderer
  ptyManager.on('exit', (payload) => {
    sendToRenderer('term:exit', payload);
    if (approvalManager) {
      approvalManager.remove(payload.id);
      updateTray();
    }
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
      // ユーザーが応答したとみなし、承認待ち状態を即クリアする
      if (approvalManager && approvalManager.clear(id)) {
        updateTray();
      }
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
    if (approvalManager) {
      approvalManager.remove(id);
      updateTray();
    }
  });

  // config:get - get current config
  ipcMain.handle('config:get', (event) => {
    return config.get();
  });

  // config:set - set partial config and broadcast change
  ipcMain.handle('config:set', (event, partial) => {
    config.set(partial);
    if (approvalManager) {
      approvalManager.refreshPatterns();
    }
    if ('shell' in partial) {
      // シェルが変わったら履歴ファイルも変わるためsuggestSourceを再構築する
      rebuildSuggestSource();
    }
    // Broadcast config change to all windows
    sendToRenderer('config:changed', config.get());
  });

  // suggest:query - query command suggestions
  ipcMain.handle('suggest:query', (event, payload) => {
    const { prefix } = payload;
    try {
      const suggestions = suggestSource?.query(prefix);
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

  // term:revealInFinder - open Finder at the pty's shell cwd (macOS only, uses lsof)
  ipcMain.handle('term:revealInFinder', async (event, payload) => {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'revealInFinder is only supported on macOS' };
    }

    const { id } = payload || {};
    const pid = ptyManager.getPid(id);
    if (!pid) {
      return { success: false, error: 'no such terminal' };
    }

    let cwd;
    try {
      const output = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' });
      const line = output.split('\n').find(l => l.startsWith('n'));
      cwd = line ? line.slice(1) : null;
    } catch (err) {
      return { success: false, error: err.message };
    }

    if (!cwd) {
      return { success: false, error: 'cwd not found' };
    }

    const openError = await shell.openPath(cwd);
    if (openError) {
      return { success: false, error: openError };
    }
    return { success: true, cwd };
  });

  // renderer:error - log renderer errors to file
  ipcMain.on('renderer:error', (event, errorInfo) => {
    try {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      // Create logs directory if it doesn't exist
      fs.mkdirSync(logsDir, { recursive: true });

      const logFilePath = path.join(logsDir, 'renderer-errors.log');
      const logLine = JSON.stringify({
        timestamp: errorInfo.timestamp || new Date().toISOString(),
        ...errorInfo,
      }) + '\n';

      fs.appendFileSync(logFilePath, logLine, 'utf8');
    } catch (err) {
      console.error('[yami-term] failed to log renderer error:', err);
    }
  });
}

app.on('ready', () => {
  createWindow();

  approvalManager = createApprovalManager(() => config.get().approvalPatterns);
  rebuildSuggestSource();
  trayManager = createTrayManager({
    iconPath: path.join(__dirname, 'renderer', 'tray-icon.png'),
    onActivateTab: (id) => {
      sendToRenderer('tray:activateTab', { id });
    },
    onShowWindow: showAndFocusWindow,
  });

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
  if (trayManager) {
    trayManager.destroy();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
