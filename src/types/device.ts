// ─── Device Types ─────────────────────────────────────────────────────────────

export type DeviceStatus = 'device' | 'unauthorized' | 'offline' | 'unknown';

export interface DeviceEntry {
  serial: string;
  status: DeviceStatus;
}

export interface DeviceInfo {
  serial: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkVersion: string;
  batteryLevel: number | null;
  resolution: string;
  density: string;
}

// ─── ADB Response Types ───────────────────────────────────────────────────────

export interface AdbResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  isAdbMissing?: boolean;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface PackageEntry {
  packageName: string;
  isSystem: boolean;
}

// ─── Shell History ────────────────────────────────────────────────────────────

export interface ShellHistoryEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  code: number;
  timestamp: Date;
}

// ─── Window API Type ──────────────────────────────────────────────────────────

export interface AndroidApi {
  // Device
  getDevices: () => Promise<AdbResponse<DeviceEntry[]>>;
  getDeviceInfo: (serial: string) => Promise<AdbResponse<DeviceInfo>>;
  restartAdb: () => Promise<AdbResponse>;

  // Navigation, Power & Unlock
  home: (serial: string) => Promise<AdbResponse>;
  back: (serial: string) => Promise<AdbResponse>;
  recent: (serial: string) => Promise<AdbResponse>;
  power: (serial: string) => Promise<AdbResponse>;
  unlock: (serial: string, pin?: string) => Promise<AdbResponse>;
  keyEvent: (serial: string, keycode: number) => Promise<AdbResponse>;

  // Phone Calls
  makeCall: (serial: string, number: string) => Promise<AdbResponse>;
  answerCall: (serial: string) => Promise<AdbResponse>;
  endCall: (serial: string) => Promise<AdbResponse>;

  // Touch Remote Control
  tap: (serial: string, x: number, y: number) => Promise<AdbResponse>;
  swipe: (serial: string, x1: number, y1: number, x2: number, y2: number, duration?: number) => Promise<AdbResponse>;
  inputText: (serial: string, text: string) => Promise<AdbResponse>;

  // Volume & Playback Controls
  volumeUp: (serial: string) => Promise<AdbResponse>;
  volumeDown: (serial: string) => Promise<AdbResponse>;
  volumeMute: (serial: string) => Promise<AdbResponse>;
  mediaPlayPause: (serial: string) => Promise<AdbResponse>;
  mediaNext: (serial: string) => Promise<AdbResponse>;
  mediaPrev: (serial: string) => Promise<AdbResponse>;

  // Brightness
  getBrightness: (serial: string) => Promise<AdbResponse<number>>;
  setBrightness: (serial: string, level: number) => Promise<AdbResponse>;

  // Actions
  reboot: (serial: string) => Promise<AdbResponse>;

  // Screenshot
  screenshot: (serial: string) => Promise<AdbResponse<string>>;
  saveScreenshot: (base64Data: string) => Promise<AdbResponse<string>>;

  // Shell
  shell: (serial: string, command: string) => Promise<AdbResponse<ShellResult>>;

  // Apps
  listPackages: (serial: string, filterType?: 'all' | '3rdparty' | 'system') => Promise<AdbResponse<PackageEntry[]>>;
  launchApp: (serial: string, packageName: string) => Promise<AdbResponse>;
  forceStopApp: (serial: string, packageName: string) => Promise<AdbResponse>;
  clearAppData: (serial: string, packageName: string) => Promise<AdbResponse>;
  installApk: (serial: string) => Promise<AdbResponse<string>>;
  uninstallApp: (serial: string, packageName: string) => Promise<AdbResponse>;

  // Files
  pushFile: (serial: string, remotePath: string) => Promise<AdbResponse>;
  pullFile: (serial: string, remotePath: string) => Promise<AdbResponse<string>>;
}

declare global {
  interface Window {
    android: AndroidApi;
  }
}
