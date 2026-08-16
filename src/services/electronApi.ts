import type {
  DeviceEntry,
  DeviceInfo,
  AdbResponse,
  ShellResult,
  PackageEntry,
  WirelessPairPayload,
  WirelessConnectPayload,
  WirelessDisconnectPayload,
  QrSessionData,
  FileItem,
  FilePreviewData,
  CallStateInfo,
  ContactItem,
  NotificationItem,
} from '../types/device';

async function invokeHttp(channel: string, ...args: any[]): Promise<any> {
  try {
    const res = await fetch('/api/ipc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, args }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'API connection failed' };
  }
}

const httpApi = {
  getDevices: () => invokeHttp('adb:get-devices'),
  getDeviceInfo: (serial: string) => invokeHttp('adb:get-device-info', serial),
  restartAdb: () => invokeHttp('adb:restart-adb'),
  generateQrCode: () => invokeHttp('adb:generate-qr'),
  pairWirelessDevice: (payload: WirelessPairPayload) => invokeHttp('adb:pair-wireless', payload),
  connectWirelessDevice: (payload: WirelessConnectPayload) => invokeHttp('adb:connect-wireless', payload),
  disconnectWirelessDevice: (payload: WirelessDisconnectPayload) => invokeHttp('adb:disconnect-wireless', payload),
  enableUsbTcpip: (serial: string, port?: number) => invokeHttp('adb:enable-tcpip', serial, port),
  getDeviceIp: (serial: string) => invokeHttp('adb:get-device-ip', serial),
  home: (serial: string) => invokeHttp('adb:home', serial),
  back: (serial: string) => invokeHttp('adb:back', serial),
  recent: (serial: string) => invokeHttp('adb:recent', serial),
  power: (serial: string) => invokeHttp('adb:power', serial),
  unlock: (serial: string, pin?: string) => invokeHttp('adb:unlock', serial, pin),
  keyEvent: (serial: string, keycode: number) => invokeHttp('adb:keyevent', serial, keycode),
  makeCall: (serial: string, number: string) => invokeHttp('adb:call-make', serial, number),
  answerCall: (serial: string) => invokeHttp('adb:call-answer', serial),
  endCall: (serial: string) => invokeHttp('adb:call-end', serial),
  getCallState: (serial: string) => invokeHttp('adb:get-call-state', serial),
  getContacts: (serial: string) => invokeHttp('adb:get-contacts', serial),
  setAudioRoute: (serial: string, route: 'speaker' | 'earpiece' | 'bluetooth' | 'headset') => invokeHttp('adb:set-audio-route', serial, route),
  toggleMuteMic: (serial: string, mute: boolean) => invokeHttp('adb:mute-mic', serial, mute),
  sendDtmfTone: (serial: string, digit: string) => invokeHttp('adb:send-dtmf', serial, digit),
  tap: (serial: string, x: number, y: number) => invokeHttp('adb:tap', serial, x, y),
  swipe: (serial: string, x1: number, y1: number, x2: number, y2: number, duration?: number) => invokeHttp('adb:swipe', serial, x1, y1, x2, y2, duration),
  inputText: (serial: string, text: string) => invokeHttp('adb:input-text', serial, text),
  volumeUp: (serial: string) => invokeHttp('adb:volume-up', serial),
  volumeDown: (serial: string) => invokeHttp('adb:volume-down', serial),
  volumeMute: (serial: string) => invokeHttp('adb:volume-mute', serial),
  mediaPlayPause: (serial: string) => invokeHttp('adb:media-play-pause', serial),
  mediaNext: (serial: string) => invokeHttp('adb:media-next', serial),
  mediaPrev: (serial: string) => invokeHttp('adb:media-prev', serial),
  getBrightness: (serial: string) => invokeHttp('adb:get-brightness', serial),
  setBrightness: (serial: string, level: number) => invokeHttp('adb:set-brightness', serial, level),
  reboot: (serial: string) => invokeHttp('adb:reboot', serial),
  screenshot: (serial: string) => invokeHttp('adb:screenshot', serial),
  saveScreenshot: (base64Data: string) => invokeHttp('adb:save-screenshot', base64Data),
  shell: (serial: string, command: string) => invokeHttp('adb:shell', serial, command),
  listPackages: (serial: string, filterType?: 'all' | '3rdparty' | 'system') => invokeHttp('adb:list-packages', serial, filterType),
  launchApp: (serial: string, packageName: string) => invokeHttp('adb:launch-app', serial, packageName),
  forceStopApp: (serial: string, packageName: string) => invokeHttp('adb:force-stop', serial, packageName),
  clearAppData: (serial: string, packageName: string) => invokeHttp('adb:clear-data', serial, packageName),
  installApk: (serial: string) => invokeHttp('adb:install-apk', serial),
  uninstallApp: (serial: string, packageName: string) => invokeHttp('adb:uninstall-app', serial, packageName),
  getFilePreview: (serial: string, remotePath: string) => invokeHttp('adb:get-file-preview', serial, remotePath),
  listDirectory: (serial: string, remoteDir?: string) => invokeHttp('adb:list-directory', serial, remoteDir),
  pushFile: (serial: string, remotePath: string) => invokeHttp('adb:push-file', serial, remotePath),
  pushFolder: (serial: string, remotePath: string) => invokeHttp('adb:push-folder', serial, remotePath),
  pullFile: (serial: string, remotePath: string) => invokeHttp('adb:pull-file', serial, remotePath),
  openCastWindow: (serial: string) => invokeHttp('adb:open-cast-window', serial),
};

function getApi() {
  if (typeof window !== 'undefined' && window.android) {
    return window.android;
  }
  return httpApi;
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

export async function getCallState(serial: string): Promise<AdbResponse<CallStateInfo>> {
  return getApi().getCallState(serial);
}

export async function getContacts(serial: string): Promise<AdbResponse<ContactItem[]>> {
  return getApi().getContacts(serial);
}

export async function setAudioRoute(serial: string, route: 'speaker' | 'earpiece' | 'bluetooth' | 'headset'): Promise<AdbResponse> {
  return getApi().setAudioRoute(serial, route);
}

export async function toggleMuteMic(serial: string, mute: boolean): Promise<AdbResponse> {
  return getApi().toggleMuteMic(serial, mute);
}

export async function sendDtmfTone(serial: string, digit: string): Promise<AdbResponse> {
  return getApi().sendDtmfTone(serial, digit);
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

// ─── File Management & Transfer ──────────────────────────────────────────────

function execApiCall(fnName: string, ...args: any[]): Promise<any> {
  if (typeof window !== 'undefined' && window.android && typeof (window.android as any)[fnName] === 'function') {
    return (window.android as any)[fnName](...args);
  }
  if (typeof (httpApi as any)[fnName] === 'function') {
    return (httpApi as any)[fnName](...args);
  }
  return Promise.resolve({ success: false, error: `Method ${fnName} is not supported in current environment` });
}

export function getPathForFile(file: File): string {

  if (typeof window !== 'undefined' && window.android?.getPathForFile) {
    try {
      const p = window.android.getPathForFile(file);
      if (p) return p;
    } catch {
      // fallback
    }
  }
  return (file as any).path || '';
}

export async function getFilePreview(serial: string, remotePath: string): Promise<AdbResponse<FilePreviewData>> {
  return execApiCall('getFilePreview', serial, remotePath);
}

export async function listDirectory(serial: string, remoteDir?: string): Promise<AdbResponse<FileItem[]>> {

  return execApiCall('listDirectory', serial, remoteDir);
}

export async function createDirectory(serial: string, remoteDir: string): Promise<AdbResponse> {
  return execApiCall('createDirectory', serial, remoteDir);
}

export async function deleteRemoteFile(serial: string, remotePath: string): Promise<AdbResponse> {
  return execApiCall('deleteRemoteFile', serial, remotePath);
}

export async function renameRemoteFile(serial: string, oldPath: string, newPath: string): Promise<AdbResponse> {
  return execApiCall('renameRemoteFile', serial, oldPath, newPath);
}

export async function pushFile(serial: string, remotePath: string): Promise<AdbResponse> {
  return execApiCall('pushFile', serial, remotePath);
}

export async function pushFolder(serial: string, remotePath: string): Promise<AdbResponse> {
  return execApiCall('pushFolder', serial, remotePath);
}


export async function pushPaths(serial: string, localPaths: string[], remoteDir: string): Promise<AdbResponse<string[]>> {
  return execApiCall('pushPaths', serial, localPaths, remoteDir);
}

export async function pullFile(serial: string, remotePath: string): Promise<AdbResponse<string>> {
  return execApiCall('pullFile', serial, remotePath);
}

export async function pullPathTo(serial: string, remotePath: string, localDestinationDir?: string): Promise<AdbResponse<string>> {
  return execApiCall('pullPathTo', serial, remotePath, localDestinationDir);
}

export async function pauseTransfer(): Promise<AdbResponse<boolean>> {
  return execApiCall('pauseTransfer');
}

export async function resumeTransfer(): Promise<AdbResponse<boolean>> {
  return execApiCall('resumeTransfer');
}

export async function cancelTransfer(): Promise<AdbResponse<boolean>> {
  return execApiCall('cancelTransfer');
}

export async function openCastWindow(serial: string): Promise<AdbResponse> {
  return execApiCall('openCastWindow', serial);
}

export async function getPhoneClipboard(serial: string): Promise<AdbResponse<string>> {
  return execApiCall('getPhoneClipboard', serial);
}

export async function sendPhoneClipboard(serial: string, text: string): Promise<AdbResponse> {
  return execApiCall('sendPhoneClipboard', serial, text);
}

export async function getNotifications(serial: string): Promise<AdbResponse<NotificationItem[]>> {
  return execApiCall('getNotifications', serial);
}

export async function showHostNotification(title: string, body: string, appName?: string): Promise<AdbResponse> {
  const displayTitle = appName ? `📱 ${appName}: ${title}` : `📱 ${title}`;

  // 1. Web Notification API trigger
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new window.Notification(displayTitle, { body: body || 'New notification' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new window.Notification(displayTitle, { body: body || 'New notification' });
          }
        });
      }
    } catch {
      // Fallback to IPC
    }
  }

  // 2. Electron Main Process IPC trigger
  return execApiCall('showHostNotification', title, body, appName);
}





