import { runAdb } from './adbManager';
import { detectConnectionType, ConnectionType } from './connectionManager';
import { listFastbootDevices } from '../fastboot/fastbootManager';

export type DeviceStatus = 'device' | 'unauthorized' | 'offline' | 'fastboot' | 'unknown';
export type ExtendedConnectionType = ConnectionType | 'fastboot';

export interface DeviceEntry {
  serial: string;
  status: DeviceStatus;
  connectionType: ExtendedConnectionType;
  model?: string;
  ip?: string;
  port?: number;
  mode?: 'bootloader' | 'fastbootd' | 'unknown';
}

export interface DeviceInfo {
  serial: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkVersion: string;
  batteryLevel: number | null;
  isCharging?: boolean | null;
  chargingStatus?: string;
  powerSource?: string;
  resolution: string;
  density: string;
}

/**
 * Runs `adb devices -l` and `fastboot devices` and returns parsed list of connected devices.
 */
export async function listDevices(): Promise<DeviceEntry[]> {
  const devices: DeviceEntry[] = [];

  // 1. Fetch ADB devices
  try {
    const result = await runAdb(['devices', '-l']);

    if (result.code === 0 && result.stdout) {
      const lines = result.stdout.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip header and empty lines
        if (!trimmed || trimmed === 'List of devices attached') continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const [serial, statusRaw] = parts;
          const status = normalizeStatus(statusRaw);
          const connType = detectConnectionType(serial);

          // Parse model from `adb devices -l` output if present (e.g., model:ZD2229LTP3)
          const modelMatch = trimmed.match(/\bmodel:(\S+)/);
          let model = modelMatch ? modelMatch[1].replace(/_/g, ' ') : undefined;

          // Extract model from serial string if formatted like `adb-MODEL-tls.connect.tcp`
          if (!model) {
            const adbMatch = serial.match(/^adb-(.+?)(?:-tls|\._tls|\.tls|$)/i);
            if (adbMatch && adbMatch[1]) {
              model = adbMatch[1];
            }
          }

          let ip: string | undefined;
          let port: number | undefined;

          if (connType === 'wifi') {
            const [h, p] = serial.split(':');
            ip = h;
            port = parseInt(p, 10);
          }

          devices.push({
            serial,
            status,
            connectionType: connType,
            model,
            ip,
            port,
          });
        }
      }
    }
  } catch {
    // ADB list failed; proceed to fastboot list
  }

  // 2. Fetch Fastboot devices
  try {
    const fastbootDevs = await listFastbootDevices();
    for (const fbDev of fastbootDevs) {
      // Avoid duplicate entries if serial is already in list
      if (!devices.some((d) => d.serial === fbDev.serial)) {
        devices.push({
          serial: fbDev.serial,
          status: 'fastboot',
          connectionType: 'fastboot',
          mode: fbDev.mode,
        });
      }
    }
  } catch {
    // Fastboot detection failed or binary missing; ignore gracefully
  }

  return devices;
}

function normalizeStatus(raw: string): DeviceStatus {
  switch (raw) {
    case 'device': return 'device';
    case 'unauthorized': return 'unauthorized';
    case 'offline': return 'offline';
    default: return 'unknown';
  }
}

/**
 * Retrieves detailed information about a specific device.
 */
export async function getDeviceInfo(serial: string): Promise<DeviceInfo> {
  const [model, manufacturer, androidVersion, sdkVersion, batteryDetails, resolutionOutput, densityOutput] =
    await Promise.all([
      getProp(serial, 'ro.product.model'),
      getProp(serial, 'ro.product.manufacturer'),
      getProp(serial, 'ro.build.version.release'),
      getProp(serial, 'ro.build.version.sdk'),
      getBatteryDetails(serial),
      getResolution(serial),
      getDensity(serial),
    ]);

  return {
    serial,
    model: model || 'Unknown',
    manufacturer: manufacturer || 'Unknown',
    androidVersion: androidVersion || 'Unknown',
    sdkVersion: sdkVersion || 'Unknown',
    batteryLevel: batteryDetails.level,
    isCharging: batteryDetails.isCharging,
    chargingStatus: batteryDetails.chargingStatus,
    powerSource: batteryDetails.powerSource,
    resolution: resolutionOutput,
    density: densityOutput,
  };
}

async function getProp(serial: string, prop: string): Promise<string> {
  const result = await runAdb(['-s', serial, 'shell', 'getprop', prop]);
  return result.stdout.trim();
}

async function getBatteryDetails(serial: string): Promise<{ level: number | null; isCharging: boolean | null; chargingStatus: string; powerSource: string }> {
  const result = await runAdb(['-s', serial, 'shell', 'dumpsys', 'battery']);
  if (result.code !== 0) return { level: null, isCharging: null, chargingStatus: 'Unknown', powerSource: 'Unknown' };

  const stdout = result.stdout;
  const levelMatch = stdout.match(/\blevel:\s*(\d+)/);
  const level = levelMatch ? parseInt(levelMatch[1], 10) : null;

  // If any "... powered: true" line exists in dumpsys battery, device is powered/charging
  const isPowered = /powered:\s*true/i.test(stdout);

  const acPowered = /AC powered:\s*true/i.test(stdout);
  const usbPowered = /USB powered:\s*true/i.test(stdout);
  const wirelessPowered = /Wireless powered:\s*true/i.test(stdout);
  const dockPowered = /Dock powered:\s*true/i.test(stdout);

  let powerSource = 'Battery';
  if (acPowered) powerSource = 'AC';
  else if (usbPowered) powerSource = 'USB';
  else if (wirelessPowered) powerSource = 'Wireless';
  else if (dockPowered) powerSource = 'Dock';

  const statusMatch = stdout.match(/\bstatus:\s*(\d+)/i);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

  // If any powered status is true or status is Charging (2) / Full (5), status is Charging
  const isCharging = isPowered || statusCode === 2 || statusCode === 5;
  const chargingStatus = isCharging ? 'Charging' : 'Discharging';

  return { level, isCharging, chargingStatus, powerSource };
}

async function getResolution(serial: string): Promise<string> {
  const result = await runAdb(['-s', serial, 'shell', 'wm', 'size']);
  if (result.code !== 0) return 'Unknown';

  const match = result.stdout.match(/(\d+x\d+)/);
  return match ? match[1] : 'Unknown';
}

async function getDensity(serial: string): Promise<string> {
  const result = await runAdb(['-s', serial, 'shell', 'wm', 'density']);
  if (result.code !== 0) return 'Unknown';

  const match = result.stdout.match(/(\d+)/);
  return match ? match[1] : 'Unknown';
}
