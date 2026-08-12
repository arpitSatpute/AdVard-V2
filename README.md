# AdVard — Android USB & Wireless ADB Controller

AdVard is a cross-platform desktop developer tool and device manager built to remotely control Android smartphones connected via USB or Wi-Fi using ADB (Android Debug Bridge).

It features a high-performance **React 19 + Vite + TypeScript** interface running inside **Electron**, backed by a secure **Node.js process** that communicates directly with `adb` binaries on macOS, Windows, and Linux.

---

## Key Features

- **Dual Connection Manager (USB & Wireless ADB)**:
  - **USB Connections**: Auto-detected via USB cable.
  - **Wireless ADB (Android 11+)**: Guided pairing UI (`adb pair IP:Port`) with 6-digit code entry, direct connect (`adb connect IP:Port`), and 1-click disconnect (`adb disconnect IP:Port`).
  - **Transport-Agnostic Engine**: All commands (Home, Screen Mirror, Shell, Apps, Calls) target devices seamlessly regardless of whether `connectionType` is `usb` or `wifi`.
- **Automated Device Discovery**: Unified polling (every 2s) for attached devices with status badges (`Connected`, `Unauthorized`, `Offline`).
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

## Architecture

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
                              │ Node.js Connection Manager
                              ▼
┌───────────────────────────────────────────────────────────┐
│                      ADB Layer                            │
│  (Locates platform-tools adb via PATH or SDK directories) │
└─────────────────────────────┬─────────────────────────────┘
              ┌───────────────┴───────────────┐
              │                               │
     USB ADB Connection             Wi-Fi ADB Connection
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    Target Android Phone                   │
└───────────────────────────────────────────────────────────┘
```

---

## Setup & Prerequisites

### Wireless ADB (Android 11+) Setup
1. Ensure your computer and Android phone are connected to the **same Wi-Fi network**.
2. On your phone: Open **Settings** → **Developer Options** → Enable **Wireless Debugging**.
3. Tap **"Pair device with pairing code"**.
4. In **AdVard**, click **`[+ Add Device]`** in the sidebar → Enter the displayed **IP Address**, **Pairing Port**, and **6-Digit Pairing Code** → Click **Pair Device**.
5. Switch to **Connect Device** → Enter the connection IP & Port → Click **Connect Device**. Your phone will appear under the Wi-Fi section!

### USB ADB Setup
1. Enable **Developer Options** on Android (Settings → About Phone → Tap *Build Number* 7 times).
2. Enable **USB Debugging** (Settings → Developer Options → USB Debugging).
3. Connect phone via USB cable and tap **Allow USB Debugging** on prompt.

---

## How to Run

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Build Installers

```bash
# macOS DMG Installer
npm run dist:mac

# Windows NSIS Installer (.exe)
npm run dist:win

# Linux AppImage (.AppImage)
npm run dist:linux
```

---

## License

MIT License.
