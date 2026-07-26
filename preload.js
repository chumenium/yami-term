const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yamiterm', {
  // レンダラー側でCmd(mac)/Ctrl(Windows・Linux)のショートカット修飾キーを
  // 判定するために公開する定数値(関数ではない)。
  platform: process.platform,

  async createTerm() {
    return ipcRenderer.invoke('term:create');
  },

  write(id, data) {
    ipcRenderer.send('term:input', { id, data });
  },

  resize(id, cols, rows) {
    ipcRenderer.send('term:resize', { id, cols, rows });
  },

  closeTerm(id) {
    ipcRenderer.send('term:close', { id });
  },

  onData(callback) {
    ipcRenderer.on('term:data', (event, { id, data }) => {
      callback(id, data);
    });
  },

  onExit(callback) {
    ipcRenderer.on('term:exit', (event, { id }) => {
      callback(id);
    });
  },

  async getConfig() {
    return ipcRenderer.invoke('config:get');
  },

  async setConfig(partial) {
    return ipcRenderer.invoke('config:set', partial);
  },

  onConfigChanged(callback) {
    ipcRenderer.on('config:changed', (event, config) => {
      callback(config);
    });
  },

  async suggest(prefix) {
    return ipcRenderer.invoke('suggest:query', { prefix });
  },

  async getAppInfo() {
    return ipcRenderer.invoke('app:getInfo');
  },

  reportError(errorInfo) {
    ipcRenderer.send('renderer:error', errorInfo);
  },

  async revealInFinder(id) {
    return ipcRenderer.invoke('term:revealInFinder', { id });
  },

  onTrayActivateTab(callback) {
    ipcRenderer.on('tray:activateTab', (event, { id }) => {
      callback(id);
    });
  },

  async checkForUpdate() {
    return ipcRenderer.invoke('update:check');
  },

  skipUpdateVersion(version) {
    ipcRenderer.send('update:skip', { version });
  },

  openReleasePage(url) {
    ipcRenderer.send('update:openReleasePage', { url });
  },

  onUpdateAvailable(callback) {
    ipcRenderer.on('update:available', (event, payload) => {
      callback(payload);
    });
  },
});
