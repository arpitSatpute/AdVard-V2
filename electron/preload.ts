import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure preload — exposes a typed, minimal API to the renderer.
 * Never exposes ipcRenderer, process, fs, child_process, or exec/spawn.
 */
contextBridge.exposeInMainWorld('android', {
  // ─── Device Management ──────────────────────────────────────────────────
  getDevices: () =>
    ipcRenderer.invoke('adb:get-devices'),

  getDeviceInfo: (serial: string) =>
    ipcRenderer.invoke('adb:get-device-info', serial),

  restartAdb: () =>
    ipcRenderer.invoke('adb:restart-adb'),

  // ─── Navigation, Power & Unlock ─────────────────────────────────────────
  home: (serial: string) =>
    ipcRenderer.invoke('adb:home', serial),

  back: (serial: string) =>
    ipcRenderer.invoke('adb:back', serial),

  recent: (serial: string) =>
    ipcRenderer.invoke('adb:recent', serial),

  power: (serial: string) =>
    ipcRenderer.invoke('adb:power', serial),

  unlock: (serial: string, pin?: string) =>
    ipcRenderer.invoke('adb:unlock', serial, pin),

  keyEvent: (serial: string, keycode: number) =>
    ipcRenderer.invoke('adb:keyevent', serial, keycode),

  // ─── Phone Calls ────────────────────────────────────────────────────────
  makeCall: (serial: string, number: string) =>
    ipcRenderer.invoke('adb:call-make', serial, number),

  answerCall: (serial: string) =>
    ipcRenderer.invoke('adb:call-answer', serial),

  endCall: (serial: string) =>
    ipcRenderer.invoke('adb:call-end', serial),

  // ─── Touch Remote Control ───────────────────────────────────────────────
  tap: (serial: string, x: number, y: number) =>
    ipcRenderer.invoke('adb:tap', serial, x, y),

  swipe: (serial: string, x1: number, y1: number, x2: number, y2: number, duration?: number) =>
    ipcRenderer.invoke('adb:swipe', serial, x1, y1, x2, y2, duration),

  inputText: (serial: string, text: string) =>
    ipcRenderer.invoke('adb:input-text', serial, text),

  // ─── Volume & Media Playback ────────────────────────────────────────────
  volumeUp: (serial: string) =>
    ipcRenderer.invoke('adb:volume-up', serial),

  volumeDown: (serial: string) =>
    ipcRenderer.invoke('adb:volume-down', serial),

  volumeMute: (serial: string) =>
    ipcRenderer.invoke('adb:volume-mute', serial),

  mediaPlayPause: (serial: string) =>
    ipcRenderer.invoke('adb:media-play-pause', serial),

  mediaNext: (serial: string) =>
    ipcRenderer.invoke('adb:media-next', serial),

  mediaPrev: (serial: string) =>
    ipcRenderer.invoke('adb:media-prev', serial),

  // ─── Brightness Control ──────────────────────────────────────────────────
  getBrightness: (serial: string) =>
    ipcRenderer.invoke('adb:get-brightness', serial),

  setBrightness: (serial: string, level: number) =>
    ipcRenderer.invoke('adb:set-brightness', serial, level),

  // ─── Device Actions ─────────────────────────────────────────────────────
  reboot: (serial: string) =>
    ipcRenderer.invoke('adb:reboot', serial),

  // ─── Screenshot ─────────────────────────────────────────────────────────
  screenshot: (serial: string) =>
    ipcRenderer.invoke('adb:screenshot', serial),

  saveScreenshot: (base64Data: string) =>
    ipcRenderer.invoke('adb:save-screenshot', base64Data),

  // ─── Shell Terminal ─────────────────────────────────────────────────────
  shell: (serial: string, command: string) =>
    ipcRenderer.invoke('adb:shell', serial, command),

  // ─── App Management ─────────────────────────────────────────────────────
  listPackages: (serial: string, filterType?: 'all' | '3rdparty' | 'system') =>
    ipcRenderer.invoke('adb:list-packages', serial, filterType),

  launchApp: (serial: string, packageName: string) =>
    ipcRenderer.invoke('adb:launch-app', serial, packageName),

  forceStopApp: (serial: string, packageName: string) =>
    ipcRenderer.invoke('adb:force-stop', serial, packageName),

  clearAppData: (serial: string, packageName: string) =>
    ipcRenderer.invoke('adb:clear-data', serial, packageName),

  installApk: (serial: string) =>
    ipcRenderer.invoke('adb:install-apk', serial),

  uninstallApp: (serial: string, packageName: string) =>
    ipcRenderer.invoke('adb:uninstall-app', serial, packageName),

  // ─── File Management ────────────────────────────────────────────────────
  pushFile: (serial: string, remotePath: string) =>
    ipcRenderer.invoke('adb:push-file', serial, remotePath),

  pullFile: (serial: string, remotePath: string) =>
    ipcRenderer.invoke('adb:pull-file', serial, remotePath),
});
