import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function adbApiPlugin() {
  return {
    name: 'adb-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/ipc', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', (chunk: any) => (body += chunk));
        req.on('end', async () => {
          try {
            const { channel, args = [] } = JSON.parse(body || '{}');

            const ts = Date.now();
            const deviceManager = await import(`./dist/electron/adb/deviceManager.mjs?t=${ts}`);
            const adbManager = await import(`./dist/electron/adb/adbManager.mjs?t=${ts}`);
            const commandExecutor = await import(`./dist/electron/adb/commandExecutor.mjs?t=${ts}`);
            const connectionManager = await import(`./dist/electron/adb/connectionManager.mjs?t=${ts}`);


            let result: any = { success: true };

            switch (channel) {
              case 'adb:get-devices':
                try {
                  const devices = await deviceManager.listDevices();
                  result = { success: true, data: devices };
                } catch (err: any) {
                  const adbError = adbManager.getAdbLocateError();
                  result = { success: false, error: adbError || err.message, isAdbMissing: !!adbError };
                }
                break;

              case 'adb:get-device-info':
                try {
                  const info = await deviceManager.getDeviceInfo(args[0]);
                  result = { success: true, data: info };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:restart-adb':
                try {
                  await adbManager.restartAdbServer();
                  result = { success: true };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:generate-qr':
                try {
                  const data = await connectionManager.generateQrSession();
                  result = { success: true, data };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:pair-wireless':
                try {
                  const msg = await connectionManager.pairWirelessDevice(args[0]);
                  result = { success: true, data: msg };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:connect-wireless':
                try {
                  const msg = await connectionManager.connectWirelessDevice(args[0]);
                  result = { success: true, data: msg };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:disconnect-wireless':
                try {
                  const msg = await connectionManager.disconnectWirelessDevice(args[0]);
                  result = { success: true, data: msg };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:enable-tcpip':
                try {
                  const data = await connectionManager.enableUsbTcpip(args[0], args[1]);
                  result = { success: true, data };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:get-device-ip':
                try {
                  const ip = await connectionManager.getDeviceIp(args[0]);
                  result = { success: true, data: ip };
                } catch (err: any) {
                  result = { success: false, error: err.message };
                }
                break;

              case 'adb:home':
                await commandExecutor.sendHome(args[0]);
                break;
              case 'adb:back':
                await commandExecutor.sendBack(args[0]);
                break;
              case 'adb:recent':
                await commandExecutor.sendRecent(args[0]);
                break;
              case 'adb:power':
                await commandExecutor.sendPower(args[0]);
                break;
              case 'adb:unlock':
                await commandExecutor.unlockDevice(args[0], args[1]);
                break;
              case 'adb:call-make':
                await commandExecutor.makeCall(args[0], args[1]);
                break;
              case 'adb:call-answer':
                await commandExecutor.answerCall(args[0]);
                break;
              case 'adb:call-end':
                await commandExecutor.endCall(args[0]);
                break;
              case 'adb:get-call-state':
                result = { success: true, data: await commandExecutor.getCallState(args[0]) };
                break;
              case 'adb:get-contacts':
                result = { success: true, data: await commandExecutor.getContacts(args[0]) };
                break;
              case 'adb:set-audio-route':
                await commandExecutor.setAudioRoute(args[0], args[1]);
                break;
              case 'adb:mute-mic':
                await commandExecutor.toggleMuteMic(args[0], args[1]);
                break;
              case 'adb:send-dtmf':
                await commandExecutor.sendDtmfTone(args[0], args[1]);
                break;
              case 'adb:tap':
                await commandExecutor.tapScreen(args[0], args[1], args[2]);
                break;
              case 'adb:swipe':
                await commandExecutor.swipeScreen(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
              case 'adb:input-text':
                await commandExecutor.inputText(args[0], args[1]);
                break;
              case 'adb:volume-up':
                await commandExecutor.sendVolumeUp(args[0]);
                break;
              case 'adb:volume-down':
                await commandExecutor.sendVolumeDown(args[0]);
                break;
              case 'adb:volume-mute':
                await commandExecutor.sendVolumeMute(args[0]);
                break;
              case 'adb:media-play-pause':
                await commandExecutor.sendMediaPlayPause(args[0]);
                break;
              case 'adb:media-next':
                await commandExecutor.sendMediaNext(args[0]);
                break;
              case 'adb:media-prev':
                await commandExecutor.sendMediaPrevious(args[0]);
                break;
              case 'adb:get-brightness':
                result = { success: true, data: await commandExecutor.getBrightness(args[0]) };
                break;
              case 'adb:set-brightness':
                await commandExecutor.setBrightness(args[0], args[1]);
                break;
              case 'adb:reboot':
                await commandExecutor.rebootDevice(args[0]);
                break;
              case 'adb:screenshot':
                result = { success: true, data: await commandExecutor.takeScreenshot(args[0]) };
                break;
              case 'adb:shell':
                result = { success: true, data: await commandExecutor.runShellCommand(args[0], args[1]) };
                break;
              case 'adb:list-packages':
                result = { success: true, data: await commandExecutor.listPackages(args[0], args[1]) };
                break;
              case 'adb:launch-app':
                await commandExecutor.launchApp(args[0], args[1]);
                break;
              case 'adb:force-stop':
                await commandExecutor.forceStopApp(args[0], args[1]);
                break;
              case 'adb:clear-data':
                await commandExecutor.clearAppData(args[0], args[1]);
                break;
              case 'adb:uninstall-app':
                await commandExecutor.uninstallApp(args[0], args[1]);
                break;
              case 'adb:get-file-preview': {
                const fileExplorerService = await import(`./dist/electron/services/fileExplorerService.mjs?t=${ts}`);
                result = { success: true, data: await fileExplorerService.getFilePreview(args[0], args[1]) };
                break;
              }
              case 'adb:list-directory': {
                const fileExplorerService = await import(`./dist/electron/services/fileExplorerService.mjs?t=${ts}`);
                result = { success: true, data: await fileExplorerService.listDirectory(args[0], args[1]) };
                break;
              }
              case 'adb:create-directory': {
                const fileExplorerService = await import(`./dist/electron/services/fileExplorerService.mjs?t=${ts}`);
                await fileExplorerService.createDirectory(args[0], args[1]);
                break;
              }
              case 'adb:delete-file': {
                const fileExplorerService = await import(`./dist/electron/services/fileExplorerService.mjs?t=${ts}`);
                await fileExplorerService.deleteRemoteFile(args[0], args[1]);
                break;
              }
              case 'adb:rename-file': {
                const fileExplorerService = await import(`./dist/electron/services/fileExplorerService.mjs?t=${ts}`);
                await fileExplorerService.renameRemoteFile(args[0], args[1], args[2]);
                break;
              }

              case 'adb:push-file':
                await commandExecutor.pushFile(args[0], args[1], args[2] || '/storage/emulated/0/Download/');
                break;
              case 'adb:push-paths':
                for (const p of (args[1] || [])) {
                  await commandExecutor.pushFile(args[0], p, args[2] || '/storage/emulated/0/Download/');
                }
                break;
              case 'adb:pull-file':
              case 'adb:pull-path-to':
                await commandExecutor.pullFile(args[0], args[1], args[2]);
                break;
              case 'adb:pause-transfer': {
                result = { success: adbManager.pauseActiveTransfer() };
                break;
              }
              case 'adb:resume-transfer': {
                result = { success: adbManager.resumeActiveTransfer() };
                break;
              }
              case 'adb:cancel-transfer': {
                result = { success: adbManager.cancelActiveTransfer() };
                break;
              }

              default:
                result = { success: false, error: `Unknown channel: ${channel}` };
            }


            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), adbApiPlugin()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/dist/**'],
    },
  },
});
