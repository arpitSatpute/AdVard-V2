import { runAdb } from '../adb/adbManager';

export interface NotificationItem {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: string;
  postTime?: number;
  category?: string;
}

/**
 * Helper to produce a human-friendly App Name from Android Package Name
 */
function formatAppName(pkg: string): string {
  if (!pkg) return 'System';
  const parts = pkg.split('.');
  let name = parts[parts.length - 1] || pkg;
  if (name.toLowerCase() === 'android' && parts.length > 1) {
    name = parts[parts.length - 2];
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Extract notification field values from lines like:
 * `android.title=CharSequence (Hello)`
 * `android.text=String (World)`
 * `android.bigText=SpannableString (Long text)`
 * `android.title="Hello"`
 *
 * Ignores Android dumpsys redaction placeholders e.g. `String [length=8]`
 */
function extractValue(line: string, key: string): string | null {
  const idx = line.indexOf(key + '=');
  if (idx === -1) return null;

  const raw = line.slice(idx + key.length + 1).trim();
  if (!raw || raw === 'null') return null;

  // Ignore Android dumpsys redaction placeholders e.g. String [length=8]
  if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(raw)) {
    return null;
  }

  // Match class wrapper e.g. CharSequence (value), String (value), SpannableString (value)
  const wrapperMatch = raw.match(/^[A-Za-z0-9_$.]+\s*\(([\s\S]*)\)$/);
  if (wrapperMatch && wrapperMatch[1]) {
    const val = wrapperMatch[1].trim();
    if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(val) || val === 'null') return null;
    return val;
  }

  // Match class wrapper without closing paren e.g. CharSequence (value
  const partialWrapperMatch = raw.match(/^[A-Za-z0-9_$.]+\s*\(([\s\S]*)/);
  if (partialWrapperMatch && partialWrapperMatch[1]) {
    let val = partialWrapperMatch[1].trim();
    if (val.endsWith(')')) val = val.slice(0, -1).trim();
    if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(val) || val === 'null') return null;
    return val;
  }

  // Quoted string
  if (raw.startsWith('"')) {
    const endIdx = raw.lastIndexOf('"');
    if (endIdx > 0) {
      const val = raw.slice(1, endIdx).trim();
      if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(val)) return null;
      return val;
    }
  }

  return /^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(raw) ? null : raw;
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
  let currentBigText = '';
  let currentSubText = '';
  let currentConversationTitle = '';
  let currentSummaryText = '';
  let currentTicker = '';
  let currentCategory = '';
  let currentKey = '';

  const isPlaceholderText = (val: string): boolean => {
    if (!val) return true;
    const t = val.trim().toLowerCase();
    if (t.length <= 1 || t === 'null') return true;

    // Match any string ending with dots/ellipsis e.g. "Message ...", "Message...", "Wireless...", "Wireless..."
    if (/(\.\.\.|\u2026|\.\s*\.\s*\.)$/.test(t)) return true;

    // Match generic placeholder prefix words e.g. "message", "wireless", "notification"
    if (/^(message|wireless|notification|system)\b/i.test(t) && (t.includes('.') || t.includes('…'))) {
      return true;
    }

    return false;
  };

  const flushCurrent = () => {
    if (currentPkg) {
      const appName = formatAppName(currentPkg);

      // Resolve best full title
      let finalTitle = currentTitle;
      if (isPlaceholderText(finalTitle)) {
        if (currentConversationTitle && !isPlaceholderText(currentConversationTitle)) {
          finalTitle = currentConversationTitle;
        } else if (currentSummaryText && !isPlaceholderText(currentSummaryText)) {
          finalTitle = currentSummaryText;
        } else if (currentTicker && !isPlaceholderText(currentTicker)) {
          finalTitle = currentTicker;
        } else {
          // Generate clean descriptive title based on app package
          const lowerPkg = currentPkg.toLowerCase();
          if (lowerPkg.includes('whatsapp')) {
            finalTitle = 'WhatsApp Message';
          } else if (lowerPkg.includes('android') || lowerPkg.includes('wireless') || lowerPkg.includes('system')) {
            finalTitle = 'Wireless & System Service';
          } else {
            finalTitle = `${appName} Alert`;
          }
        }
      }

      // Resolve best body text
      let bodyText = currentBigText || currentText || currentTicker || currentSubText || '';
      if (isPlaceholderText(bodyText)) {
        if (currentBigText && !isPlaceholderText(currentBigText)) {
          bodyText = currentBigText;
        } else if (currentSubText && !isPlaceholderText(currentSubText)) {
          bodyText = currentSubText;
        } else if (currentTicker && !isPlaceholderText(currentTicker)) {
          bodyText = currentTicker;
        } else {
          bodyText = finalTitle.includes('Message')
            ? 'New message received'
            : `${appName} notification active`;
        }
      }

      // Don't duplicate title in text if bodyText is identical to title
      if (bodyText === finalTitle || isPlaceholderText(bodyText)) {
        bodyText = currentSubText || `${appName} service notification`;
      }

      const cleanPkg = currentPkg;
      const idString = currentKey || `${cleanPkg}:${finalTitle}:${bodyText.slice(0, 40)}`;

      notifications.push({
        id: idString,
        packageName: cleanPkg,
        appName,
        title: finalTitle,
        text: bodyText,
        subText: currentSubText || undefined,
        category: currentCategory || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        postTime: Date.now(),
      });
    }

    currentPkg = '';
    currentTitle = '';
    currentText = '';
    currentBigText = '';
    currentSubText = '';
    currentConversationTitle = '';
    currentSummaryText = '';
    currentTicker = '';
    currentCategory = '';
    currentKey = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (
      line.startsWith('NotificationRecord(') ||
      line.startsWith('StatusBarNotification(') ||
      line.startsWith('Notification(')
    ) {
      flushCurrent();

      const matchPkg = line.match(/pkg=([^\s,]+)/) || line.match(/opPkg=([^\s,]+)/);
      if (matchPkg) {
        currentPkg = matchPkg[1];
      }
      const matchKey = line.match(/key=([^\s,]+)/);
      if (matchKey) {
        currentKey = matchKey[1];
      }
    }

    // Check package if not yet set
    if (!currentPkg) {
      const matchPkg = line.match(/pkg=([^\s,]+)/) || line.match(/opPkg=([^\s,]+)/);
      if (matchPkg) {
        currentPkg = matchPkg[1];
      }
    }

    // Title
    const titleVal = extractValue(line, 'android.title');
    if (titleVal) currentTitle = titleVal;

    // Text
    const textVal = extractValue(line, 'android.text');
    if (textVal) currentText = textVal;

    // BigText
    const bigTextVal = extractValue(line, 'android.bigText');
    if (bigTextVal) currentBigText = bigTextVal;

    // SubText
    const subTextVal = extractValue(line, 'android.subText');
    if (subTextVal) currentSubText = subTextVal;

    // Conversation Title
    const convTitleVal = extractValue(line, 'android.conversationTitle');
    if (convTitleVal) currentConversationTitle = convTitleVal;

    // Summary Text
    const summaryTextVal = extractValue(line, 'android.summaryText');
    if (summaryTextVal) currentSummaryText = summaryTextVal;

    // Ticker Text
    const tickerVal = extractValue(line, 'tickerText');
    if (tickerVal) currentTicker = tickerVal;

    // Category
    if (line.includes('category=')) {
      const matchCat = line.match(/category=([^\s,]+)/);
      if (matchCat && matchCat[1] !== 'null') {
        currentCategory = matchCat[1];
      }
    }
  }

  // Flush remaining item at end of loop
  flushCurrent();

  // Deduplicate entries by unique ID / payload
  const uniqueMap = new Map<string, NotificationItem>();
  for (const item of notifications) {
    uniqueMap.set(item.id, item);
  }

  return Array.from(uniqueMap.values()).slice(0, 50);
}

