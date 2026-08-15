import { runAdb, runAdbBinary } from '../adb/adbManager.mjs';
/**
 * Lists contents of an Android directory using `adb shell ls -la`.
 */
export async function listDirectory(serial, remoteDir = '/storage/emulated/0/') {
    const targetPath = remoteDir.endsWith('/') ? remoteDir : `${remoteDir}/`;
    const result = await runAdb(['-s', serial, 'shell', 'ls', '-la', targetPath]);
    if (result.code !== 0) {
        throw new Error(`Failed to list directory: ${result.stderr}`);
    }
    // Handle \r\n line endings from shell
    const lines = result.stdout.replace(/\r\n/g, '\n').split('\n');
    const files = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('total'))
            continue;
        // Split line by whitespace
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 7) {
            const permissions = parts[0];
            const isDirectory = permissions.startsWith('d') || permissions.startsWith('l');
            // Find date/time part (matches 21:50 or 2026)
            let timeIdx = -1;
            for (let i = 2; i < parts.length - 1; i++) {
                if (/^\d{1,2}:\d{2}$|^\d{4}$/.test(parts[i])) {
                    timeIdx = i;
                    break;
                }
            }
            if (timeIdx === -1) {
                timeIdx = Math.min(6, parts.length - 2);
            }
            // Search backwards from timeIdx - 1 for the file size (pure integer digits)
            let size = 0;
            let sizeIdx = -1;
            for (let k = timeIdx - 1; k >= 1; k--) {
                if (/^\d+$/.test(parts[k])) {
                    size = parseInt(parts[k], 10);
                    sizeIdx = k;
                    break;
                }
            }
            // Re-assemble date string
            const dateStr = parts.slice(Math.max(1, sizeIdx + 1), timeIdx + 1).join(' ');
            // Extract exact raw filename substring from original line to preserve exact spaces, tabs & unicode characters
            let rawName = parts.slice(timeIdx + 1).join(' ');
            const timeStr = parts[timeIdx];
            const timeMatchIdx = line.indexOf(timeStr);
            if (timeMatchIdx !== -1) {
                const candidate = line.slice(timeMatchIdx + timeStr.length).trim();
                if (candidate)
                    rawName = candidate;
            }
            const fileName = rawName.split(' -> ')[0].trim();
            if (!fileName || fileName === '.' || fileName === '..')
                continue;
            files.push({
                name: fileName,
                path: `${targetPath}${fileName}`,
                isDirectory,
                size: isDirectory ? 0 : size,
                permissions,
                modifiedDate: dateStr,
            });
        }
    }
    return files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory)
            return -1;
        if (!a.isDirectory && b.isDirectory)
            return 1;
        return a.name.localeCompare(b.name);
    });
}
/**
 * Creates a new directory on Android using `adb shell mkdir -p`.
 */
export async function createDirectory(serial, remoteDir) {
    const result = await runAdb(['-s', serial, 'shell', 'mkdir', '-p', remoteDir]);
    if (result.code !== 0) {
        throw new Error(`Failed to create directory: ${result.stderr}`);
    }
}
/**
 * Deletes a file or directory on Android using `adb shell rm -rf`.
 */
export async function deleteRemoteFile(serial, remotePath) {
    const result = await runAdb(['-s', serial, 'shell', 'rm', '-rf', remotePath]);
    if (result.code !== 0) {
        throw new Error(`Failed to delete file: ${result.stderr}`);
    }
}
/**
 * Renames or moves a file or directory on Android using `adb shell mv`.
 */
export async function renameRemoteFile(serial, oldPath, newPath) {
    const result = await runAdb(['-s', serial, 'shell', 'mv', oldPath, newPath]);
    if (result.code !== 0) {
        throw new Error(`Failed to rename item: ${result.stderr}`);
    }
}
/**
 * Fetches preview content (image base64 or text contents) for a file on Android device.
 */
export async function getFilePreview(serial, remotePath) {
    const ext = remotePath.split('.').pop()?.toLowerCase() || '';
    const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const textExts = ['txt', 'json', 'log', 'xml', 'md', 'js', 'ts', 'py', 'html', 'css', 'sh', 'conf', 'ini', 'csv'];
    if (imgExts.includes(ext)) {
        try {
            const buffer = await runAdbBinary(['-s', serial, 'exec-out', 'cat', remotePath]);
            const mime = ext === 'jpg' ? 'jpeg' : ext;
            const base64 = buffer.toString('base64');
            return {
                type: 'image',
                mimeType: `image/${mime}`,
                content: `data:image/${mime};base64,${base64}`,
            };
        }
        catch {
            return { type: 'binary' };
        }
    }
    if (textExts.includes(ext)) {
        try {
            const res = await runAdb(['-s', serial, 'shell', 'head', '-c', '10000', remotePath]);
            if (res.code === 0) {
                return { type: 'text', content: res.stdout };
            }
        }
        catch {
            return { type: 'binary' };
        }
    }
    return { type: 'binary' };
}
