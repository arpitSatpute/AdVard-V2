import { runAdb } from '../adb/adbManager';

/**
 * Gets the current Android device clipboard contents via `adb shell cmd clipboard get`.
 */
export async function getPhoneClipboard(serial: string): Promise<string> {
  const result = await runAdb(['-s', serial, 'shell', 'cmd', 'clipboard', 'get']);
  if (result.code === 0 && result.stdout) {
    return result.stdout.trim();
  }
  return '';
}

/**
 * Sends text to the Android device clipboard via `adb shell cmd clipboard set` or `input text`.
 */
export async function sendPhoneClipboard(serial: string, text: string): Promise<void> {
  const sanitized = text.replace(/["'\\]/g, '\\$&');
  const result = await runAdb(['-s', serial, 'shell', 'cmd', 'clipboard', 'set', `"${sanitized}"`]);

  if (result.code !== 0) {
    // Fallback via input text for key entry
    const encoded = encodeURIComponent(text);
    await runAdb(['-s', serial, 'shell', 'input', 'text', encoded]);
  }
}
