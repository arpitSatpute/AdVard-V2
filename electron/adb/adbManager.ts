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
export async function runAdb(args: string[]): Promise<AdbResult> {
  const adbPath = await getAdbPath();

  return new Promise((resolve) => {
    const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? -1 });
    });

    proc.on('error', (err) => {
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
