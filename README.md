# AdVard — Android USB Controller

AdVard is a cross-platform desktop developer tool and device manager built to remotely control Android smartphones connected via USB ADB (Android Debug Bridge).

It features a high-performance **React + Vite + TypeScript** interface running inside **Electron**, backed by a secure **Node.js process** that communicates directly with `adb` binaries on macOS, Windows, and Linux.

---

## Key Features

- **Automated USB Device Detection**: Real-time polling (every 2s) to detect attached USB Android devices and display connection statuses (`Connected`, `Unauthorized`, `Offline`).
- **Device Specifications & Status**: Inspect Model, Manufacturer, Android Version, SDK Version, Battery Level, Screen Resolution, and DPI Density.
- **Hardware & Navigation Controls**: Remotely trigger `Home`, `Back`, `Recent Apps`, `Power Button`, and `Reboot` actions.
- **Device Unlock**: Remotely wake up the display, send swipe-up unlock gestures, and input security PINs.
- **Phone Call Management**: Dial numbers, trigger phone calls, answer incoming calls, and hang up/end active calls directly from your computer.
- **Interactive Live Screen Mirroring**: Real-time screen mirroring window with interactive mouse controls:
  - **Mouse Click** → Translates to accurate pixel `tap` on Android.
  - **Mouse Drag** → Translates to smooth `swipe` gestures on Android.
- **Volume, Media Playback & Brightness**:
  - Volume Up, Volume Down, Mute/Unmute.
  - Media Play, Pause, Next Track, Previous Track.
  - Screen Brightness slider (0–255).
- **Application Launcher & Manager**:
  - Filter by **User Installed** (`-3`), **System Apps** (`-s`), or **All Apps**.
  - 1-Click Launch app.
  - Force Stop app (`am force-stop`).
  - Clear App Data (`pm clear`).
  - Install custom `.apk` files via native desktop file picker.
  - Uninstall apps.
- **Integrated ADB Shell Terminal**: Interactive shell console with history navigation (↑/↓), stdout/stderr formatting, exit code badges, output clearing, and 1-click output copying.
- **High-Resolution Screenshots**: Capture device screen in 1 click and save PNG image locally.

---

## Tech Stack & Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    React 19 + TypeScript                  │
│               Tailwind CSS (Dark Mode Design)             │
└─────────────────────────────┬─────────────────────────────┘
                              │ Secure Electron IPC
                              ▼
┌───────────────────────────────────────────────────────────┐
│                   Electron Main Process                   │
│             (ContextIsolation enabled, sandboxed)         │
└─────────────────────────────┬─────────────────────────────┘
                              │ Node.js (child_process.spawn)
                              ▼
┌───────────────────────────────────────────────────────────┐
│                      ADB Layer                            │
│  (Locates platform-tools adb via PATH or SDK directories) │
└─────────────────────────────┬─────────────────────────────┘
                              │ USB Connection
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    Target Android Phone                   │
└───────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **Android Platform Tools (`adb`)** installed on host machine, or installed via Android Studio SDK.
   - macOS: `~/Library/Android/sdk/platform-tools/adb`
   - Windows: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
   - Linux: `~/Android/Sdk/platform-tools/adb`
3. **Android Device Settings**:
   - Enable **Developer Options** on Android (Settings → About Phone → Tap *Build Number* 7 times).
   - Enable **USB Debugging** (Settings → Developer Options → USB Debugging).
   - Connect phone via USB cable and tap **Allow USB Debugging** on prompt.

---

## How to Run

### Development Mode

To start Vite dev server and launch the Electron application concurrently:

```bash
npm run dev
```

### Production Build

To compile TypeScript and build the production bundle for both renderer and Electron:

```bash
npm run build
```

---

## Project Structure

```text
frontend/
├── electron/
│   ├── adb/
│   │   ├── adbLocator.ts       # Locates ADB in PATH / Android SDK
│   │   ├── adbManager.ts       # Spawn-based safe ADB runner
│   │   ├── commandExecutor.ts  # ADB commands (power, volume, calls, touch)
│   │   └── deviceManager.ts   # Device listing and property parser
│   ├── ipc/
│   │   ├── commandHandlers.ts  # Navigation, power, calls, touch IPC
│   │   ├── deviceHandlers.ts   # Device list & info IPC
│   │   ├── fileHandlers.ts     # Apps & file push/pull IPC
│   │   └── screenshotHandlers.ts # Screenshot capture & save IPC
│   ├── main.ts                 # Electron BrowserWindow entry point
│   └── preload.ts              # Secure contextBridge API definition
├── src/
│   ├── components/
│   │   ├── AppManager.tsx           # App list, launch, stop, clear data
│   │   ├── ConfirmDialog.tsx        # Modal confirmation
│   │   ├── DeviceActions.tsx        # Power, unlock, screenshot, reboot
│   │   ├── DeviceInfo.tsx           # Specs & battery grid
│   │   ├── DeviceSelector.tsx       # Left sidebar connected devices list
│   │   ├── MediaVolumeControls.tsx  # Volume, playback, brightness
│   │   ├── NavigationControls.tsx   # Home, Back, Recent buttons
│   │   ├── PhoneCallManager.tsx     # Dial, answer, end call controls
│   │   ├── ScreenMirror.tsx         # Interactive live screen & mouse touch
│   │   ├── ScreenshotViewer.tsx     # Zoomable screenshot viewer
│   │   ├── ShellTerminal.tsx        # Interactive ADB shell console
│   │   └── Toast.tsx                # Toast notifications
│   ├── hooks/                       # Custom React hooks (useDevices, etc.)
│   ├── pages/
│   │   └── Dashboard.tsx            # Main layout dashboard
│   ├── services/
│   │   └── electronApi.ts           # Typed wrapper around window.android
│   ├── types/
│   │   └── device.ts                # Shared TypeScript definitions
│   ├── App.tsx                      # Root component
│   └── index.css                    # Design system styles
└── README.md
```

---

## License

MIT License.
