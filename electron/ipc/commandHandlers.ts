import { ipcMain } from 'electron';
import {
  sendHome,
  sendBack,
  sendRecent,
  sendPower,
  sendVolumeUp,
  sendVolumeDown,
  sendVolumeMute,
  sendMediaPlayPause,
  sendMediaNext,
  sendMediaPrevious,
  getBrightness,
  setBrightness,
  rebootDevice,
  runShellCommand,
  sendKeyEvent,
  unlockDevice,
  makeCall,
  answerCall,
  endCall,
  tapScreen,
  swipeScreen,
  inputText,
} from '../adb/commandExecutor';

export function registerCommandHandlers(): void {
  ipcMain.handle('adb:home', async (_event, serial: string) => {
    try {
      await sendHome(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:back', async (_event, serial: string) => {
    try {
      await sendBack(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:recent', async (_event, serial: string) => {
    try {
      await sendRecent(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:power', async (_event, serial: string) => {
    try {
      await sendPower(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:unlock', async (_event, serial: string, pin?: string) => {
    try {
      await unlockDevice(serial, pin);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:call-make', async (_event, serial: string, number: string) => {
    try {
      await makeCall(serial, number);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:call-answer', async (_event, serial: string) => {
    try {
      await answerCall(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:call-end', async (_event, serial: string) => {
    try {
      await endCall(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:tap', async (_event, serial: string, x: number, y: number) => {
    try {
      await tapScreen(serial, x, y);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:swipe', async (_event, serial: string, x1: number, y1: number, x2: number, y2: number, duration?: number) => {
    try {
      await swipeScreen(serial, x1, y1, x2, y2, duration);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:input-text', async (_event, serial: string, text: string) => {
    try {
      await inputText(serial, text);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:volume-up', async (_event, serial: string) => {
    try {
      await sendVolumeUp(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:volume-down', async (_event, serial: string) => {
    try {
      await sendVolumeDown(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:volume-mute', async (_event, serial: string) => {
    try {
      await sendVolumeMute(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:media-play-pause', async (_event, serial: string) => {
    try {
      await sendMediaPlayPause(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:media-next', async (_event, serial: string) => {
    try {
      await sendMediaNext(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:media-prev', async (_event, serial: string) => {
    try {
      await sendMediaPrevious(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:get-brightness', async (_event, serial: string) => {
    try {
      const val = await getBrightness(serial);
      return { success: true, data: val };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:set-brightness', async (_event, serial: string, level: number) => {
    try {
      await setBrightness(serial, level);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:reboot', async (_event, serial: string) => {
    try {
      await rebootDevice(serial);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:shell', async (_event, serial: string, command: string) => {
    try {
      const result = await runShellCommand(serial, command);
      return { success: true, data: result };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('adb:keyevent', async (_event, serial: string, keycode: number) => {
    try {
      await sendKeyEvent(serial, keycode);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
