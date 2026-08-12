import { spawn, exec } from 'child_process';
import { getAdbPath, runAdb } from './adbManager';
import * as net from 'net';
import * as os from 'os';

export type ConnectionType = 'usb' | 'wifi';

export interface WirelessPairPayload {
  host: string;
  pairingPort: number;
  pairingCode: string;
}

export interface WirelessConnectPayload {
  host: string;
  port: number;
}

export interface WirelessDisconnectPayload {
  host: string;
  port: number;
}

export interface QrSessionData {
  qrDataUrl: string;
  qrPayload: string;
  serviceName: string;
  password: string;
  ip: string;
  port: number;
}

let activePairWatcher: any = null;

/**
 * Gets the computer's primary local Wi-Fi / LAN IP address.
 */
export function getLocalComputerIp(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Prioritize Wi-Fi interface (en0 on Mac, Wi-Fi on Windows, wlan0 on Linux)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

/**
 * Generates an Android 11+ Wireless Debugging QR payload string and starts an mDNS discovery listener.
 * Format expected by Android OS: `WIFI:T:ADB;S:<SERVICE_NAME>;P:<PASSWORD>;;`
 */
export async function startQrPairingSession(): Promise<QrSessionData> {
  const serviceName = `AdVard_${Math.floor(1000 + Math.random() * 9000)}`;
  const password = Math.random().toString(36).substring(2, 10);
  const localIp = getLocalComputerIp() || '0.0.0.0';
  const qrPayload = `WIFI:T:ADB;S:${serviceName};P:${password};;`;

  // Kill previous pairing watchers
  if (activePairWatcher) {
    try { activePairWatcher.kill(); } catch {}
    activePairWatcher = null;
  }

  // Trigger ADB mDNS background service check
  try {
    const adbPath = await getAdbPath();
    exec(`"${adbPath}" mdns check`, () => {});
  } catch {}

  return {
    qrDataUrl: '',
    qrPayload,
    serviceName,
    password,
    ip: localIp,
    port: 5555,
  };
}

/**
 * Polls ADB mDNS services for newly discovered paired wireless devices.
 */
export async function checkMdnsPairing(): Promise<{ paired: boolean; device?: string }> {
  try {
    const res = await runAdb(['mdns', 'services']);
    if (res.code === 0 && res.stdout) {
      const lines = res.stdout.split('\n');
      for (const line of lines) {
        if (line.includes('_adb-tls-pairing._tcp') || line.includes('_adb-tls-connect._tcp')) {
          const parts = line.trim().split(/\s+/);
          const endpoint = parts[parts.length - 1]; // e.g. 192.168.1.20:37123
          if (endpoint && endpoint.includes(':')) {
            return { paired: true, device: endpoint };
          }
        }
      }
    }
  } catch {}
  return { paired: false };
}

/**
 * Detects whether an ADB serial / device identifier represents a Wi-Fi endpoint or a USB serial.
 */
export function detectConnectionType(serial: string): ConnectionType {
  const ipPortRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/;
  return ipPortRegex.test(serial.trim()) ? 'wifi' : 'usb';
}

/**
 * Validates IPv4 address string format.
 */
export function isValidIPv4(host: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(host.trim());
}

/**
 * Validates network port number (1 - 65535).
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Automatically fetches the local Wi-Fi IP address of a USB connected device via shell ip route / wlan0 query.
 */
export async function getDeviceIpAddress(serial: string): Promise<string | null> {
  try {
    const res = await runAdb(['-s', serial, 'shell', 'ip', 'route']);
    if (res.code === 0 && res.stdout) {
      const match = res.stdout.match(/src\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match && match[1] && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }

    const res2 = await runAdb(['-s', serial, 'shell', 'ifconfig', 'wlan0']);
    if (res2.code === 0 && res2.stdout) {
      const match2 = res2.stdout.match(/inet\s+addr:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/) || res2.stdout.match(/inet\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match2 && match2[1] && match2[1] !== '127.0.0.1') {
        return match2[1];
      }
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Switches a USB connected device to TCP/IP Wireless mode (`adb tcpip 5555`).
 */
export async function enableUsbTcpip(serial: string, port: number = 5555): Promise<{ success: boolean; output: string; ip?: string; error?: string }> {
  const ip = await getDeviceIpAddress(serial);
  const result = await runAdb(['-s', serial, 'tcpip', String(port)]);

  if (result.code === 0 || result.stdout.includes('restarting in TCP mode')) {
    return {
      success: true,
      output: result.stdout || `Switched to TCP mode on port ${port}`,
      ip: ip || undefined,
    };
  } else {
    return {
      success: false,
      output: result.stdout,
      error: result.stderr || 'Failed to switch device to TCP mode.',
    };
  }
}

/**
 * Pairs an Android 11+ device using `adb pair IP:PAIRING_PORT`.
 * Sends the pairing code securely via stdin stream buffer.
 */
export async function pairWirelessDevice(payload: WirelessPairPayload): Promise<{ success: boolean; output: string; error?: string }> {
  const { host, pairingPort, pairingCode } = payload;

  if (!isValidIPv4(host)) {
    return { success: false, output: '', error: 'Invalid IP address format. Example: 192.168.1.20' };
  }
  if (!isValidPort(pairingPort)) {
    return { success: false, output: '', error: 'Invalid pairing port. Must be between 1 and 65535.' };
  }
  if (!pairingCode || !/^\d{6}$/.test(pairingCode.trim())) {
    return { success: false, output: '', error: 'Invalid pairing code. Must be a 6-digit number.' };
  }

  const adbPath = await getAdbPath();
  const endpoint = `${host.trim()}:${pairingPort}`;

  return new Promise((resolve) => {
    const proc = spawn(adbPath, ['pair', endpoint], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    // Write pairing code into stdin stream
    proc.stdin.write(`${pairingCode.trim()}\n`);
    proc.stdin.end();

    proc.on('close', (code) => {
      const outputCombined = `${stdout}\n${stderr}`.trim();
      if (code === 0 && (outputCombined.includes('Successfully paired') || outputCombined.includes('paired to'))) {
        resolve({ success: true, output: outputCombined || 'Successfully paired device!' });
      } else {
        resolve({
          success: false,
          output: outputCombined,
          error: 'Wireless pairing failed. Verify the IP address, pairing port, and pairing code.',
        });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });
  });
}

/**
 * Connects to a paired Wi-Fi device using `adb connect IP:PORT`.
 */
export async function connectWirelessDevice(payload: WirelessConnectPayload): Promise<{ success: boolean; output: string; error?: string }> {
  const { host, port } = payload;

  if (!isValidIPv4(host)) {
    return { success: false, output: '', error: 'Invalid IP address format. Example: 192.168.1.20' };
  }
  if (!isValidPort(port)) {
    return { success: false, output: '', error: 'Invalid connection port. Must be between 1 and 65535.' };
  }

  const adbPath = await getAdbPath();
  const endpoint = `${host.trim()}:${port}`;

  return new Promise((resolve) => {
    const proc = spawn(adbPath, ['connect', endpoint], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('close', (code) => {
      const outputCombined = `${stdout}\n${stderr}`.trim();
      if (code === 0 && (outputCombined.includes('connected to') || outputCombined.includes('already connected'))) {
        resolve({ success: true, output: outputCombined || `Connected to ${endpoint}` });
      } else {
        resolve({
          success: false,
          output: outputCombined,
          error: 'Could not connect to the Android device. Verify that Wireless Debugging is enabled and that the phone and computer are reachable on the same network.',
        });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });
  });
}

/**
 * Disconnects a Wi-Fi device using `adb disconnect IP:PORT`.
 */
export async function disconnectWirelessDevice(payload: WirelessDisconnectPayload): Promise<{ success: boolean; output: string; error?: string }> {
  const { host, port } = payload;
  const adbPath = await getAdbPath();
  const endpoint = `${host.trim()}:${port}`;

  return new Promise((resolve) => {
    const proc = spawn(adbPath, ['disconnect', endpoint], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('close', () => {
      const outputCombined = `${stdout}\n${stderr}`.trim();
      resolve({ success: true, output: outputCombined || `Disconnected ${endpoint}` });
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });
  });
}
