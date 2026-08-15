import { runAdb } from '../adb/adbManager.mjs';
/**
 * Helper to produce a human-friendly App Name from Android Package Name
 */
function formatAppName(pkg) {
    if (!pkg)
        return 'System';
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
function extractValue(line, key) {
    const idx = line.indexOf(key + '=');
    if (idx === -1)
        return null;
    const raw = line.slice(idx + key.length + 1).trim();
    if (!raw || raw === 'null')
        return null;
    // Ignore Android dumpsys redaction placeholders e.g. String [length=8]
    if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(raw)) {
        return null;
    }
    // Match class wrapper e.g. CharSequence (value), String (value), SpannableString (value)
    const wrapperMatch = raw.match(/^[A-Za-z0-9_$.]+\s*\(([\s\S]*)\)$/);
    if (wrapperMatch && wrapperMatch[1]) {
        const val = wrapperMatch[1].trim();
        if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(val) || val === 'null')
            return null;
        return val;
    }
    // Match class wrapper without closing paren e.g. CharSequence (value
    const partialWrapperMatch = raw.match(/^[A-Za-z0-9_$.]+\s*\(([\s\S]*)/);
    if (partialWrapperMatch && partialWrapperMatch[1]) {
        let val = partialWrapperMatch[1].trim();
        if (val.endsWith(')'))
            val = val.slice(0, -1).trim();
        if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(val) || val === 'null')
            return null;
        return val;
    }
    // Quoted string
    if (raw.startsWith('"')) {
        const endIdx = raw.lastIndexOf('"');
        if (endIdx > 0) {
            const val = raw.slice(1, endIdx).trim();
            if (/^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(val))
                return null;
            return val;
        }
    }
    return /^[A-Za-z0-9_$.]+\s*\[length=\d+\]/i.test(raw) ? null : raw;
}
/**
 * Parses active system notifications via `adb shell dumpsys notification`.
 */
export async function getNotifications(serial) {
    const result = await runAdb(['-s', serial, 'shell', 'dumpsys', 'notification']);
    if (result.code !== 0) {
        throw new Error(`Failed to fetch notifications: ${result.stderr}`);
    }
    const notifications = [];
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
    let currentIsLocked = false;
    const isPlaceholderText = (val) => {
        if (!val)
            return true;
        const t = val.trim();
        if (t.length === 0 || t.toLowerCase() === 'null')
            return true;
        // Match exact dots/ellipsis placeholders e.g. "Message ...", "Message...", "Wireless..."
        if (/^(message|wireless|notification)\s*(\.\.\.|\u2026)$/i.test(t))
            return true;
        if (/^(\.\.\.|\u2026)$/.test(t))
            return true;
        return false;
    };
    const isSystemPackage = (pkg) => {
        if (!pkg)
            return false;
        const p = pkg.toLowerCase();
        return p === 'android' || p === 'com.android.systemui' || p === 'com.android.adb' || p.includes('adb.wireless');
    };
    const flushCurrent = () => {
        if (currentPkg) {
            const appName = formatAppName(currentPkg);
            // Resolve best full title
            let finalTitle = currentTitle;
            if (isPlaceholderText(finalTitle)) {
                if (currentConversationTitle && !isPlaceholderText(currentConversationTitle)) {
                    finalTitle = currentConversationTitle;
                }
                else if (currentSummaryText && !isPlaceholderText(currentSummaryText)) {
                    finalTitle = currentSummaryText;
                }
                else if (currentTicker && !isPlaceholderText(currentTicker)) {
                    finalTitle = currentTicker;
                }
                else {
                    // Generate clean title based on app package
                    if (isSystemPackage(currentPkg)) {
                        finalTitle = 'Wireless Debugging & System Service';
                    }
                    else if (currentPkg.toLowerCase().includes('whatsapp')) {
                        finalTitle = 'WhatsApp Message';
                    }
                    else {
                        finalTitle = `${appName} Notification`;
                    }
                }
            }
            // Resolve best body text
            let bodyText = (currentBigText && !isPlaceholderText(currentBigText) ? currentBigText : currentText) || currentTicker || currentSubText || '';
            if (isPlaceholderText(bodyText) || bodyText === finalTitle) {
                bodyText = (currentSubText && !isPlaceholderText(currentSubText)) ? currentSubText : '';
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
                isLocked: currentIsLocked,
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
        currentIsLocked = false;
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('NotificationRecord(') ||
            line.startsWith('StatusBarNotification(') ||
            line.startsWith('Notification(')) {
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
        // Check if line indicates lockscreen redaction placeholder
        if ((line.includes('android.title=') || line.includes('android.text=')) &&
            /\[length=\d+\]/i.test(line)) {
            currentIsLocked = true;
        }
        // Title
        const titleVal = extractValue(line, 'android.title') || extractValue(line, 'android.title.big');
        if (titleVal)
            currentTitle = titleVal;
        // Text
        const textVal = extractValue(line, 'android.text');
        if (textVal)
            currentText = textVal;
        // BigText
        const bigTextVal = extractValue(line, 'android.bigText');
        if (bigTextVal)
            currentBigText = bigTextVal;
        // SubText
        const subTextVal = extractValue(line, 'android.subText') || extractValue(line, 'android.infoText');
        if (subTextVal)
            currentSubText = subTextVal;
        // Conversation Title
        const convTitleVal = extractValue(line, 'android.conversationTitle') || extractValue(line, 'android.hiddenConversationTitle');
        if (convTitleVal)
            currentConversationTitle = convTitleVal;
        // Summary Text
        const summaryTextVal = extractValue(line, 'android.summaryText');
        if (summaryTextVal)
            currentSummaryText = summaryTextVal;
        // Ticker Text
        const tickerVal = extractValue(line, 'tickerText');
        if (tickerVal)
            currentTicker = tickerVal;
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
    const uniqueMap = new Map();
    for (const item of notifications) {
        uniqueMap.set(item.id, item);
    }
    return Array.from(uniqueMap.values()).slice(0, 50);
}
