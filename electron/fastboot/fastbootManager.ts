import { spawn } from 'child_process';
import { locateFastboot, getFastbootLocateError } from './fastbootLocator';

export interface FastbootResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface FastbootDeviceEntry {
  serial: string;
  mode: 'bootloader' | 'fastbootd' | 'unknown';
}

export interface ParsedFastbootVariables {
  raw: Record<string, string>;
  product?: string;
  variant?: string;
  bootloaderVersion?: string;
  fastbootVersion?: string;
  secureBoot?: string;
  unlocked?: string;
  currentSlot?: string;
  slotCount?: string;
  batteryVoltage?: string;
  batterySoc?: string;
  isUserspace?: string;
}

/**
 * Core Fastboot process runner. Uses child_process.spawn to prevent command injection.
 */
export async function runFastboot(args: string[]): Promise<FastbootResult> {
  const fastbootPath = await locateFastboot();

  return new Promise((resolve) => {
    const proc = spawn(fastbootPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    proc.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      resolve({ stdout, stderr, code: code ?? -1 });
    });

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, code: -1 });
    });
  });
}

/**
 * Lists connected Fastboot devices by running `fastboot devices`.
 */
export async function listFastbootDevices(): Promise<FastbootDeviceEntry[]> {
  try {
    const result = await runFastboot(['devices']);
    if (result.code !== 0 && !result.stdout && !result.stderr) {
      return [];
    }

    const output = (result.stdout + '\n' + result.stderr).trim();
    if (!output) return [];

    const lines = output.split('\n');
    const devices: FastbootDeviceEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const [serial, modeRaw] = parts;

        // Skip non-device header lines if any
        if (serial.toLowerCase().includes('list') || serial.startsWith('(')) continue;

        let mode: 'bootloader' | 'fastbootd' | 'unknown' = 'bootloader';
        const lowerMode = modeRaw.toLowerCase();
        if (lowerMode.includes('fastbootd') || lowerMode === 'fastbootd') {
          mode = 'fastbootd';
        } else if (lowerMode.includes('fastboot') || lowerMode.includes('bootloader')) {
          mode = 'bootloader';
        }

        devices.push({ serial, mode });
      }
    }

    return devices;
  } catch (err) {
    const locateErr = getFastbootLocateError();
    if (locateErr) {
      // Fastboot executable is not found on machine
      return [];
    }
    throw err;
  }
}

/**
 * Retrieves all variables from a Fastboot device by running `fastboot getvar all`.
 * Captures both stdout and stderr because `fastboot getvar all` writes output to stderr on many systems.
 */
export async function getFastbootVariables(serial: string): Promise<ParsedFastbootVariables> {
  const result = await runFastboot(['-s', serial, 'getvar', 'all']);

  // Combine stdout & stderr output
  const combined = `${result.stdout}\n${result.stderr}`;
  const lines = combined.split('\n');

  const rawVars: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Output format examples:
    // (bootloader) product: edge30
    // (bootloader) version-bootloader: MBM-3.0-edge30
    // product: edge30
    // getvar:product: edge30
    const match = trimmed.match(/^(?:\(bootloader\)\s*)?(?:getvar:)?([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Skip summary lines like "Finished. Total time: 0.005s" or empty values
      if (key === 'Finished' || key === 'all') continue;
      if (!value || value === 'OKAY') continue;

      rawVars[key] = value;
    }
  }

  const isUserspace = rawVars['is-userspace'] || rawVars['is_userspace'];

  return {
    raw: rawVars,
    product: rawVars['product'] || rawVars['product-name'] || rawVars['device'] || undefined,
    variant: rawVars['variant'] || rawVars['hardware-revision'] || rawVars['hardware'] || undefined,
    bootloaderVersion: rawVars['version-bootloader'] || rawVars['bootloader-version'] || rawVars['version-baseband'] || undefined,
    fastbootVersion: rawVars['version-fastboot'] || rawVars['version'] || undefined,
    secureBoot: rawVars['secure'] || rawVars['secure-boot'] || undefined,
    unlocked: rawVars['unlocked'] || rawVars['unlocked-state'] || undefined,
    currentSlot: rawVars['current-slot'] || rawVars['slot-current'] || undefined,
    slotCount: rawVars['slot-count'] || rawVars['slot-suffixes'] || undefined,
    batteryVoltage: rawVars['battery-voltage'] || rawVars['battery-voltage-mv'] || undefined,
    batterySoc: rawVars['battery-soc'] || rawVars['battery-level'] || undefined,
    isUserspace: isUserspace,
  };
}

/**
 * Reboots a Fastboot device.
 * Targets:
 *   - system: `fastboot -s <serial> reboot`
 *   - recovery: `fastboot -s <serial> reboot recovery` (with fallback to `reboot-recovery`)
 *   - fastbootd: `fastboot -s <serial> reboot fastboot`
 */
export async function rebootFastbootDevice(
  serial: string,
  target: 'system' | 'recovery' | 'fastbootd' = 'system'
): Promise<{ success: boolean; error?: string }> {
  let args: string[];

  if (target === 'recovery') {
    args = ['-s', serial, 'reboot', 'recovery'];
  } else if (target === 'fastbootd') {
    args = ['-s', serial, 'reboot', 'fastboot'];
  } else {
    args = ['-s', serial, 'reboot'];
  }

  let result = await runFastboot(args);

  // If `reboot recovery` fails, try fallback `reboot-recovery`
  if (result.code !== 0 && target === 'recovery') {
    const fallbackResult = await runFastboot(['-s', serial, 'reboot-recovery']);
    if (fallbackResult.code === 0) {
      result = fallbackResult;
    }
  }

  const stderr = result.stderr.trim();
  const stdout = result.stdout.trim();

  // Fastboot reboot commands often print output to stderr (e.g. "Rebooting...") with exit code 0
  if (result.code === 0 || /rebooting/i.test(stderr) || /rebooting/i.test(stdout)) {
    return { success: true };
  }

  const errMessage = stderr || stdout || `Fastboot reboot ${target} failed with exit code ${result.code}`;
  return { success: false, error: errMessage };
}

/**
 * Powers off a Fastboot device using safest available command.
 * Tries `fastboot -s <serial> oem poweroff` then `fastboot -s <serial> poweroff`.
 */
export async function powerOffFastbootDevice(serial: string): Promise<{ success: boolean; error?: string }> {
  // First attempt: `fastboot -s <serial> oem poweroff`
  let result = await runFastboot(['-s', serial, 'oem', 'poweroff']);

  if (result.code !== 0) {
    // Second attempt: `fastboot -s <serial> poweroff`
    result = await runFastboot(['-s', serial, 'poweroff']);
  }

  const stderr = result.stderr.trim();
  const stdout = result.stdout.trim();

  if (result.code === 0 || /powering off|poweroff|okay/i.test(stderr + stdout)) {
    return { success: true };
  }

  // Handle unsupported gracefully
  if (/unknown command|not supported|unrecognized|FAILED/i.test(stderr + stdout)) {
    return {
      success: false,
      error: 'Power off is not supported by this device in Fastboot mode.',
    };
  }

  return {
    success: false,
    error: stderr || stdout || 'Failed to power off device in Fastboot mode.',
  };
}
