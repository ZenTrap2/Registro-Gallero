const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("registroMedia", {
  write: (id, bytes) => ipcRenderer.invoke("media:write", id, bytes),
  read: (id) => ipcRenderer.invoke("media:read", id),
  remove: (id) => ipcRenderer.invoke("media:remove", id),
});
