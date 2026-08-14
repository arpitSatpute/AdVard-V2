/**
 * Electron Builder Configuration for AdVard
 * @type {import('electron-builder').Configuration}
 */
export default {
  appId: 'com.advard.app',
  productName: 'AdVard',
  directories: {
    output: 'release'
  },
  files: [
    'dist/electron/**/*',
    'dist/renderer/**/*',
    'package.json'
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: 'dmg',
    identity: null,
    hardenedRuntime: false,
    gatekeeperAssess: false
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    forceCodeSigning: false,
    signExecutable: false,
    verifyUpdateCodeSignature: false
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'AdVard',
    artifactName: 'AdVard Setup ${version}.exe',
    guid: '7e2b2650-e221-4f18-a621-97b770514101'
  },
  portable: {
    artifactName: 'AdVard ${version}.exe',
    guid: '7e2b2650-e221-4f18-a621-97b770514101'
  }
};
