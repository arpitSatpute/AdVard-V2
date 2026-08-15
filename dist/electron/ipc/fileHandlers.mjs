import { ipcMain, dialog } from 'electron';
import * as path from 'path';
import { listPackages, launchApp, forceStopApp, clearAppData, installApk, uninstallApp, pushFile, pullFile, } from '../adb/commandExecutor.mjs';
import { listDirectory, createDirectory, deleteRemoteFile, renameRemoteFile, getFilePreview, } from '../services/fileExplorerService.mjs';
import { pauseActiveTransfer, resumeActiveTransfer, cancelActiveTransfer, resetCancelFlag, } from '../adb/adbManager.mjs';
export function registerFileHandlers() {
    ipcMain.handle('adb:pause-transfer', async () => {
        const success = pauseActiveTransfer();
        return { success };
    });
    ipcMain.handle('adb:resume-transfer', async () => {
        const success = resumeActiveTransfer();
        return { success };
    });
    ipcMain.handle('adb:cancel-transfer', async () => {
        const success = cancelActiveTransfer();
        return { success };
    });
    ipcMain.handle('adb:get-file-preview', async (_event, serial, remotePath) => {
        try {
            const preview = await getFilePreview(serial, remotePath);
            return { success: true, data: preview };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:list-directory', async (_event, serial, remoteDir = '/storage/emulated/0/') => {
        try {
            const files = await listDirectory(serial, remoteDir);
            return { success: true, data: files };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:create-directory', async (_event, serial, remoteDir) => {
        try {
            await createDirectory(serial, remoteDir);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:delete-file', async (_event, serial, remotePath) => {
        try {
            await deleteRemoteFile(serial, remotePath);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:rename-file', async (_event, serial, oldPath, newPath) => {
        try {
            await renameRemoteFile(serial, oldPath, newPath);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:list-packages', async (_event, serial, filterType = 'all') => {
        try {
            const packages = await listPackages(serial, filterType);
            return { success: true, data: packages };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:launch-app', async (_event, serial, packageName) => {
        try {
            await launchApp(serial, packageName);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:force-stop', async (_event, serial, packageName) => {
        try {
            await forceStopApp(serial, packageName);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:clear-data', async (_event, serial, packageName) => {
        try {
            await clearAppData(serial, packageName);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:install-apk', async (_event, serial) => {
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
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:uninstall-app', async (_event, serial, packageName) => {
        try {
            await uninstallApp(serial, packageName);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:push-file', async (event, serial, remotePath) => {
        try {
            resetCancelFlag();
            const { filePaths } = await dialog.showOpenDialog({
                title: 'Select files to transfer to phone',
                properties: ['openFile', 'multiSelections'],
            });
            if (!filePaths || filePaths.length === 0) {
                return { success: false, error: 'No files selected' };
            }
            const remoteDir = remotePath || '/storage/emulated/0/Download/';
            const pushed = [];
            for (const localPath of filePaths) {
                const fileName = path.basename(localPath);
                await pushFile(serial, localPath, remoteDir, (percentage) => {
                    event.sender.send('adb:transfer-progress', { percentage, file: fileName, type: 'upload' });
                });
                pushed.push(localPath);
            }
            return { success: true, data: pushed };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:push-folder', async (event, serial, remotePath) => {
        try {
            resetCancelFlag();
            const { filePaths } = await dialog.showOpenDialog({
                title: 'Select folder to transfer to phone',
                properties: ['openDirectory', 'multiSelections'],
            });
            if (!filePaths || filePaths.length === 0) {
                return { success: false, error: 'No folder selected' };
            }
            const remoteDir = remotePath || '/storage/emulated/0/Download/';
            const pushed = [];
            for (const localPath of filePaths) {
                const fileName = path.basename(localPath);
                await pushFile(serial, localPath, remoteDir, (percentage) => {
                    event.sender.send('adb:transfer-progress', { percentage, file: fileName, type: 'upload' });
                });
                pushed.push(localPath);
            }
            return { success: true, data: pushed };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:push-paths', async (event, serial, localPaths, remoteDir) => {
        try {
            resetCancelFlag();
            if (!localPaths || localPaths.length === 0) {
                return { success: false, error: 'No paths provided to push' };
            }
            const targetDir = remoteDir.endsWith('/') ? remoteDir : `${remoteDir}/`;
            const pushed = [];
            for (const localPath of localPaths) {
                const fileName = path.basename(localPath);
                await pushFile(serial, localPath, targetDir, (percentage) => {
                    event.sender.send('adb:transfer-progress', { percentage, file: fileName, type: 'upload' });
                });
                pushed.push(localPath);
            }
            return { success: true, data: pushed };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:pull-file', async (event, serial, remotePath) => {
        try {
            resetCancelFlag();
            const fileName = path.basename(remotePath);
            const { filePath } = await dialog.showSaveDialog({
                title: 'Save pulled item',
                defaultPath: fileName,
            });
            if (!filePath) {
                return { success: false, error: 'Save cancelled' };
            }
            await pullFile(serial, remotePath, filePath, (percentage) => {
                event.sender.send('adb:transfer-progress', { percentage, file: fileName, type: 'download' });
            });
            return { success: true, data: filePath };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:pull-path-to', async (event, serial, remotePath, localDestinationDir) => {
        try {
            resetCancelFlag();
            let destDir = localDestinationDir;
            if (!destDir) {
                const { filePaths } = await dialog.showOpenDialog({
                    title: 'Select Destination Directory on Laptop',
                    properties: ['openDirectory', 'createDirectory'],
                });
                if (!filePaths || filePaths.length === 0) {
                    return { success: false, error: 'Destination selection cancelled' };
                }
                destDir = filePaths[0];
            }
            const fileName = path.basename(remotePath);
            await pullFile(serial, remotePath, destDir, (percentage) => {
                event.sender.send('adb:transfer-progress', { percentage, file: fileName, type: 'download' });
            });
            return { success: true, data: destDir };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
}
