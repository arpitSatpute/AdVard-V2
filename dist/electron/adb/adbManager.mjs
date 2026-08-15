import { spawn } from 'child_process';
import { locateAdb } from './adbLocator.mjs';
let cachedAdbPath = null;
let adbLocateError = null;
/**
 * Returns the resolved ADB path, caching on first call.
 */
export async function getAdbPath() {
    if (cachedAdbPath)
        return cachedAdbPath;
    try {
        const path = await locateAdb();
        cachedAdbPath = path;
        adbLocateError = null;
        return path;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        adbLocateError = message;
        throw err;
    }
}
/**
 * Returns the last ADB locate error (if any), without throwing.
 */
export function getAdbLocateError() {
    return adbLocateError;
}
/**
 * Core ADB runner. Uses child_process.spawn to avoid shell injection.
 * @param args - ADB arguments (e.g. ['-s', 'SERIAL', 'shell', 'getprop', 'ro.product.model'])
 */
let currentTransferProc = null;
let cancelRequested = false;
let isPausedState = false;
export function isCancelRequested() {
    return cancelRequested;
}
export function resetCancelFlag() {
    cancelRequested = false;
    isPausedState = false;
}
export function isTransferPaused() {
    return isPausedState;
}
export function pauseActiveTransfer() {
    isPausedState = true;
    if (currentTransferProc && !currentTransferProc.killed) {
        try {
            currentTransferProc.kill('SIGSTOP');
            return true;
        }
        catch {
            return false;
        }
    }
    return false;
}
export function resumeActiveTransfer() {
    isPausedState = false;
    if (currentTransferProc && !currentTransferProc.killed) {
        try {
            currentTransferProc.kill('SIGCONT');
            return true;
        }
        catch {
            return false;
        }
    }
    return false;
}
export function cancelActiveTransfer() {
    cancelRequested = true;
    isPausedState = false;
    if (currentTransferProc && !currentTransferProc.killed) {
        try {
            currentTransferProc.kill('SIGKILL');
            currentTransferProc = null;
            return true;
        }
        catch {
            return false;
        }
    }
    return true;
}
export async function runAdb(args, onProgress, isTransferProcess = false) {
    if (isTransferProcess && cancelRequested) {
        return { stdout: '', stderr: 'Transfer cancelled by user', code: -1 };
    }
    const adbPath = await getAdbPath();
    return new Promise((resolve) => {
        const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        if (isTransferProcess) {
            currentTransferProc = proc;
        }
        const stdoutChunks = [];
        const stderrChunks = [];
        const handleChunk = (chunk) => {
            if (isTransferProcess && onProgress) {
                const text = chunk.toString('utf8');
                const match = text.match(/(\d{1,3})%/);
                if (match && match[1]) {
                    const percent = parseInt(match[1], 10);
                    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                        onProgress(percent, text);
                    }
                }
            }
        };
        proc.stdout.on('data', (chunk) => {
            stdoutChunks.push(chunk);
            handleChunk(chunk);
        });
        proc.stderr.on('data', (chunk) => {
            stderrChunks.push(chunk);
            handleChunk(chunk);
        });
        proc.on('close', (code) => {
            if (isTransferProcess && currentTransferProc === proc) {
                currentTransferProc = null;
            }
            const stdout = Buffer.concat(stdoutChunks).toString('utf8');
            const stderr = Buffer.concat(stderrChunks).toString('utf8');
            resolve({ stdout, stderr, code: code ?? -1 });
        });
        proc.on('error', (err) => {
            if (isTransferProcess && currentTransferProc === proc) {
                currentTransferProc = null;
            }
            resolve({ stdout: '', stderr: err.message, code: -1 });
        });
    });
}
/**
 * Binary ADB runner — collects raw Buffer output (for screenshot/binary data).
 */
export async function runAdbBinary(args) {
    const adbPath = await getAdbPath();
    return new Promise((resolve, reject) => {
        const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const chunks = [];
        proc.stdout.on('data', (chunk) => {
            chunks.push(chunk);
        });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(Buffer.concat(chunks));
            }
            else {
                reject(new Error(`ADB exited with code ${code}`));
            }
        });
        proc.on('error', (err) => {
            reject(err);
        });
    });
}
/**
 * Restarts the ADB server.
 */
export async function restartAdbServer() {
    await runAdb(['kill-server']);
    await runAdb(['start-server']);
    // Reset cache so next call re-resolves path
    cachedAdbPath = null;
    cachedAdbPath = await getAdbPath();
}
