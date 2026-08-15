import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import { takeScreenshot } from '../adb/commandExecutor.mjs';
export function registerScreenshotHandlers() {
    ipcMain.handle('adb:screenshot', async (_event, serial) => {
        try {
            const base64 = await takeScreenshot(serial);
            return { success: true, data: base64 };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:save-screenshot', async (_event, base64Data) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: 'Save Screenshot',
                defaultPath: `screenshot-${Date.now()}.png`,
                filters: [{ name: 'PNG Images', extensions: ['png'] }],
            });
            if (!filePath) {
                return { success: false, error: 'Save cancelled' };
            }
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
            return { success: true, data: filePath };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
}
