import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

// Clean temporary build folders before starting
['dist/win-unpacked', 'release/win-unpacked'].forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`[AdVard Build] Cleaning previous ${dir} build folder...`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

console.log('[AdVard Build] Building renderer & electron main scripts...');
execSync('npm run build', { stdio: 'inherit' });

console.log('[AdVard Build] Packaging Windows binaries with electron-builder...');
const buildEnv = Object.assign({}, process.env, {
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  SystemRoot: process.env.SystemRoot || 'C:\\Windows',
  PATH: process.env.PATH || ''
});

execSync('npx electron-builder --win -c electron-builder.config.js', {
  stdio: 'inherit',
  env: buildEnv
});
