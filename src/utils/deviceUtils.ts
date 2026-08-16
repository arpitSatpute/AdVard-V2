/**
 * Utility to format device serial / name for UI display.
 * Transforms raw ADB serials like `adb-ZD2229LTP3-tls.connect.tcp`
 * or `adb-ZD2229LTP3-tls._connect._tcp.` into clean device model numbers like `ZD2229LTP3`.
 */
export function formatDeviceSerial(serial?: string | null, model?: string): string {
  if (model && model !== 'Unknown' && model.trim() !== '') {
    return model;
  }
  if (!serial) return '';

  // Match adb-<MODEL>-tls.connect.tcp, adb-<MODEL>-tls..., or adb-<MODEL>
  const adbTlsMatch = serial.match(/^adb-(.+?)-(?:tls\.connect\.tcp|_adb-tls-connect\._tcp\.|tls.*)$/i);
  if (adbTlsMatch && adbTlsMatch[1]) {
    return adbTlsMatch[1];
  }

  const adbMatch = serial.match(/^adb-(.+?)(?:-tls|\._tls|\.tls|$)/i);
  if (adbMatch && adbMatch[1]) {
    return adbMatch[1];
  }

  // Remove trailing .tls domain or adb- prefix if present
  const cleaned = serial.replace(/\.tls\..*$/i, '').replace(/^adb-/i, '');
  return cleaned;
}
