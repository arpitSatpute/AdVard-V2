import { ipcMain } from 'electron';
import { listDevices, getDeviceInfo } from '../adb/deviceManager.mjs';
import { restartAdbServer, getAdbLocateError } from '../adb/adbManager.mjs';
export function registerDeviceHandlers() {
    ipcMain.handle('adb:get-devices', async () => {
        try {
            const devices = await listDevices();
            return { success: true, data: devices };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const adbError = getAdbLocateError();
            return {
                success: false,
                error: adbError || message,
                isAdbMissing: !!adbError,
            };
        }
    });
    ipcMain.handle('adb:get-device-info', async (_event, serial) => {
        try {
            const info = await getDeviceInfo(serial);
            return { success: true, data: info };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { success: false, error: message };
        }
    });
    ipcMain.handle('adb:restart-adb', async () => {
        try {
            await restartAdbServer();
            return { success: true };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { success: false, error: message };
        }
    });
}
