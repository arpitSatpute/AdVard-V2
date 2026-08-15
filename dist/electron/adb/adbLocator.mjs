import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const execFileAsync = promisify(execFile);
/**
 * Attempts to locate the ADB binary on the current system.
 * Priority:
 *   1. `which adb` / `where adb` (if in PATH)
 *   2. Platform-specific Android SDK default locations
 */
export async function locateAdb() {
    // 1. Try PATH first
    const pathResult = await findAdbInPath();
    if (pathResult)
        return pathResult;
    // 2. Try platform-specific SDK paths
    const sdkResult = findAdbInSdk();
    if (sdkResult)
        return sdkResult;
    throw new Error('ADB not found. Please install Android Platform Tools or add ADB to your PATH.\n' +
        'Download: https://developer.android.com/tools/releases/platform-tools');
}
async function findAdbInPath() {
    const platform = os.platform();
    const command = platform === 'win32' ? 'where' : 'which';
    try {
        const { stdout } = await execFileAsync(command, ['adb']);
        const adbPath = stdout.trim().split('\n')[0].trim();
        if (adbPath && fs.existsSync(adbPath)) {
            return adbPath;
        }
    }
    catch {
        // not found in PATH
    }
    return null;
}
function findAdbInSdk() {
    const platform = os.platform();
    const home = os.homedir();
    const candidatePaths = [];
    if (platform === 'darwin') {
        candidatePaths.push('/opt/homebrew/bin/adb', '/usr/local/bin/adb', path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', 'adb'), path.join(home, 'Library', 'Android', 'Sdk', 'platform-tools', 'adb'), path.join(home, '.android-sdk', 'platform-tools', 'adb'));
    }
    else if (platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || '';
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        candidatePaths.push('C:\\platform-tools-latest-windows\\platform-tools\\adb.exe', path.join(programFiles, 'Software Fix', 'adb.exe'), path.join(programFilesX86, 'Software Fix', 'adb.exe'), path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'), path.join(programFiles, 'Android', 'platform-tools', 'adb.exe'), 'C:\\platform-tools\\adb.exe', 'C:\\adb\\adb.exe', 'C:\\tools\\platform-tools\\adb.exe');
    }
    else {
        // Linux
        candidatePaths.push('/usr/bin/adb', '/usr/local/bin/adb', path.join(home, 'Android', 'Sdk', 'platform-tools', 'adb'), path.join(home, 'android', 'sdk', 'platform-tools', 'adb'));
    }
    for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}
