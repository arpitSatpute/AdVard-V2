import { runAdb, runAdbBinary } from './adbManager';

// ─── Key Events ─────────────────────────────────────────────────────────────

const KEYCODE_HOME = 3;
const KEYCODE_BACK = 4;
const KEYCODE_POWER = 26;
const KEYCODE_WAKEUP = 224;
const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;
const KEYCODE_VOLUME_MUTE = 164;
const KEYCODE_MEDIA_PLAY_PAUSE = 85;
const KEYCODE_MEDIA_NEXT = 87;
const KEYCODE_MEDIA_PREVIOUS = 88;
const KEYCODE_RECENT = 187;
const KEYCODE_CALL = 5;
const KEYCODE_ENDCALL = 6;

export async function sendHome(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_HOME);
}

export async function sendBack(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_BACK);
}

export async function sendRecent(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_RECENT);
}

export async function sendPower(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_POWER);
}

export async function sendVolumeUp(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_VOLUME_UP);
}

export async function sendVolumeDown(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_VOLUME_DOWN);
}

export async function sendVolumeMute(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_VOLUME_MUTE);
}

export async function sendMediaPlayPause(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_MEDIA_PLAY_PAUSE);
}

export async function sendMediaNext(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_MEDIA_NEXT);
}

export async function sendMediaPrevious(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_MEDIA_PREVIOUS);
}

export async function sendKeyEvent(serial: string, keycode: number): Promise<void> {
  const result = await runAdb(['-s', serial, 'shell', 'input', 'keyevent', String(keycode)]);
  if (result.code !== 0) {
    throw new Error(`Key event failed: ${result.stderr}`);
  }
}

// ─── Unlock Device ────────────────────────────────────────────────────────────

export async function unlockDevice(serial: string, pin?: string): Promise<void> {
  // Wake screen
  await sendKeyEvent(serial, KEYCODE_WAKEUP);
  // Swipe up gesture
  await swipeScreen(serial, 500, 1500, 500, 500, 300);

  if (pin && pin.trim()) {
    // Send PIN text
    await inputText(serial, pin.trim());
    // Press ENTER (66)
    await sendKeyEvent(serial, 66);
  }
}

// ─── Phone Calls ─────────────────────────────────────────────────────────────

export async function makeCall(serial: string, phoneNumber: string): Promise<void> {
  const cleanNumber = phoneNumber.replace(/[^0-9+*#]/g, '');
  const result = await runAdb([
    '-s', serial, 'shell', 'am', 'start',
    '-a', 'android.intent.action.CALL',
    '-d', `tel:${cleanNumber}`
  ]);
  if (result.code !== 0) {
    throw new Error(`Failed to make call: ${result.stderr}`);
  }
}

export async function answerCall(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_CALL);
}

export async function endCall(serial: string): Promise<void> {
  await sendKeyEvent(serial, KEYCODE_ENDCALL);
}

// ─── Brightness Control ──────────────────────────────────────────────────────

export async function getBrightness(serial: string): Promise<number> {
  const result = await runAdb(['-s', serial, 'shell', 'settings', 'get', 'system', 'screen_brightness']);
  if (result.code !== 0) {
    throw new Error(`Failed to get brightness: ${result.stderr}`);
  }
  const val = parseInt(result.stdout.trim(), 10);
  return isNaN(val) ? 128 : val;
}

export async function setBrightness(serial: string, level: number): Promise<void> {
  const clamped = Math.max(0, Math.min(255, Math.round(level)));
  const result = await runAdb(['-s', serial, 'shell', 'settings', 'put', 'system', 'screen_brightness', String(clamped)]);
  if (result.code !== 0) {
    throw new Error(`Failed to set brightness: ${result.stderr}`);
  }
}

// ─── Reboot ──────────────────────────────────────────────────────────────────

export async function rebootDevice(serial: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'reboot']);
  if (result.code !== 0 && result.stderr && !result.stderr.includes('error: closed')) {
    throw new Error(`Reboot failed: ${result.stderr}`);
  }
}

// ─── Screenshot ──────────────────────────────────────────────────────────────

