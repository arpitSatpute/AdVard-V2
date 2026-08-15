import { ipcMain } from 'electron';
import QRCode from 'qrcode';
import { pairWirelessDevice, connectWirelessDevice, disconnectWirelessDevice, enableUsbTcpip, getDeviceIpAddress, startQrPairingSession, } from '../adb/connectionManager.mjs';
export function registerWirelessHandlers() {
    ipcMain.handle('adb:generate-qr', async () => {
        try {
            const session = await startQrPairingSession();
            // Render base64 data URL for QR Code payload
            const qrDataUrl = await QRCode.toDataURL(session.qrPayload, {
                margin: 2,
                width: 260,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            });
            return {
                success: true,
                data: {
                    qrDataUrl,
                    qrPayload: session.qrPayload,
                    serviceName: session.serviceName,
                    password: session.password,
                },
            };
        }
        catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    });
    ipcMain.handle('adb:pair-wireless', async (_event, payload) => {
        try {
            const res = await pairWirelessDevice(payload);
            return res;
        }
        catch (err) {
            return {
                success: false,
                output: '',
                error: err instanceof Error ? err.message : String(err),
            };
        }
    });
    ipcMain.handle('adb:connect-wireless', async (_event, payload) => {
        try {
            const res = await connectWirelessDevice(payload);
            return res;
        }
        catch (err) {
            return {
                success: false,
                output: '',
                error: err instanceof Error ? err.message : String(err),
            };
        }
    });
    ipcMain.handle('adb:disconnect-wireless', async (_event, payload) => {
        try {
            const res = await disconnectWirelessDevice(payload);
            return res;
        }
        catch (err) {
            return {
                success: false,
                output: '',
                error: err instanceof Error ? err.message : String(err),
            };
        }
    });
    ipcMain.handle('adb:enable-tcpip', async (_event, serial, port) => {
        try {
            const res = await enableUsbTcpip(serial, port);
            return res;
        }
        catch (err) {
            return {
                success: false,
                output: '',
                error: err instanceof Error ? err.message : String(err),
            };
        }
    });
    ipcMain.handle('adb:get-device-ip', async (_event, serial) => {
        try {
            const ip = await getDeviceIpAddress(serial);
            return { success: true, data: ip };
        }
        catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
}
