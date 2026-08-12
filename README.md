# 📱 AdVard — Android Desktop Control & File Management Suite

**AdVard** is an all-in-one, high-performance desktop application designed to control, manage, mirror, and transfer files to and from Android smartphones over **USB** or **Wireless ADB (Wi-Fi)**.

Built with **Electron**, **React 19**, **TypeScript**, and **Vite**, AdVard provides a sleek, modern desktop interface that communicates directly with native `adb` binaries on macOS, Windows, and Linux. **No third-party app or APK installation is required on your phone.**

---

## 🌟 Application Description

AdVard bridges your computer and Android smartphone into a single unified workspace. Whether you are a developer, power user, or general user, AdVard lets you interact with your phone directly from your laptop or desktop:

- **Browse & Transfer Files**: High-speed file explorer with drag-and-drop laptop-to-phone uploads, one-click downloads, live media previews, and live progress control.
- **Mirror & Control Display**: Low-latency screen mirroring with interactive mouse click-to-tap, drag-to-swipe, and standalone window pop-out.
- **Wirelessly Pair & Connect**: Guide-driven Wireless ADB pairing (Android 11+) with QR code generation and direct Wi-Fi connections.
- **Manage Calls & Apps**: Place phone calls, answer/end incoming calls, inspect installed applications, install APKs, and execute interactive shell commands.

---

## 🛠️ How It Works (Architecture)

AdVard operates by leveraging Android's built-in **ADB (Android Debug Bridge) daemon** (`adbd`) that runs inside the Android OS kernel:

```
┌─────────────────────────────────────────────────────────────┐
│                       AdVard Desktop Application             │
│   ┌────────────────────────┐    ┌───────────────────────┐   │
│   │ React 19 Frontend UI   │ ── │ Electron Node IPC     │   │
│   └────────────────────────┘    └───────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Native ADB Spawn)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Host OS ADB Binary                       │
│           (macOS / Windows / Linux Platform Tools)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ USB Cable or Wi-Fi (TCP 5555)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Android Smartphone                        │
│               Native OS ADB Daemon (`adbd`)                 │
└─────────────────────────────────────────────────────────────┘
```

Because communication happens natively through ADB protocol commands, **you never need to install background apps, agents, or services on your Android device**.

---

## 🚀 Key Features

### 📂 1. Advanced File Sharing & Phone Explorer
- **Full-Featured Phone File Explorer**: Navigate internal storage (`/storage/emulated/0/`) with breadcrumb navigation, live search, list & grid views, and file metadata inspectors.
- **Drag-and-Drop Sharing**: Drag files or folders from your laptop and drop them onto AdVard to upload them directly to your phone.
- **Strict Downloads Path Routing**: Uploaded items automatically land in your phone's **Downloads** folder (`/storage/emulated/0/Download/`).
- **Current Timestamp Update (`touch -c`)**: Sets file modified dates to the current time (**Today**) so uploaded items appear immediately at the top of your phone's *Recent / Today* lists.
- **Modern MediaStore Indexing (`cmd media_provider scan-file`)**: Forces Android MediaStore to index new photos, videos, and documents instantly for Gallery and Photos apps.
- **Live Media & Code Preview**: Preview images, videos, audio files, text, and code files directly inside AdVard.
- **Emoji & Special Character Support**: Complete support for filenames containing emojis (`🔗 ⬇️`), spaces, and unicode symbols.

### 📊 2. Live Transfer Progress & Background Control Dock
- **Real-Time 0%–100% Progress Bar**: Live byte-stream percentage tracking.
- **Interactive Transfer Controls**:
  - **Pause ⏸️**: Temporarily freeze active file transfers (`SIGSTOP`).
  - **Resume ▶️**: Continue streaming file bytes (`SIGCONT`).
  - **Cancel 🛑**: Instantly terminate active file transfers (`SIGKILL`).

