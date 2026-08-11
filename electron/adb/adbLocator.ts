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
export async function locateAdb(): Promise<string> {
  // 1. Try PATH first
  const pathResult = await findAdbInPath();
  if (pathResult) return pathResult;

  // 2. Try platform-specific SDK paths
  const sdkResult = findAdbInSdk();
  if (sdkResult) return sdkResult;

  throw new Error(
    'ADB not found. Please install Android Platform Tools or add ADB to your PATH.\n' +
    'Download: https://developer.android.com/tools/releases/platform-tools'
  );
}

async function findAdbInPath(): Promise<string | null> {
  const platform = os.platform();
  const command = platform === 'win32' ? 'where' : 'which';

  try {
    const { stdout } = await execFileAsync(command, ['adb']);
    const adbPath = stdout.trim().split('\n')[0].trim();
    if (adbPath && fs.existsSync(adbPath)) {
      return adbPath;
    }
  } catch {
    // not found in PATH
  }
  return null;
}

function findAdbInSdk(): string | null {
  const platform = os.platform();
  const home = os.homedir();

  const candidatePaths: string[] = [];

  if (platform === 'darwin') {
    candidatePaths.push(
      path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', 'adb'),
      path.join(home, 'Library', 'Android', 'Sdk', 'platform-tools', 'adb'),
    );
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    candidatePaths.push(
      path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    );
  } else {
    // Linux
    candidatePaths.push(
      path.join(home, 'Android', 'Sdk', 'platform-tools', 'adb'),
      path.join(home, 'android', 'sdk', 'platform-tools', 'adb'),
      '/usr/local/bin/adb',
      '/usr/bin/adb',
    );
  }

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
