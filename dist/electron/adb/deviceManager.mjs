import { runAdb } from './adbManager.mjs';
import { detectConnectionType } from './connectionManager.mjs';
/**
 * Runs `adb devices` and returns parsed list of connected USB & Wi-Fi devices.
 */
export async function listDevices() {
    const result = await runAdb(['devices']);
    if (result.code !== 0) {
        throw new Error(`ADB devices failed: ${result.stderr}`);
    }
    const lines = result.stdout.split('\n');
    const devices = [];
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip header and empty lines
        if (!trimmed || trimmed === 'List of devices attached')
            continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const [serial, statusRaw] = parts;
            const status = normalizeStatus(statusRaw);
            const connType = detectConnectionType(serial);
            let ip;
            let port;
            if (connType === 'wifi') {
                const [h, p] = serial.split(':');
                ip = h;
                port = parseInt(p, 10);
            }
            devices.push({
                serial,
                status,
                connectionType: connType,
                ip,
                port,
            });
        }
    }
    return devices;
}
function normalizeStatus(raw) {
    switch (raw) {
        case 'device': return 'device';
        case 'unauthorized': return 'unauthorized';
        case 'offline': return 'offline';
        default: return 'unknown';
    }
}
/**
 * Retrieves detailed information about a specific device.
 */
export async function getDeviceInfo(serial) {
    const [model, manufacturer, androidVersion, sdkVersion, batteryOutput, resolutionOutput, densityOutput] = await Promise.all([
        getProp(serial, 'ro.product.model'),
        getProp(serial, 'ro.product.manufacturer'),
        getProp(serial, 'ro.build.version.release'),
        getProp(serial, 'ro.build.version.sdk'),
        getBatteryLevel(serial),
        getResolution(serial),
        getDensity(serial),
    ]);
    return {
        serial,
        model: model || 'Unknown',
        manufacturer: manufacturer || 'Unknown',
        androidVersion: androidVersion || 'Unknown',
        sdkVersion: sdkVersion || 'Unknown',
        batteryLevel: batteryOutput,
        resolution: resolutionOutput,
        density: densityOutput,
    };
}
async function getProp(serial, prop) {
    const result = await runAdb(['-s', serial, 'shell', 'getprop', prop]);
    return result.stdout.trim();
}
async function getBatteryLevel(serial) {
    const result = await runAdb(['-s', serial, 'shell', 'dumpsys', 'battery']);
    if (result.code !== 0)
        return null;
    const match = result.stdout.match(/\blevel:\s*(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}
async function getResolution(serial) {
    const result = await runAdb(['-s', serial, 'shell', 'wm', 'size']);
    if (result.code !== 0)
        return 'Unknown';
    const match = result.stdout.match(/(\d+x\d+)/);
    return match ? match[1] : 'Unknown';
}
async function getDensity(serial) {
    const result = await runAdb(['-s', serial, 'shell', 'wm', 'density']);
    if (result.code !== 0)
        return 'Unknown';
    const match = result.stdout.match(/(\d+)/);
    return match ? match[1] : 'Unknown';
}
