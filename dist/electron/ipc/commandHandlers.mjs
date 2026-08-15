import { ipcMain } from 'electron';
import { sendHome, sendBack, sendRecent, sendPower, sendVolumeUp, sendVolumeDown, sendVolumeMute, sendMediaPlayPause, sendMediaNext, sendMediaPrevious, getBrightness, setBrightness, rebootDevice, runShellCommand, sendKeyEvent, unlockDevice, makeCall, answerCall, endCall, getCallState, getContacts, setAudioRoute, toggleMuteMic, sendDtmfTone, tapScreen, swipeScreen, inputText, } from '../adb/commandExecutor.mjs';
export function registerCommandHandlers() {
    ipcMain.handle('adb:home', async (_event, serial) => {
        try {
            await sendHome(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:back', async (_event, serial) => {
        try {
            await sendBack(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:recent', async (_event, serial) => {
        try {
            await sendRecent(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:power', async (_event, serial) => {
        try {
            await sendPower(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:unlock', async (_event, serial, pin) => {
        try {
            await unlockDevice(serial, pin);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:call-make', async (_event, serial, number) => {
        try {
            await makeCall(serial, number);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:call-answer', async (_event, serial) => {
        try {
            await answerCall(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:call-end', async (_event, serial) => {
        try {
            await endCall(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:get-call-state', async (_event, serial) => {
        try {
            const data = await getCallState(serial);
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:get-contacts', async (_event, serial) => {
        try {
            const data = await getContacts(serial);
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:set-audio-route', async (_event, serial, route) => {
        try {
            await setAudioRoute(serial, route);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:mute-mic', async (_event, serial, mute) => {
        try {
            await toggleMuteMic(serial, mute);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:send-dtmf', async (_event, serial, digit) => {
        try {
            await sendDtmfTone(serial, digit);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:tap', async (_event, serial, x, y) => {
        try {
            await tapScreen(serial, x, y);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:swipe', async (_event, serial, x1, y1, x2, y2, duration) => {
        try {
            await swipeScreen(serial, x1, y1, x2, y2, duration);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:input-text', async (_event, serial, text) => {
        try {
            await inputText(serial, text);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:volume-up', async (_event, serial) => {
        try {
            await sendVolumeUp(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:volume-down', async (_event, serial) => {
        try {
            await sendVolumeDown(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:volume-mute', async (_event, serial) => {
        try {
            await sendVolumeMute(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:media-play-pause', async (_event, serial) => {
        try {
            await sendMediaPlayPause(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:media-next', async (_event, serial) => {
        try {
            await sendMediaNext(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:media-prev', async (_event, serial) => {
        try {
            await sendMediaPrevious(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:get-brightness', async (_event, serial) => {
        try {
            const val = await getBrightness(serial);
            return { success: true, data: val };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:set-brightness', async (_event, serial, level) => {
        try {
            await setBrightness(serial, level);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:reboot', async (_event, serial) => {
        try {
            await rebootDevice(serial);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:shell', async (_event, serial, command) => {
        try {
            const result = await runShellCommand(serial, command);
            return { success: true, data: result };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('adb:keyevent', async (_event, serial, keycode) => {
        try {
            await sendKeyEvent(serial, keycode);
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
}
