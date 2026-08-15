import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
class CastWindowManager {
    constructor() {
        this.windows = new Map();
    }
    /**
     * Opens or focuses a separate phone-shaped window for the given device.
     */
    openWindow(serial) {
        if (this.windows.has(serial)) {
            const existingWin = this.windows.get(serial);
            if (!existingWin.isDestroyed()) {
                existingWin.focus();
                return existingWin;
            }
        }
        const castWindow = new BrowserWindow({
            width: 410,
            height: 840,
            minWidth: 320,
            minHeight: 640,
            title: `AdVard Screen — ${serial}`,
            backgroundColor: '#090a0f',
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 14, y: 14 },
            webPreferences: {
                preload: path.join(__dirname, '../preload.mjs'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                webSecurity: true,
            },
            show: false,
        });
        if (isDev) {
            castWindow.loadURL(`http://localhost:5173/#/cast?serial=${encodeURIComponent(serial)}`);
        }
        else {
            castWindow.loadFile(path.join(__dirname, '../../renderer/index.html'), {
                hash: `/cast?serial=${encodeURIComponent(serial)}`,
            });
        }
        castWindow.once('ready-to-show', () => {
            castWindow.show();
        });
        castWindow.on('closed', () => {
            this.windows.delete(serial);
        });
        this.windows.set(serial, castWindow);
        return castWindow;
    }
    closeWindow(serial) {
        if (this.windows.has(serial)) {
            const win = this.windows.get(serial);
            if (!win.isDestroyed()) {
                win.close();
            }
            this.windows.delete(serial);
        }
    }
    closeAll() {
        for (const [serial, win] of this.windows.entries()) {
            if (!win.isDestroyed()) {
                win.close();
            }
        }
        this.windows.clear();
    }
}
export const castWindowManager = new CastWindowManager();
