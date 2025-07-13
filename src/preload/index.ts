import { contextBridge } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for future IPC methods
  getAppVersion: () => process.env.npm_package_version || '1.0.0',
})