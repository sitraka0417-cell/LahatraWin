'use strict';
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('lahatra', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  googleSignIn: () => ipcRenderer.invoke('google:signin'),
  googleCancel: () => ipcRenderer.invoke('google:cancel'),
  showWindow: () => ipcRenderer.invoke('win:show'),
  alertWindow: () => ipcRenderer.invoke('win:alert'),
  getSystem: () => ipcRenderer.invoke('sys:get'),
  setSystem: (o) => ipcRenderer.invoke('sys:set', o),
  version: () => ipcRenderer.invoke('app:version'),
  quit: () => ipcRenderer.invoke('app:quit'),
  openExternal: (u) => ipcRenderer.invoke('shell:open', u),
  copyText: (t) => ipcRenderer.invoke('clipboard:write', t),
  setZoom: (f) => { try { webFrame.setZoomFactor(f); } catch (e) { /* ignoré */ } },
  on: (channel, cb) => {
    if (['session-lock', 'new-task', 'resume'].includes(channel)) ipcRenderer.on(channel, () => cb());
  }
});
