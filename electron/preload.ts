import { contextBridge, ipcRenderer } from 'electron';

// Expose safe desktop API bridge to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  savePdfDialog: (defaultFileName: string, base64Data: string) =>
    ipcRenderer.invoke('save-pdf-dialog', { defaultFileName, base64Data }),
  generatePdf: (html: string) =>
    ipcRenderer.invoke('generate-pdf', { html }),
  printHtml: (html: string) =>
    ipcRenderer.invoke('print-html', { html }),
  showNotification: (title: string, body: string) =>
    ipcRenderer.send('show-notification', { title, body }),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
});
