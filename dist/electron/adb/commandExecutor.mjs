import * as path from 'path';
import { runAdb, runAdbBinary, isCancelRequested } from './adbManager.mjs';
// ─── Key Events ─────────────────────────────────────────────────────────────
const KEYCODE_HOME = 3;
const KEYCODE_BACK = 4;
const KEYCODE_POWER = 26;
const KEYCODE_WAKEUP = 224;
const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;
const KEYCODE_VOLUME_MUTE = 164;
const KEYCODE_MEDIA_PLAY_PAUSE = 85;
const KEYCODE_MEDIA_NEXT = 87;
const KEYCODE_MEDIA_PREVIOUS = 88;
const KEYCODE_RECENT = 187;
const KEYCODE_CALL = 5;
const KEYCODE_ENDCALL = 6;
export async function sendHome(serial) {
    await sendKeyEvent(serial, KEYCODE_HOME);
}
export async function sendBack(serial) {
    await sendKeyEvent(serial, KEYCODE_BACK);
}
export async function sendRecent(serial) {
    await sendKeyEvent(serial, KEYCODE_RECENT);
}
export async function sendPower(serial) {
    await sendKeyEvent(serial, KEYCODE_POWER);
}
export async function sendVolumeUp(serial) {
    await sendKeyEvent(serial, KEYCODE_VOLUME_UP);
}
export async function sendVolumeDown(serial) {
    await sendKeyEvent(serial, KEYCODE_VOLUME_DOWN);
}
export async function sendVolumeMute(serial) {
    await sendKeyEvent(serial, KEYCODE_VOLUME_MUTE);
}
export async function sendMediaPlayPause(serial) {
    await sendKeyEvent(serial, KEYCODE_MEDIA_PLAY_PAUSE);
}
export async function sendMediaNext(serial) {
    await sendKeyEvent(serial, KEYCODE_MEDIA_NEXT);
}
export async function sendMediaPrevious(serial) {
    await sendKeyEvent(serial, KEYCODE_MEDIA_PREVIOUS);
}
export async function sendKeyEvent(serial, keycode) {
    const result = await runAdb(['-s', serial, 'shell', 'input', 'keyevent', String(keycode)]);
    if (result.code !== 0) {
        throw new Error(`Key event failed: ${result.stderr}`);
    }
}
// ─── Unlock Device ────────────────────────────────────────────────────────────
export async function unlockDevice(serial, pin) {
    // Wake screen
    await sendKeyEvent(serial, KEYCODE_WAKEUP);
    // Swipe up gesture
    await swipeScreen(serial, 500, 1500, 500, 500, 300);
    if (pin && pin.trim()) {
        // Send PIN text
        await inputText(serial, pin.trim());
        // Press ENTER (66)
        await sendKeyEvent(serial, 66);
    }
}
// ─── Phone Calls ─────────────────────────────────────────────────────────────
export async function makeCall(serial, phoneNumber) {
    const cleanNumber = phoneNumber.replace(/[^0-9+*#]/g, '');
    const result = await runAdb([
        '-s', serial, 'shell', 'am', 'start',
        '-a', 'android.intent.action.CALL',
        '-d', `tel:${cleanNumber}`
    ]);
    if (result.code !== 0) {
        throw new Error(`Failed to make call: ${result.stderr}`);
    }
}
export async function answerCall(serial) {
    await sendKeyEvent(serial, KEYCODE_CALL);
}
export async function endCall(serial) {
    await sendKeyEvent(serial, KEYCODE_ENDCALL);
}
export async function getCallState(serial) {
    try {
        const res = await runAdb(['-s', serial, 'shell', 'dumpsys', 'telephony.registry']);
        let state = 'IDLE';
        let number = '';
        if (res.code === 0) {
            const output = res.stdout;
            // Look for line like: mCallState=0 or mCallState=CALL_STATE_RINGING or mCallState=CALL_STATE_OFFHOOK
            const match = output.match(/mCallState\s*=\s*(\d+|[A-Z_]+)/i);
            if (match) {
                const val = match[1].trim();
                if (val === '1' || val.includes('RINGING')) {
                    state = 'RINGING';
                }
                else if (val === '2' || val.includes('OFFHOOK')) {
                    state = 'OFFHOOK';
                }
                else {
                    state = 'IDLE';
                }
            }
            const numMatch = output.match(/mCallIncomingNumber\s*=\s*([+\d*#]+)/i) || output.match(/mIncomingNumber\s*=\s*([+\d*#]+)/i);
            if (numMatch && numMatch[1] && numMatch[1] !== 'null') {
                number = numMatch[1];
            }
        }
        // Only fallback to telecom if telephony registry didn't give explicit numeric state 1 or 2
        if (state === 'IDLE') {
            const telecomRes = await runAdb(['-s', serial, 'shell', 'dumpsys', 'telecom']);
            if (telecomRes.code === 0) {
                const stdout = telecomRes.stdout;
                if (/mState\s*=\s*RINGING/i.test(stdout) || /CallState\s*:\s*RINGING/i.test(stdout)) {
                    state = 'RINGING';
                }
                else if (/mState\s*=\s*ACTIVE/i.test(stdout) || /CallState\s*:\s*ACTIVE/i.test(stdout) || /mState\s*=\s*DIALING/i.test(stdout)) {
                    state = 'OFFHOOK';
                }
            }
        }
        return { state, number: number || undefined };
    }
    catch (err) {
        return { state: 'IDLE' };
    }
}
export async function getContacts(serial) {
    const contacts = [];
    const seenNumbers = new Set();
    // Primary attempt: content://com.android.contacts/data/phones
    // Alternative attempt: content://contacts/phones
    const queries = [
        { uri: 'content://com.android.contacts/data/phones', proj: 'display_name:number:type' },
        { uri: 'content://contacts/phones', proj: 'name:number' },
        { uri: 'content://com.android.contacts/contacts', proj: 'display_name:has_phone_number' },
    ];
    for (const q of queries) {
        try {
            const args = ['-s', serial, 'shell', 'content', 'query', '--uri', q.uri];
            if (q.proj) {
                args.push('--projection', q.proj);
            }
            const result = await runAdb(args);
            if (result.code === 0 && result.stdout && !result.stdout.includes('Error')) {
                const lines = result.stdout.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line.startsWith('Row:'))
                        continue;
                    let name = '';
                    let num = '';
                    let typeVal = 'Mobile';
                    const nameMatch = line.match(/(?:display_name|name)=([^,]+)/i);
                    const numMatch = line.match(/number=([^,]+)/i);
                    const typeMatch = line.match(/type=([^,]+)/i);
                    if (nameMatch && nameMatch[1] && nameMatch[1] !== 'null') {
                        name = nameMatch[1].trim();
                    }
                    if (numMatch && numMatch[1] && numMatch[1] !== 'null') {
                        num = numMatch[1].trim();
                    }
                    if (num) {
                        const cleanKey = num.replace(/\D/g, '');
                        if (cleanKey && !seenNumbers.has(cleanKey)) {
                            seenNumbers.add(cleanKey);
                            if (typeMatch && typeMatch[1]) {
                                const t = typeMatch[1].trim();
                                typeVal = t === '2' ? 'Mobile' : t === '1' ? 'Home' : t === '3' ? 'Work' : 'Other';
                            }
                            contacts.push({
                                id: `contact_${contacts.length + 1}`,
                                name: name || 'Unknown',
                                number: num,
                                type: typeVal,
                            });
                        }
                    }
                }
                if (contacts.length > 0) {
                    break;
                }
            }
        }
        catch {
            // Continue to next fallback query
        }
    }
    // Fallback to call log parsing if contacts database is restricted by Android security
    if (contacts.length === 0) {
        try {
            const logRes = await runAdb([
                '-s', serial, 'shell',
                'content', 'query',
                '--uri', 'content://call_log/calls',
                '--projection', 'name:number:type'
            ]);
            if (logRes.code === 0 && logRes.stdout) {
                const lines = logRes.stdout.split('\n');
                for (const line of lines) {
                    if (!line.trim().startsWith('Row:'))
                        continue;
                    const nameMatch = line.match(/name=([^,]+)/i);
                    const numMatch = line.match(/number=([^,]+)/i);
                    if (numMatch && numMatch[1] && numMatch[1] !== 'null') {
                        const num = numMatch[1].trim();
                        const cleanKey = num.replace(/\D/g, '');
                        if (cleanKey && !seenNumbers.has(cleanKey)) {
                            seenNumbers.add(cleanKey);
                            const name = nameMatch && nameMatch[1] && nameMatch[1] !== 'null' ? nameMatch[1].trim() : 'Call Log Entry';
                            contacts.push({
                                id: `contact_${contacts.length + 1}`,
                                name,
                                number: num,
                                type: 'Recent',
                            });
                        }
                    }
                }
            }
        }
        catch { }
    }
    return contacts;
}
// ─── Audio Output & In-Call Audio Controls ─────────────────────────────
export async function setAudioRoute(serial, route) {
    let cmd = '';
    if (route === 'speaker') {
        cmd = 'cmd audio set-speakerphone-on true || media volume --stream 0 --set 15';
    }
    else if (route === 'earpiece') {
        cmd = 'cmd audio set-speakerphone-on false';
    }
    else if (route === 'bluetooth') {
        cmd = 'service call audio 26 i32 1 || cmd audio set-speakerphone-on false';
    }
    else {
        cmd = 'cmd audio set-speakerphone-on false';
    }
    await runAdb(['-s', serial, 'shell', cmd]);
}
export async function toggleMuteMic(serial, mute) {
    const arg = mute ? 'true' : 'false';
    await runAdb(['-s', serial, 'shell', `cmd audio set-microphone-mute ${arg} || input keyevent 164`]);
}
export async function sendDtmfTone(serial, digit) {
    const keycodeMap = {
        '0': 7, '1': 8, '2': 9, '3': 10, '4': 11, '5': 12, '6': 13, '7': 14, '8': 15, '9': 16,
        '*': 17, '#': 18
    };
    const keycode = keycodeMap[digit];
    if (keycode) {
        await sendKeyEvent(serial, keycode);
    }
}
// ─── Brightness Control ──────────────────────────────────────────────────────
export async function getBrightness(serial) {
    const result = await runAdb(['-s', serial, 'shell', 'settings', 'get', 'system', 'screen_brightness']);
    if (result.code !== 0) {
        throw new Error(`Failed to get brightness: ${result.stderr}`);
    }
    const val = parseInt(result.stdout.trim(), 10);
    return isNaN(val) ? 128 : val;
}
export async function setBrightness(serial, level) {
    const clamped = Math.max(0, Math.min(255, Math.round(level)));
    const result = await runAdb(['-s', serial, 'shell', 'settings', 'put', 'system', 'screen_brightness', String(clamped)]);
    if (result.code !== 0) {
        throw new Error(`Failed to set brightness: ${result.stderr}`);
    }
}
// ─── Reboot ──────────────────────────────────────────────────────────────────
export async function rebootDevice(serial) {
    const result = await runAdb(['-s', serial, 'reboot']);
    if (result.code !== 0 && result.stderr && !result.stderr.includes('error: closed')) {
        throw new Error(`Reboot failed: ${result.stderr}`);
    }
}
// ─── Screenshot ──────────────────────────────────────────────────────────────
export async function takeScreenshot(serial) {
    const buffer = await runAdbBinary(['-s', serial, 'exec-out', 'screencap', '-p']);
    return buffer.toString('base64');
}
export async function runShellCommand(serial, command) {
    const result = await runAdb(['-s', serial, 'shell', command]);
    return {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code,
    };
}
export async function listPackages(serial, filterType = 'all') {
    let args = ['-s', serial, 'shell', 'pm', 'list', 'packages'];
    if (filterType === '3rdparty') {
        args.push('-3');
    }
    else if (filterType === 'system') {
        args.push('-s');
    }
    const result = await runAdb(args);
    if (result.code !== 0) {
        throw new Error(`Failed to list packages: ${result.stderr}`);
    }
    const systemPackages = new Set();
    if (filterType === 'all') {
        const sysResult = await runAdb(['-s', serial, 'shell', 'pm', 'list', 'packages', '-s']);
        if (sysResult.code === 0) {
            sysResult.stdout
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.startsWith('package:'))
                .forEach((line) => systemPackages.add(line.replace('package:', '')));
        }
    }
    return result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('package:'))
        .map((line) => {
        const pkg = line.replace('package:', '');
        return {
            packageName: pkg,
            isSystem: filterType === 'system' ? true : filterType === '3rdparty' ? false : systemPackages.has(pkg),
        };
    });
}
export async function launchApp(serial, packageName) {
    const result = await runAdb([
        '-s', serial, 'shell', 'monkey',
        '-p', packageName,
        '-c', 'android.intent.category.LAUNCHER',
        '1',
    ]);
    if (result.code !== 0 && !result.stdout.includes('Events injected: 1')) {
        throw new Error(`Failed to launch ${packageName}: ${result.stderr}`);
    }
}
export async function forceStopApp(serial, packageName) {
    const result = await runAdb(['-s', serial, 'shell', 'am', 'force-stop', packageName]);
    if (result.code !== 0) {
        throw new Error(`Failed to force stop ${packageName}: ${result.stderr}`);
    }
}
export async function clearAppData(serial, packageName) {
    const result = await runAdb(['-s', serial, 'shell', 'pm', 'clear', packageName]);
    if (result.code !== 0) {
        throw new Error(`Failed to clear data for ${packageName}: ${result.stderr}`);
    }
}
export async function installApk(serial, apkPath) {
    const result = await runAdb(['-s', serial, 'install', '-r', apkPath]);
    if (!result.stdout.includes('Success') && result.code !== 0) {
        throw new Error(`Failed to install APK: ${result.stderr || result.stdout}`);
    }
}
export async function uninstallApp(serial, packageName) {
    const result = await runAdb(['-s', serial, 'uninstall', packageName]);
    if (!result.stdout.includes('Success') && result.code !== 0) {
        throw new Error(`Failed to uninstall ${packageName}: ${result.stderr || result.stdout}`);
    }
}
// ─── File Management ─────────────────────────────────────────────────────────
import * as fs from 'fs';
const JUNK_FILE_PATTERNS = ['.DS_Store', '.localized', 'Thumbs.db', 'desktop.ini'];
function isJunkPath(fileName) {
    if (!fileName)
        return true;
    if (fileName.startsWith('._'))
        return true;
    if (fileName.includes('Icon') && (fileName.includes('\r') || fileName.includes('\n')))
        return true;
    return JUNK_FILE_PATTERNS.includes(fileName.trim());
}
export async function pushFile(serial, localPath, remotePath, onProgress) {
    if (isCancelRequested()) {
        throw new Error('Transfer cancelled by user');
    }
    let cleanRemote = remotePath ? remotePath.split(' -> ')[0].trim() : '';
    // Enforce Android phone Downloads path (/storage/emulated/0/Download/) for all file transfers
    if (!cleanRemote.startsWith('/storage/emulated/0/Download')) {
        cleanRemote = '/storage/emulated/0/Download/';
    }
    const target = cleanRemote.endsWith('/') ? cleanRemote : `${cleanRemote}/`;
    if (!fs.existsSync(localPath)) {
        throw new Error(`Local file or directory does not exist: ${localPath}`);
    }
    const baseName = path.basename(localPath);
    if (isJunkPath(baseName)) {
        return; // Skip OS metadata/junk files
    }
    // Replace characters prohibited on Android filesystems (: ? * < > | " ') with '_'
    const safeBaseName = baseName.replace(/[:?*<>|"']/g, '_').trim();
    const stat = fs.statSync(localPath);
    if (stat.isFile()) {
        const destFile = `${target}${safeBaseName}`;
        let result = await runAdb(['-s', serial, 'push', '-p', localPath, destFile], (pct) => onProgress?.(pct), true);
        // If -p flag isn't supported by ADB version or fails, fallback without -p
        if (result.code !== 0) {
            result = await runAdb(['-s', serial, 'push', localPath, destFile], (pct) => onProgress?.(pct), true);
        }
        // Fallback 1: If /storage/emulated/0/ path fails, try /sdcard/ symlink equivalent
        if (result.code !== 0 && target.startsWith('/storage/emulated/0/')) {
            const altTarget = target.replace('/storage/emulated/0/', '/sdcard/');
            const altDestFile = `${altTarget}${safeBaseName}`;
            result = await runAdb(['-s', serial, 'push', '-p', localPath, altDestFile], (pct) => onProgress?.(pct), true);
        }
        if (result.code !== 0) {
            throw new Error(`Push failed: ${result.stderr || result.stdout}`);
        }
        // Update modified timestamp to current date & time, set readable permissions & trigger Android Media Scanner
        try {
            await runAdb(['-s', serial, 'shell', 'touch', '-c', destFile]);
            await runAdb(['-s', serial, 'shell', 'chmod', '664', destFile]);
            await runAdb(['-s', serial, 'shell', 'cmd', 'media_provider', 'scan-file', destFile]);
            await runAdb(['-s', serial, 'shell', 'am', 'broadcast', '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE', '-d', `file://${destFile}`]);
        }
        catch {
            // Ignore broadcast errors
        }
    }
    else if (stat.isDirectory()) {
        const remoteSubDir = `${target}${safeBaseName}/`;
        await runAdb(['-s', serial, 'shell', 'mkdir', '-p', remoteSubDir]);
        try {
            await runAdb(['-s', serial, 'shell', 'touch', '-c', remoteSubDir]);
            await runAdb(['-s', serial, 'shell', 'chmod', '-R', '775', remoteSubDir]);
        }
        catch {
            // Ignore touch/chmod errors
        }
        const entries = fs.readdirSync(localPath);
        for (const entry of entries) {
            if (isJunkPath(entry))
                continue;
            const childLocalPath = path.join(localPath, entry);
            await pushFile(serial, childLocalPath, remoteSubDir, onProgress);
        }
    }
}
export async function pullFile(serial, remotePath, localPath, onProgress) {
    // Clean up remote path (strip any symlink target arrows "-> target")
    let cleanRemote = remotePath.split(' -> ')[0].trim();
    // Prefer Internal Storage (/storage/emulated/0/) over /sdcard/ symlink
    if (cleanRemote.startsWith('/sdcard/')) {
        cleanRemote = cleanRemote.replace('/sdcard/', '/storage/emulated/0/');
    }
    // Trim trailing slash for folders so ADB pulls the directory entity itself
    if (cleanRemote.length > 1 && cleanRemote.endsWith('/')) {
        cleanRemote = cleanRemote.slice(0, -1);
    }
    let result = await runAdb(['-s', serial, 'pull', '-p', cleanRemote, localPath], (pct) => onProgress?.(pct), true);
    // Fallback if -p is unsupported
    if (result.code !== 0) {
        result = await runAdb(['-s', serial, 'pull', cleanRemote, localPath], (pct) => onProgress?.(pct), true);
    }
    // Fallback 1: If /storage/emulated/0/ path fails, try /sdcard/ symlink equivalent
    if (result.code !== 0 && cleanRemote.startsWith('/storage/emulated/0/')) {
        const altRemote = cleanRemote.replace('/storage/emulated/0/', '/sdcard/');
        result = await runAdb(['-s', serial, 'pull', '-p', altRemote, localPath], (pct) => onProgress?.(pct), true);
        if (result.code !== 0) {
            result = await runAdb(['-s', serial, 'pull', altRemote, localPath], (pct) => onProgress?.(pct), true);
        }
    }
    // Fallback 2: If /sdcard/ path fails, try /storage/emulated/0/ equivalent
    if (result.code !== 0 && cleanRemote.startsWith('/sdcard/')) {
        const altRemote = cleanRemote.replace('/sdcard/', '/storage/emulated/0/');
        result = await runAdb(['-s', serial, 'pull', '-p', altRemote, localPath], (pct) => onProgress?.(pct), true);
        if (result.code !== 0) {
            result = await runAdb(['-s', serial, 'pull', altRemote, localPath], (pct) => onProgress?.(pct), true);
        }
    }
    // Fallback 3: Try exact raw original remotePath directly
    const rawOriginal = remotePath.split(' -> ')[0].trim();
    if (result.code !== 0 && rawOriginal !== cleanRemote) {
        result = await runAdb(['-s', serial, 'pull', rawOriginal, localPath], (pct) => onProgress?.(pct), true);
    }
    if (result.code !== 0) {
        throw new Error(`Pull failed: ${result.stderr || result.stdout}`);
    }
}
// ─── Input & Touch Remote Control ──────────────────────────────────────────────
export async function tapScreen(serial, x, y) {
    await runAdb(['-s', serial, 'shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))]);
}
export async function swipeScreen(serial, x1, y1, x2, y2, durationMs = 300) {
    await runAdb([
        '-s', serial, 'shell', 'input', 'swipe',
        String(Math.round(x1)), String(Math.round(y1)), String(Math.round(x2)), String(Math.round(y2)), String(durationMs),
    ]);
}
export async function inputText(serial, text) {
    const escaped = text.replace(/ /g, '%s');
    await runAdb(['-s', serial, 'shell', 'input', 'text', escaped]);
}
