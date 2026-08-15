import { ipcMain, Notification } from 'electron';
import { castWindowManager } from '../windows/castWindowManager.mjs';
import { getNotifications } from '../services/notificationService.mjs';
import { getPhoneClipboard, sendPhoneClipboard } from '../services/clipboardService.mjs';
export function registerAdvancedUpgradeHandlers() {
    // ─── Separate Cast Window ──────────────────────────────────────────────
    ipcMain.handle('adb:open-cast-window', async (_event, serial) => {
        try {
            castWindowManager.openWindow(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:close-cast-window', async (_event, serial) => {
        try {
            castWindowManager.closeWindow(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    // ─── Notification Center & Host Desktop Notification ────────────────────
    ipcMain.handle('adb:get-notifications', async (_event, serial) => {
        try {
            const items = await getNotifications(serial);
            return { success: true, data: items };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:show-host-notification', async (_event, payload) => {
        try {
            if (Notification.isSupported()) {
                const displayTitle = payload.appName
                    ? `📱 ${payload.appName}: ${payload.title}`
                    : `📱 ${payload.title}`;
                const notification = new Notification({
                    title: displayTitle,
                    body: payload.body || 'New notification received from device',
                });
                notification.show();
            }
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    // ─── Clipboard Sync ─────────────────────────────────────────────────────
    ipcMain.handle('adb:get-phone-clipboard', async (_event, serial) => {
        try {
            const text = await getPhoneClipboard(serial);
            return { success: true, data: text };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:send-phone-clipboard', async (_event, serial, text) => {
        try {
            await sendPhoneClipboard(serial, text);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
}
