import { ipcMain, dialog } from 'electron';
import * as path from 'path';
import {
  listPackages,
  launchApp,
  forceStopApp,
  clearAppData,
  installApk,
  uninstallApp,
  pushFile,
  pullFile,
} from '../adb/commandExecutor';

export function registerFileHandlers(): void {
  ipcMain.handle('adb:list-packages', async (_event, serial: string, filterType: 'all' | '3rdparty' | 'system' = 'all') => {
    try {
      const packages = await listPackages(serial, filterType);
      return { success: true, data: packages };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:launch-app', async (_event, serial: string, packageName: string) => {
    try {
      await launchApp(serial, packageName);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:force-stop', async (_event, serial: string, packageName: string) => {
    try {
      await forceStopApp(serial, packageName);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:clear-data', async (_event, serial: string, packageName: string) => {
    try {
      await clearAppData(serial, packageName);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:install-apk', async (_event, serial: string) => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Select APK to install',
        filters: [{ name: 'APK Files', extensions: ['apk'] }],
        properties: ['openFile'],
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
      }

      await installApk(serial, filePaths[0]);
      return { success: true, data: path.basename(filePaths[0]) };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:uninstall-app', async (_event, serial: string, packageName: string) => {
    try {
      await uninstallApp(serial, packageName);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:push-file', async (_event, serial: string, remotePath: string) => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Select file to push',
        properties: ['openFile'],
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
      }

      const localPath = filePaths[0];
      const remote = remotePath || `/sdcard/Download/${path.basename(localPath)}`;
      await pushFile(serial, localPath, remote);
      return { success: true, data: { localPath, remotePath: remote } };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:pull-file', async (_event, serial: string, remotePath: string) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        title: 'Save pulled file',
        defaultPath: path.basename(remotePath),
      });

      if (!filePath) {
        return { success: false, error: 'Save cancelled' };
      }

      await pullFile(serial, remotePath, filePath);
      return { success: true, data: filePath };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
