import { ipcMain } from 'electron';
import { castWindowManager } from '../windows/castWindowManager';
import { getNotifications } from '../services/notificationService';
import { getPhoneClipboard, sendPhoneClipboard } from '../services/clipboardService';
import { listDirectory, createDirectory, deleteRemoteFile } from '../services/fileExplorerService';

export function registerAdvancedUpgradeHandlers(): void {
  // ─── Separate Cast Window ──────────────────────────────────────────────
  ipcMain.handle('adb:open-cast-window', async (_event, serial: string) => {
    try {
      castWindowManager.openWindow(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:close-cast-window', async (_event, serial: string) => {
    try {
      castWindowManager.closeWindow(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ─── Notification Center ────────────────────────────────────────────────
  ipcMain.handle('adb:get-notifications', async (_event, serial: string) => {
    try {
      const items = await getNotifications(serial);
      return { success: true, data: items };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ─── Clipboard Sync ─────────────────────────────────────────────────────
  ipcMain.handle('adb:get-phone-clipboard', async (_event, serial: string) => {
    try {
      const text = await getPhoneClipboard(serial);
      return { success: true, data: text };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:send-phone-clipboard', async (_event, serial: string, text: string) => {
    try {
      await sendPhoneClipboard(serial, text);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });


}
