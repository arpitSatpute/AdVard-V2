import { ipcMain } from 'electron';
import {
  listFastbootDevices,
  getFastbootVariables,
  rebootFastbootDevice,
  powerOffFastbootDevice,
} from '../fastboot/fastbootManager';
import { getFastbootLocateError } from '../fastboot/fastbootLocator';

export function registerFastbootHandlers(): void {
  // List Fastboot Devices
  const handleListDevices = async () => {
    try {
      const devices = await listFastbootDevices();
      return { success: true, data: devices };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const locateErr = getFastbootLocateError();
      return {
        success: false,
        error: locateErr || message,
        isFastbootMissing: !!locateErr,
      };
    }
  };

  ipcMain.handle('fastboot:list-devices', handleListDevices);
  ipcMain.handle('fastboot:listDevices', handleListDevices);

  // Get Variables
  const handleGetVariables = async (_event: any, serial: string) => {
    try {
      if (!serial) {
        return { success: false, error: 'Device serial is required' };
      }
      const vars = await getFastbootVariables(serial);
      return { success: true, data: vars };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  };

  ipcMain.handle('fastboot:get-variables', handleGetVariables);
  ipcMain.handle('fastboot:getVariables', handleGetVariables);

  // Reboot System
  ipcMain.handle('fastboot:reboot', async (_event, serial: string) => {
    try {
      if (!serial) return { success: false, error: 'Device serial is required' };
      const res = await rebootFastbootDevice(serial, 'system');
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  // Reboot Recovery
  const handleRebootRecovery = async (_event: any, serial: string) => {
    try {
      if (!serial) return { success: false, error: 'Device serial is required' };
      const res = await rebootFastbootDevice(serial, 'recovery');
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  };

  ipcMain.handle('fastboot:reboot-recovery', handleRebootRecovery);
  ipcMain.handle('fastboot:rebootRecovery', handleRebootRecovery);

  // Reboot Fastbootd
  const handleRebootFastbootd = async (_event: any, serial: string) => {
    try {
      if (!serial) return { success: false, error: 'Device serial is required' };
      const res = await rebootFastbootDevice(serial, 'fastbootd');
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  };

  ipcMain.handle('fastboot:reboot-fastbootd', handleRebootFastbootd);
  ipcMain.handle('fastboot:rebootFastbootd', handleRebootFastbootd);

  // Power Off
  const handlePowerOff = async (_event: any, serial: string) => {
    try {
      if (!serial) return { success: false, error: 'Device serial is required' };
      const res = await powerOffFastbootDevice(serial);
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  };

  ipcMain.handle('fastboot:power-off', handlePowerOff);
  ipcMain.handle('fastboot:powerOff', handlePowerOff);
}
