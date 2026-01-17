const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  convertFile: (inputPath, targetFormat, outputDir) => ipcRenderer.invoke('convert-file', inputPath, targetFormat, outputDir),
  openPath: (path) => ipcRenderer.invoke('open-path', path)
});