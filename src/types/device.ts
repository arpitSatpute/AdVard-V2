// ─── Device Types ─────────────────────────────────────────────────────────────

export type DeviceStatus = 'device' | 'unauthorized' | 'offline' | 'fastboot' | 'unknown';
export type ConnectionType = 'usb' | 'wifi' | 'fastboot';

export interface DeviceEntry {
  serial: string;
  status: DeviceStatus;
  connectionType: ConnectionType;
  model?: string;
  ip?: string;
  port?: number;
  mode?: 'bootloader' | 'fastbootd' | 'unknown';
}

export interface FastbootDevice {
  serial: string;
  mode: 'bootloader' | 'fastbootd' | 'unknown';
  variables?: FastbootVariables;
  connected: boolean;
}

export interface FastbootVariables {
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

// ─── Wireless Payload Types ───────────────────────────────────────────────────

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

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  permissions: string;
  modifiedDate: string;
}

export interface NotificationItem {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  subText?: string;
  category?: string;
  timestamp: string;
  postTime?: number;
}

export interface CallStateInfo {
  state: 'IDLE' | 'RINGING' | 'OFFHOOK';
  number?: string;
  callerName?: string;
}

export interface ContactItem {
  id: string;
  name: string;
  number: string;
  type?: string;
}

export interface FilePreviewData {
  type: 'image' | 'text' | 'binary';
  content?: string;
  mimeType?: string;
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

export interface QrSessionData {
  qrDataUrl: string;
  qrPayload: string;
  serviceName: string;
  password: string;
}

// ─── Window API Type ──────────────────────────────────────────────────────────

export interface AndroidApi {
  // Device
  getDevices: () => Promise<AdbResponse<DeviceEntry[]>>;
  getDeviceInfo: (serial: string) => Promise<AdbResponse<DeviceInfo>>;
  restartAdb: () => Promise<AdbResponse>;
  openCastWindow: (serial: string) => Promise<AdbResponse>;

  // Wireless ADB
  generateQrCode: () => Promise<AdbResponse<QrSessionData>>;
  pairWirelessDevice: (payload: WirelessPairPayload) => Promise<AdbResponse<string>>;
  connectWirelessDevice: (payload: WirelessConnectPayload) => Promise<AdbResponse<string>>;
  disconnectWirelessDevice: (payload: WirelessDisconnectPayload) => Promise<AdbResponse<string>>;
  enableUsbTcpip: (serial: string, port?: number) => Promise<AdbResponse<{ output: string; ip?: string }>>;
  getDeviceIp: (serial: string) => Promise<AdbResponse<string | null>>;

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
  getCallState: (serial: string) => Promise<AdbResponse<CallStateInfo>>;
  getContacts: (serial: string) => Promise<AdbResponse<ContactItem[]>>;
  setAudioRoute: (serial: string, route: 'speaker' | 'earpiece' | 'bluetooth' | 'headset') => Promise<AdbResponse>;
  toggleMuteMic: (serial: string, mute: boolean) => Promise<AdbResponse>;
  sendDtmfTone: (serial: string, digit: string) => Promise<AdbResponse>;

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

  // Files & Drag-and-Drop Sharing
  getPathForFile: (file: File) => string;
  getFilePreview: (serial: string, remotePath: string) => Promise<AdbResponse<FilePreviewData>>;

  listDirectory: (serial: string, remoteDir?: string) => Promise<AdbResponse<FileItem[]>>;
  pushFile: (serial: string, remotePath: string) => Promise<AdbResponse>;
  pushFolder: (serial: string, remotePath: string) => Promise<AdbResponse>;
  pullFile: (serial: string, remotePath: string) => Promise<AdbResponse<string>>;
  pauseTransfer: () => Promise<AdbResponse<boolean>>;
  resumeTransfer: () => Promise<AdbResponse<boolean>>;
  cancelTransfer: () => Promise<AdbResponse<boolean>>;
  onTransferProgress?: (callback: (data: { percentage: number; file: string; type: 'upload' | 'download' }) => void) => () => void;

  // Notifications
  getNotifications: (serial: string) => Promise<AdbResponse<NotificationItem[]>>;
  showHostNotification: (title: string, body: string, appName?: string) => Promise<AdbResponse>;

  // Fastboot
  fastbootListDevices: () => Promise<AdbResponse<{ serial: string; mode: 'bootloader' | 'fastbootd' | 'unknown' }[]>>;
  fastbootGetVariables: (serial: string) => Promise<AdbResponse<FastbootVariables>>;
  fastbootReboot: (serial: string) => Promise<AdbResponse>;
  fastbootRebootRecovery: (serial: string) => Promise<AdbResponse>;
  fastbootRebootFastbootd: (serial: string) => Promise<AdbResponse>;
  fastbootPowerOff: (serial: string) => Promise<AdbResponse>;
}

declare global {
  interface Window {
    android: AndroidApi;
  }
}


