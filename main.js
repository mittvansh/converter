const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: []
  });
  return result;
});

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: []
  });
  return result;
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  if (!filePath) {
    throw new Error('No file path provided');
  }
  const stats = await fs.promises.stat(filePath);
  return {
    name: path.basename(filePath),
    size: stats.size,
    path: filePath
  };
});

ipcMain.handle('convert-file', async (event, inputPath, targetFormat, outputDir, password) => {
  try {
    const { convertFile } = require('./converter');
    // Using arguments array to pass potential password
    return await convertFile({ path: inputPath }, targetFormat, outputDir, password);
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
});

ipcMain.handle('open-path', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});