import type {
  DeviceEntry,
  DeviceInfo,
  AdbResponse,
  ShellResult,
  PackageEntry,
  WirelessPairPayload,
  WirelessConnectPayload,
  WirelessDisconnectPayload,
} from '../types/device';

function getApi() {
  if (!window.android) {
    throw new Error('Android API not available — are you running inside Electron?');
  }
  return window.android;
}

// ─── Device Management ────────────────────────────────────────────────────────

export async function getDevices(): Promise<AdbResponse<DeviceEntry[]>> {
  return getApi().getDevices();
}

export async function getDeviceInfo(serial: string): Promise<AdbResponse<DeviceInfo>> {
  return getApi().getDeviceInfo(serial);
}

export async function restartAdb(): Promise<AdbResponse> {
  return getApi().restartAdb();
}

// ─── Wireless ADB ─────────────────────────────────────────────────────────────

export async function generateQrCode(): Promise<AdbResponse<QrSessionData>> {
  return getApi().generateQrCode();
}

export async function pairWirelessDevice(payload: WirelessPairPayload): Promise<AdbResponse<string>> {
  return getApi().pairWirelessDevice(payload);
}

export async function connectWirelessDevice(payload: WirelessConnectPayload): Promise<AdbResponse<string>> {
  return getApi().connectWirelessDevice(payload);
}

export async function disconnectWirelessDevice(payload: WirelessDisconnectPayload): Promise<AdbResponse<string>> {
  return getApi().disconnectWirelessDevice(payload);
}

export async function enableUsbTcpip(serial: string, port?: number): Promise<AdbResponse<{ output: string; ip?: string }>> {
  return getApi().enableUsbTcpip(serial, port);
}

export async function getDeviceIp(serial: string): Promise<AdbResponse<string | null>> {
  return getApi().getDeviceIp(serial);
}

// ─── Navigation, Power & Unlock ──────────────────────────────────────────────

export async function pressHome(serial: string): Promise<AdbResponse> {
  return getApi().home(serial);
}

export async function pressBack(serial: string): Promise<AdbResponse> {
  return getApi().back(serial);
}

export async function pressRecent(serial: string): Promise<AdbResponse> {
  return getApi().recent(serial);
}

export async function pressPower(serial: string): Promise<AdbResponse> {
  return getApi().power(serial);
}

export async function unlockDevice(serial: string, pin?: string): Promise<AdbResponse> {
  return getApi().unlock(serial, pin);
}

export async function pressKeyEvent(serial: string, keycode: number): Promise<AdbResponse> {
  return getApi().keyEvent(serial, keycode);
}

// ─── Phone Calls ─────────────────────────────────────────────────────────────

export async function makeCall(serial: string, number: string): Promise<AdbResponse> {
  return getApi().makeCall(serial, number);
}

export async function answerCall(serial: string): Promise<AdbResponse> {
  return getApi().answerCall(serial);
}

export async function endCall(serial: string): Promise<AdbResponse> {
  return getApi().endCall(serial);
}

// ─── Touch Remote Control ──────────────────────────────────────────────────────

export async function tapScreen(serial: string, x: number, y: number): Promise<AdbResponse> {
  return getApi().tap(serial, x, y);
}

export async function swipeScreen(
  serial: string,
  x1: number, y1: number, x2: number, y2: number,
  duration?: number
): Promise<AdbResponse> {
  return getApi().swipe(serial, x1, y1, x2, y2, duration);
}

export async function inputText(serial: string, text: string): Promise<AdbResponse> {
  return getApi().inputText(serial, text);
}

// ─── Volume & Playback Controls ───────────────────────────────────────────────

export async function volumeUp(serial: string): Promise<AdbResponse> {
  return getApi().volumeUp(serial);
}

export async function volumeDown(serial: string): Promise<AdbResponse> {
  return getApi().volumeDown(serial);
}

export async function volumeMute(serial: string): Promise<AdbResponse> {
  return getApi().volumeMute(serial);
}

export async function mediaPlayPause(serial: string): Promise<AdbResponse> {
  return getApi().mediaPlayPause(serial);
}

export async function mediaNext(serial: string): Promise<AdbResponse> {
  return getApi().mediaNext(serial);
}

export async function mediaPrev(serial: string): Promise<AdbResponse> {
  return getApi().mediaPrev(serial);
}

// ─── Brightness Control ───────────────────────────────────────────────────────

export async function getBrightness(serial: string): Promise<AdbResponse<number>> {
  return getApi().getBrightness(serial);
}

export async function setBrightness(serial: string, level: number): Promise<AdbResponse> {
  return getApi().setBrightness(serial, level);
}

// ─── Device Actions ───────────────────────────────────────────────────────────

export async function rebootDevice(serial: string): Promise<AdbResponse> {
  return getApi().reboot(serial);
}

// ─── Screenshot ───────────────────────────────────────────────────────────────

export async function takeScreenshot(serial: string): Promise<AdbResponse<string>> {
  return getApi().screenshot(serial);
}

export async function saveScreenshot(base64Data: string): Promise<AdbResponse<string>> {
  return getApi().saveScreenshot(base64Data);
}

// ─── Shell Terminal ───────────────────────────────────────────────────────────

export async function runShell(serial: string, command: string): Promise<AdbResponse<ShellResult>> {
  return getApi().shell(serial, command);
}

// ─── App Management ───────────────────────────────────────────────────────────

export async function listPackages(serial: string, filterType?: 'all' | '3rdparty' | 'system'): Promise<AdbResponse<PackageEntry[]>> {
  return getApi().listPackages(serial, filterType);
}

export async function launchApp(serial: string, packageName: string): Promise<AdbResponse> {
  return getApi().launchApp(serial, packageName);
}

export async function forceStopApp(serial: string, packageName: string): Promise<AdbResponse> {
  return getApi().forceStopApp(serial, packageName);
}

export async function clearAppData(serial: string, packageName: string): Promise<AdbResponse> {
  return getApi().clearAppData(serial, packageName);
}

export async function installApk(serial: string): Promise<AdbResponse<string>> {
  return getApi().installApk(serial);
}

export async function uninstallApp(serial: string, packageName: string): Promise<AdbResponse> {
  return getApi().uninstallApp(serial, packageName);
}

// ─── File Management ──────────────────────────────────────────────────────────

export async function pushFile(serial: string, remotePath: string): Promise<AdbResponse> {
  return getApi().pushFile(serial, remotePath);
}

export async function pullFile(serial: string, remotePath: string): Promise<AdbResponse<string>> {
  return getApi().pullFile(serial, remotePath);
}
