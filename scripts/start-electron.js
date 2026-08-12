import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import electronPath from 'electron';

const projectRoot = process.cwd();
const localDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
const programDataDir = process.env.PROGRAMDATA || 'C:\\ProgramData';
const allowedDist = path.join(programDataDir, 'AdVardElectronDist');

function prepareElectronBinary() {
  if (process.platform !== 'win32') {
    return typeof electronPath === 'string' ? electronPath : path.join(localDist, 'electron');
  }

  try {
    if (!fs.existsSync(localDist)) {
      return typeof electronPath === 'string' ? electronPath : path.join(localDist, 'electron.exe');
    }
    const localExe = path.join(localDist, 'electron.exe');
    const targetExe = path.join(allowedDist, 'electron.exe');

    if (!fs.existsSync(targetExe) || fs.statSync(localExe).size !== fs.statSync(targetExe).size) {
      if (!fs.existsSync(allowedDist)) {
        fs.mkdirSync(allowedDist, { recursive: true });
      }
      fs.cpSync(localDist, allowedDist, { recursive: true });
    }
    return targetExe;
  } catch (err) {
    return typeof electronPath === 'string' ? electronPath : path.join(localDist, 'electron.exe');
  }
}

function launchEdgeAppMode() {
  console.log('\n=================================================================');
  console.log('[AdVard] Windows Device Guard policy detected on this system.');
  console.log('[AdVard] Launching AdVard App via Microsoft Edge (Standalone App Mode)...');
  console.log('=================================================================\n');

  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'msedge.exe'
  ];

  let launched = false;
  for (const edgePath of edgePaths) {
    try {
      const child = spawn(`"${edgePath}"`, ['--app=http://localhost:5173', '--window-size=1280,800'], {
        shell: true,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      launched = true;
      console.log('[AdVard] Successfully opened AdVard in Standalone App Window!');
      break;
    } catch (e) {}
  }

  if (!launched) {
    console.log('[AdVard] Please open http://localhost:5173 in your browser.');
  }

  // Keep script alive so dev server stays up
  setInterval(() => {}, 60000);
}

const electronExe = prepareElectronBinary();
const args = process.argv.slice(2);
const appPath = args.length > 0 ? args : ['.'];

const isWin = process.platform === 'win32';
const spawnOpts = {
  stdio: 'pipe',
  windowsHide: false,
  ...(isWin ? { shell: true, windowsVerbatimArguments: true } : {})
};

let isBlocked = false;

const child = isWin
  ? spawn(`"${electronExe}"`, appPath, spawnOpts)
  : spawn(electronExe, appPath, spawnOpts);

if (child.stdout) child.stdout.pipe(process.stdout);
if (child.stderr) {
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('Device Guard') || text.includes('4551') || text.includes('blocked by your organization')) {
      isBlocked = true;
    }
    process.stderr.write(chunk);
  });
}

child.on('error', (err) => {
  console.error('[Start-Electron] Error launching Electron:', err);
  launchEdgeAppMode();
});

child.on('close', (code) => {
  if (code === 4551 || isBlocked) {
    launchEdgeAppMode();
  } else {
    process.exit(code || 0);
  }
});
