import { spawn } from 'child_process';
import { locateAdb } from './adbLocator';

export interface AdbResult {
  stdout: string;
  stderr: string;
  code: number;
}

let cachedAdbPath: string | null = null;
let adbLocateError: string | null = null;

/**
 * Returns the resolved ADB path, caching on first call.
 */
export async function getAdbPath(): Promise<string> {
  if (cachedAdbPath) return cachedAdbPath;

  try {
    const path = await locateAdb();
    cachedAdbPath = path;
    adbLocateError = null;
    return path;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    adbLocateError = message;
    throw err;
  }
}

/**
 * Returns the last ADB locate error (if any), without throwing.
 */
export function getAdbLocateError(): string | null {
  return adbLocateError;
}

/**
 * Core ADB runner. Uses child_process.spawn to avoid shell injection.
 * @param args - ADB arguments (e.g. ['-s', 'SERIAL', 'shell', 'getprop', 'ro.product.model'])
 */
let currentTransferProc: ReturnType<typeof spawn> | null = null;
let cancelRequested = false;
let isPausedState = false;

export function isCancelRequested(): boolean {
  return cancelRequested;
}

export function resetCancelFlag(): void {
  cancelRequested = false;
  isPausedState = false;
}

export function isTransferPaused(): boolean {
  return isPausedState;
}

export function pauseActiveTransfer(): boolean {
  isPausedState = true;
  if (currentTransferProc && !currentTransferProc.killed) {
    try {
      currentTransferProc.kill('SIGSTOP');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function resumeActiveTransfer(): boolean {
  isPausedState = false;
  if (currentTransferProc && !currentTransferProc.killed) {
    try {
      currentTransferProc.kill('SIGCONT');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function cancelActiveTransfer(): boolean {
  cancelRequested = true;
  isPausedState = false;
  if (currentTransferProc && !currentTransferProc.killed) {
    try {
      currentTransferProc.kill('SIGKILL');
      currentTransferProc = null;
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

export async function runAdb(
  args: string[],
  onProgress?: (percentage: number, text: string) => void,
  isTransferProcess: boolean = false
): Promise<AdbResult> {
  if (isTransferProcess && cancelRequested) {
    return { stdout: '', stderr: 'Transfer cancelled by user', code: -1 };
  }

  const adbPath = await getAdbPath();


  return new Promise((resolve) => {
    const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    if (isTransferProcess) {
      currentTransferProc = proc;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const handleChunk = (chunk: Buffer) => {
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



    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
      handleChunk(chunk);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
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
export async function runAdbBinary(args: string[]): Promise<Buffer> {
  const adbPath = await getAdbPath();

  return new Promise((resolve, reject) => {
    const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];

    proc.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
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
export async function restartAdbServer(): Promise<void> {
  await runAdb(['kill-server']);
  await runAdb(['start-server']);
  // Reset cache so next call re-resolves path
  cachedAdbPath = null;
  cachedAdbPath = await getAdbPath();
}
