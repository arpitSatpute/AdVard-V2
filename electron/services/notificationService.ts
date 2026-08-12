import { runAdb } from '../adb/adbManager';

export interface NotificationItem {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  timestamp: string;
}

/**
 * Parses active system notifications via `adb shell dumpsys notification`.
 */
export async function getNotifications(serial: string): Promise<NotificationItem[]> {
  const result = await runAdb(['-s', serial, 'shell', 'dumpsys', 'notification']);
  if (result.code !== 0) {
    throw new Error(`Failed to fetch notifications: ${result.stderr}`);
  }

  const notifications: NotificationItem[] = [];
  const lines = result.stdout.split('\n');
  let currentPkg = '';
  let currentTitle = '';
  let currentText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('NotificationRecord(')) {
      const matchPkg = line.match(/pkg=([^\s]+)/);
      if (matchPkg) {
        currentPkg = matchPkg[1];
      }
    }

    if (line.includes('android.title=')) {
      const matchTitle = line.match(/android\.title=String\s*\(([^)]+)\)/);
      if (matchTitle) {
        currentTitle = matchTitle[1];
      }
    }

    if (line.includes('android.text=')) {
      const matchText = line.match(/android\.text=String\s*\(([^)]+)\)/);
      if (matchText) {
        currentText = matchText[1];
      }

      if (currentPkg && (currentTitle || currentText)) {
        const appNameParts = currentPkg.split('.');
        const appName = appNameParts[appNameParts.length - 1] || currentPkg;

        notifications.push({
          id: `${currentPkg}-${Date.now()}-${Math.random()}`,
          packageName: currentPkg,
          appName: appName.charAt(0).toUpperCase() + appName.slice(1),
          title: currentTitle || 'Notification',
          text: currentText || '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        currentPkg = '';
        currentTitle = '';
        currentText = '';
      }
    }
  }

  // Deduplicate notification entries
  const unique = new Map<string, NotificationItem>();
  for (const item of notifications) {
    unique.set(`${item.packageName}:${item.title}:${item.text}`, item);
  }

  return Array.from(unique.values()).slice(0, 30);
}
