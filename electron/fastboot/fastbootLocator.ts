import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execFileAsync = promisify(execFile);

let cachedFastbootPath: string | null = null;
let fastbootLocateError: string | null = null;

/**
 * Attempts to locate the Fastboot binary on the current system.
 * Priority:
 *   1. `which fastboot` / `where fastboot` (if in PATH)
 *   2. Platform-specific Android SDK default locations
 */
export async function locateFastboot(): Promise<string> {
  if (cachedFastbootPath && fs.existsSync(cachedFastbootPath)) {
    return cachedFastbootPath;
  }

  // 1. Try PATH first
  const pathResult = await findFastbootInPath();
  if (pathResult) {
    cachedFastbootPath = pathResult;
    fastbootLocateError = null;
    return pathResult;
  }

  // 2. Try platform-specific SDK paths
  const sdkResult = findFastbootInSdk();
  if (sdkResult) {
    cachedFastbootPath = sdkResult;
    fastbootLocateError = null;
    return sdkResult;
  }

  const errMessage =
    'Fastboot executable was not found. Please install Android Platform Tools or add fastboot to your PATH.\n' +
    'Download: https://developer.android.com/tools/releases/platform-tools';
  fastbootLocateError = errMessage;
  throw new Error(errMessage);
}

export function getFastbootLocateError(): string | null {
  return fastbootLocateError;
}

async function findFastbootInPath(): Promise<string | null> {
  const platform = os.platform();
  const command = platform === 'win32' ? 'where' : 'which';

  try {
    const { stdout } = await execFileAsync(command, ['fastboot']);
    const fastbootPath = stdout.trim().split('\n')[0].trim();
    if (fastbootPath && fs.existsSync(fastbootPath)) {
      return fastbootPath;
    }
  } catch {
    // not found in PATH
  }
  return null;
}

function findFastbootInSdk(): string | null {
  const platform = os.platform();
  const home = os.homedir();

  const candidatePaths: string[] = [];

  if (platform === 'darwin') {
    candidatePaths.push(
      '/opt/homebrew/bin/fastboot',
      '/usr/local/bin/fastboot',
      path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', 'fastboot'),
      path.join(home, 'Library', 'Android', 'Sdk', 'platform-tools', 'fastboot'),
      path.join(home, '.android-sdk', 'platform-tools', 'fastboot')
    );
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    candidatePaths.push(
      'C:\\platform-tools-latest-windows\\platform-tools\\fastboot.exe',
      path.join(programFiles, 'Software Fix', 'fastboot.exe'),
      path.join(programFilesX86, 'Software Fix', 'fastboot.exe'),
      path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'fastboot.exe'),
      path.join(programFiles, 'Android', 'platform-tools', 'fastboot.exe'),
      'C:\\platform-tools\\fastboot.exe',
      'C:\\adb\\fastboot.exe',
      'C:\\fastboot\\fastboot.exe',
      'C:\\tools\\platform-tools\\fastboot.exe'
    );
  } else {
    // Linux
    candidatePaths.push(
      '/usr/bin/fastboot',
      '/usr/local/bin/fastboot',
      path.join(home, 'Android', 'Sdk', 'platform-tools', 'fastboot'),
      path.join(home, 'android', 'sdk', 'platform-tools', 'fastboot')
    );
  }

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