export async function takeScreenshot(serial: string): Promise<string> {
  const buffer = await runAdbBinary(['-s', serial, 'exec-out', 'screencap', '-p']);
  return buffer.toString('base64');
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export interface ShellResult {
  stdout: string;
  stderr: string;
  code: number;
}

export async function runShellCommand(serial: string, command: string): Promise<ShellResult> {
  const result = await runAdb(['-s', serial, 'shell', command]);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
  };
}

// ─── App Management ──────────────────────────────────────────────────────────

export interface PackageEntry {
  packageName: string;
  isSystem: boolean;
}

export async function listPackages(serial: string, filterType: 'all' | '3rdparty' | 'system' = 'all'): Promise<PackageEntry[]> {
  let args = ['-s', serial, 'shell', 'pm', 'list', 'packages'];
  if (filterType === '3rdparty') {
    args.push('-3');
  } else if (filterType === 'system') {
    args.push('-s');
  }

  const result = await runAdb(args);
  if (result.code !== 0) {
    throw new Error(`Failed to list packages: ${result.stderr}`);
  }

  const systemPackages = new Set<string>();
  if (filterType === 'all') {
    const sysResult = await runAdb(['-s', serial, 'shell', 'pm', 'list', 'packages', '-s']);
    if (sysResult.code === 0) {
      sysResult.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('package:'))
        .forEach((line) => systemPackages.add(line.replace('package:', '')));
    }
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('package:'))
    .map((line) => {
      const pkg = line.replace('package:', '');
      return {
        packageName: pkg,
        isSystem: filterType === 'system' ? true : filterType === '3rdparty' ? false : systemPackages.has(pkg),
      };
    });
}

export async function launchApp(serial: string, packageName: string): Promise<void> {
  const result = await runAdb([
    '-s', serial, 'shell', 'monkey',
    '-p', packageName,
    '-c', 'android.intent.category.LAUNCHER',
    '1',
  ]);
  if (result.code !== 0 && !result.stdout.includes('Events injected: 1')) {
    throw new Error(`Failed to launch ${packageName}: ${result.stderr}`);
  }
}

export async function forceStopApp(serial: string, packageName: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'shell', 'am', 'force-stop', packageName]);
  if (result.code !== 0) {
    throw new Error(`Failed to force stop ${packageName}: ${result.stderr}`);
  }
}

export async function clearAppData(serial: string, packageName: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'shell', 'pm', 'clear', packageName]);
  if (result.code !== 0) {
    throw new Error(`Failed to clear data for ${packageName}: ${result.stderr}`);
  }
}

export async function installApk(serial: string, apkPath: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'install', '-r', apkPath]);
  if (!result.stdout.includes('Success') && result.code !== 0) {
    throw new Error(`Failed to install APK: ${result.stderr || result.stdout}`);
  }
}

export async function uninstallApp(serial: string, packageName: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'uninstall', packageName]);
  if (!result.stdout.includes('Success') && result.code !== 0) {
    throw new Error(`Failed to uninstall ${packageName}: ${result.stderr || result.stdout}`);
  }
}

// ─── File Management ─────────────────────────────────────────────────────────

export async function pushFile(serial: string, localPath: string, remotePath: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'push', localPath, remotePath]);
  if (result.code !== 0) {
    throw new Error(`Push failed: ${result.stderr}`);
  }
}

export async function pullFile(serial: string, remotePath: string, localPath: string): Promise<void> {
  const result = await runAdb(['-s', serial, 'pull', remotePath, localPath]);
  if (result.code !== 0) {
    throw new Error(`Pull failed: ${result.stderr}`);
  }
}

// ─── Input & Touch Remote Control ──────────────────────────────────────────────

export async function tapScreen(serial: string, x: number, y: number): Promise<void> {
  await runAdb(['-s', serial, 'shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))]);
}

export async function swipeScreen(
  serial: string,
  x1: number, y1: number, x2: number, y2: number,
  durationMs: number = 300
): Promise<void> {
  await runAdb([
    '-s', serial, 'shell', 'input', 'swipe',
    String(Math.round(x1)), String(Math.round(y1)), String(Math.round(x2)), String(Math.round(y2)), String(durationMs),
  ]);
}

export async function inputText(serial: string, text: string): Promise<void> {
  const escaped = text.replace(/ /g, '%s');
  await runAdb(['-s', serial, 'shell', 'input', 'text', escaped]);
}
