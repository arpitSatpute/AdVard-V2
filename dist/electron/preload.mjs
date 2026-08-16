import { contextBridge, ipcRenderer, webUtils } from 'electron';
/**
 * Secure preload — exposes a typed, minimal API to the renderer.
 * Never exposes ipcRenderer, process, fs, child_process, or exec/spawn.
 */
contextBridge.exposeInMainWorld('android', {
    // ─── Device Management ──────────────────────────────────────────────────
    getDevices: () => ipcRenderer.invoke('adb:get-devices'),
    getDeviceInfo: (serial) => ipcRenderer.invoke('adb:get-device-info', serial),
    restartAdb: () => ipcRenderer.invoke('adb:restart-adb'),
    openCastWindow: (serial) => ipcRenderer.invoke('adb:open-cast-window', serial),
    // ─── Wireless ADB ────────────────────────────────────────────────────────
    generateQrCode: () => ipcRenderer.invoke('adb:generate-qr'),
    pairWirelessDevice: (payload) => ipcRenderer.invoke('adb:pair-wireless', payload),
    connectWirelessDevice: (payload) => ipcRenderer.invoke('adb:connect-wireless', payload),
    disconnectWirelessDevice: (payload) => ipcRenderer.invoke('adb:disconnect-wireless', payload),
    enableUsbTcpip: (serial, port) => ipcRenderer.invoke('adb:enable-tcpip', serial, port),
    getDeviceIp: (serial) => ipcRenderer.invoke('adb:get-device-ip', serial),
    // ─── Navigation, Power & Unlock ─────────────────────────────────────────
    home: (serial) => ipcRenderer.invoke('adb:home', serial),
    back: (serial) => ipcRenderer.invoke('adb:back', serial),
    recent: (serial) => ipcRenderer.invoke('adb:recent', serial),
    power: (serial) => ipcRenderer.invoke('adb:power', serial),
    unlock: (serial, pin) => ipcRenderer.invoke('adb:unlock', serial, pin),
    keyEvent: (serial, keycode) => ipcRenderer.invoke('adb:keyevent', serial, keycode),
    // ─── Phone Calls ────────────────────────────────────────────────────────
    makeCall: (serial, number) => ipcRenderer.invoke('adb:call-make', serial, number),
    answerCall: (serial) => ipcRenderer.invoke('adb:call-answer', serial),
    endCall: (serial) => ipcRenderer.invoke('adb:call-end', serial),
    getCallState: (serial) => ipcRenderer.invoke('adb:get-call-state', serial),
    getContacts: (serial) => ipcRenderer.invoke('adb:get-contacts', serial),
    setAudioRoute: (serial, route) => ipcRenderer.invoke('adb:set-audio-route', serial, route),
    toggleMuteMic: (serial, mute) => ipcRenderer.invoke('adb:mute-mic', serial, mute),
    sendDtmfTone: (serial, digit) => ipcRenderer.invoke('adb:send-dtmf', serial, digit),
    // ─── Touch Remote Control ───────────────────────────────────────────────
    tap: (serial, x, y) => ipcRenderer.invoke('adb:tap', serial, x, y),
    swipe: (serial, x1, y1, x2, y2, duration) => ipcRenderer.invoke('adb:swipe', serial, x1, y1, x2, y2, duration),
    inputText: (serial, text) => ipcRenderer.invoke('adb:input-text', serial, text),
    // ─── Volume & Media Playback ────────────────────────────────────────────
    volumeUp: (serial) => ipcRenderer.invoke('adb:volume-up', serial),
    volumeDown: (serial) => ipcRenderer.invoke('adb:volume-down', serial),
    volumeMute: (serial) => ipcRenderer.invoke('adb:volume-mute', serial),
    mediaPlayPause: (serial) => ipcRenderer.invoke('adb:media-play-pause', serial),
    mediaNext: (serial) => ipcRenderer.invoke('adb:media-next', serial),
    mediaPrev: (serial) => ipcRenderer.invoke('adb:media-prev', serial),
    // ─── Brightness Control ──────────────────────────────────────────────────
    getBrightness: (serial) => ipcRenderer.invoke('adb:get-brightness', serial),
    setBrightness: (serial, level) => ipcRenderer.invoke('adb:set-brightness', serial, level),
    // ─── Device Actions ─────────────────────────────────────────────────────
    reboot: (serial) => ipcRenderer.invoke('adb:reboot', serial),
    // ─── Screenshot ─────────────────────────────────────────────────────────
    screenshot: (serial) => ipcRenderer.invoke('adb:screenshot', serial),
    saveScreenshot: (base64Data) => ipcRenderer.invoke('adb:save-screenshot', base64Data),
    // ─── Shell Terminal ─────────────────────────────────────────────────────
    shell: (serial, command) => ipcRenderer.invoke('adb:shell', serial, command),
    // ─── App Management ─────────────────────────────────────────────────────
    listPackages: (serial, filterType) => ipcRenderer.invoke('adb:list-packages', serial, filterType),
    launchApp: (serial, packageName) => ipcRenderer.invoke('adb:launch-app', serial, packageName),
    forceStopApp: (serial, packageName) => ipcRenderer.invoke('adb:force-stop', serial, packageName),
    clearAppData: (serial, packageName) => ipcRenderer.invoke('adb:clear-data', serial, packageName),
    installApk: (serial) => ipcRenderer.invoke('adb:install-apk', serial),
    uninstallApp: (serial, packageName) => ipcRenderer.invoke('adb:uninstall-app', serial, packageName),
    // ─── File Management & Transfer ──────────────────────────────────────────
    getPathForFile: (file) => webUtils.getPathForFile(file),
    getFilePreview: (serial, remotePath) => ipcRenderer.invoke('adb:get-file-preview', serial, remotePath),
    listDirectory: (serial, remoteDir) => ipcRenderer.invoke('adb:list-directory', serial, remoteDir),
    createDirectory: (serial, remoteDir) => ipcRenderer.invoke('adb:create-directory', serial, remoteDir),
    pushFile: (serial, remotePath) => ipcRenderer.invoke('adb:push-file', serial, remotePath),
    pushFolder: (serial, remotePath) => ipcRenderer.invoke('adb:push-folder', serial, remotePath),
    deleteFile: (serial, remotePath) => ipcRenderer.invoke('adb:delete-file', serial, remotePath),
    renameFile: (serial, oldPath, newPath) => ipcRenderer.invoke('adb:rename-file', serial, oldPath, newPath),
    pushPaths: (serial, localPaths, remoteDir) => ipcRenderer.invoke('adb:push-paths', serial, localPaths, remoteDir),
    pullPathTo: (serial, remotePath, localDestinationDir) => ipcRenderer.invoke('adb:pull-path-to', serial, remotePath, localDestinationDir),
    pauseTransfer: () => ipcRenderer.invoke('adb:pause-transfer'),
    resumeTransfer: () => ipcRenderer.invoke('adb:resume-transfer'),
    cancelTransfer: () => ipcRenderer.invoke('adb:cancel-transfer'),
    onTransferProgress: (callback) => {
        const listener = (_event, data) => callback(data);
        ipcRenderer.on('adb:transfer-progress', listener);
        return () => {
            ipcRenderer.removeListener('adb:transfer-progress', listener);
        };
    },
    // ─── Notification Center & Host Desktop Notifications ────────────────────
    getNotifications: (serial) => ipcRenderer.invoke('adb:get-notifications', serial),
    showHostNotification: (title, body, appName) => ipcRenderer.invoke('adb:show-host-notification', { title, body, appName }),
});
