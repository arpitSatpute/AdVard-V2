import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { registerDeviceHandlers } from './ipc/deviceHandlers';
import { registerCommandHandlers } from './ipc/commandHandlers';
import { registerScreenshotHandlers } from './ipc/screenshotHandlers';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerWirelessHandlers } from './ipc/wirelessHandlers';
import { registerAdvancedUpgradeHandlers } from './ipc/upgradeHandlers';
import { registerFastbootHandlers } from './ipc/fastbootHandlers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d0e14',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // sandbox=true breaks some preload features; keep false with contextIsolation
      webSecurity: true,
    },
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register all IPC handlers before creating the window
function registerIpcHandlers(): void {
  registerDeviceHandlers();
  registerCommandHandlers();
  registerScreenshotHandlers();
  registerFileHandlers();
  registerWirelessHandlers();
  registerAdvancedUpgradeHandlers();
  registerFastbootHandlers();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
