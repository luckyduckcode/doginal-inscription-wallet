const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Wallet operations
  connectWallet: (config) => ipcRenderer.invoke('wallet:connect', config),
  createWallet: () => ipcRenderer.invoke('wallet:create'),
  importWallet: (seed) => ipcRenderer.invoke('wallet:import', seed),
  generateNewAddress: () => ipcRenderer.invoke('wallet:generateAddress'),
  getBalance: (address) => ipcRenderer.invoke('wallet:getBalance', address),
  getAddresses: () => ipcRenderer.invoke('wallet:getAddresses'),
  
  // DOGE transaction operations
  createDogeTransaction: (data) => ipcRenderer.invoke('doge:createTransaction', data),
  signDogeTransaction: (data) => ipcRenderer.invoke('doge:signTransaction', data),
  broadcastDogeTransaction: (data) => ipcRenderer.invoke('doge:broadcastTransaction', data),
  
  // Inscription operations
  createInscription: (data) => ipcRenderer.invoke('inscription:create', data),
  estimateInscription: (data) => ipcRenderer.invoke('inscription:estimate', data),
  getInscriptionHistory: () => ipcRenderer.invoke('inscription:history'),
  getTransferableInscriptions: (addresses) => ipcRenderer.invoke('inscription:getTransferable', addresses),
  
  // Progress event listener for inscription creation
  onInscriptionProgress: (callback) => ipcRenderer.on('inscription:progress', callback),
  removeInscriptionProgressListener: (callback) => ipcRenderer.removeListener('inscription:progress', callback),
  
  // Utility
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
