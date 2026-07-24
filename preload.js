const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yamiterm', {
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
});
