const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  convertFile: (inputPath, targetFormat, outputDir, password) => ipcRenderer.invoke('convert-file', inputPath, targetFormat, outputDir, password),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  getFilePath: (file) => webUtils.getPathForFile(file)
});