### 🖥️ 3. Screen Mirroring & Touch Remote Control
- **Interactive Live Mirroring**: Stream your phone's screen directly to your desktop.
- **Mouse Touch Controls**: Click to tap, drag to swipe, and scroll.
- **Standalone Cast Window**: Pop out screen mirroring into a dedicated, resizable window for uninterrupted multitasking.

### 📶 4. Dual Connection Manager (USB & Wireless ADB)
- **Automatic USB Detection**: Plugs in and detects attached devices automatically every 2 seconds.
- **Guided Wireless ADB (Android 11+)**: Pair wirelessly via 6-digit code or QR code generation (`adb pair IP:Port`).
- **Direct Wireless Connect**: Connect and disconnect over Wi-Fi without needing a USB cable.

### 📞 5. Phone Call & Communication Manager
- **Dialer & Call Control**: Dial phone numbers, trigger calls, answer incoming calls, and end active calls from your computer.

### 🚀 6. Application Manager & Launcher
- **App Inspector**: View system and third-party applications with package names.
- **App Actions**: Launch apps, force stop, clear app data, install APKs, and uninstall packages.

### 💻 7. Interactive Shell Terminal
- **Embedded Terminal**: Execute raw `adb shell` commands directly with command history logging and stdout/stderr output.

### 📋 8. Clipboard Sync & Notification Center
- **Two-Way Clipboard Sync**: Read and push text between laptop clipboard and phone clipboard.
- **Notification Inspector**: View active system notifications sent to your Android device.

---

## 📦 Prerequisites & System Requirements

### 1. Enable USB Debugging on your Android Phone
1. Open **Settings** > **About Phone**.
2. Tap **Build Number** 7 times to enable **Developer Options**.
3. Go to **Settings** > **Developer Options**.
4. Enable **USB Debugging** (and **Wireless Debugging** for Wi-Fi connection).

---

### 2. Install Android Platform Tools (ADB) on your Computer

AdVard relies on the host system's `adb` binary. If you do not already have ADB installed, run the installation command for your operating system:

#### 🍏 macOS (via Homebrew)
```bash
brew install android-platform-tools
```

#### 🪟 Windows (via Winget or Chocolatey)
```cmd
winget install Google.PlatformTools
```
*Or using Chocolatey:* `choco install adb`

#### 🐧 Linux (Ubuntu / Debian)
```bash
sudo apt update && sudo apt install -y android-tools-adb
```

#### 🐧 Linux (Arch Linux)
```bash
sudo pacman -S android-tools
```

---

## 📥 Installation Guide

Download the latest pre-compiled binary for your operating system from the **Releases** page:

| Operating System | Installer Format | Binary File |
| :--- | :--- | :--- |
| **macOS** | DMG / Zip | `AdVard-3.2.5.dmg` / `AdVard-3.2.5-mac.zip` |
| **Windows** | Executable Installer | `AdVard Setup 3.2.5.exe` |
| **Linux** | AppImage / Debian | `AdVard-3.2.5.AppImage` / `advard_3.2.5_amd64.deb` |

---

## 💻 Building From Source

If you want to build AdVard locally or contribute to development:

### 1. Clone the Repository
```bash
git clone https://github.com/arpitSatpute/AdVard-V2.git
cd AdVard-V2/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Mode
```bash
npm run dev
```

### 4. Build Production Binaries
```bash
# Build desktop packages for current OS
npm run build && npx electron-builder

# Platform-specific builds
npm run dist:mac    # Build macOS DMG
npm run dist:win    # Build Windows EXE
npm run dist:linux  # Build Linux AppImage/DEB
```

---

## ⚙️ Technology Stack

- **Frontend Core**: React 19, TypeScript, Vite
- **Desktop Runtime**: Electron 34
- **Styling & UI**: TailwindCSS, Lucide Icons
- **Backend Bridge**: Node.js `child_process.spawn` native IPC bridge
- **Communication Engine**: Android Debug Bridge (ADB CLI)

---

## 📄 License

AdVard is open-source software licensed under the **MIT License**. Created by [Arpit Satpute](https://github.com/arpitSatpute).
