# 📦 AdVard — Complete Installation & Setup Guide

This guide provides step-by-step instructions to set up **Android Platform Tools (`adb` & `fastboot`)**, enable **USB Debugging** on your phone, install **AdVard**, and resolve macOS Gatekeeper or Windows Defender security warnings.

---

## 🛠️ Step 1: Installing Required Android Platform Tools (`adb` & `fastboot`)

AdVard connects to your Android devices using the official Android SDK `adb` and `fastboot` utilities. Before launching AdVard, ensure these tools are installed on your computer.

### 🍏 macOS Platform Tools Installation

#### Option A: Via Homebrew (Recommended)
If you have [Homebrew](https://brew.sh/) installed, open **Terminal** and run:

```bash
brew install android-platform-tools
```

#### Option B: Official Manual Download
1. Download the [Android SDK Platform-Tools for Mac](https://dl.google.com/android/repository/platform-tools-latest-darwin.zip).
2. Extract the downloaded `platform-tools` folder.
3. Move the folder to your preferred location (e.g. `~/Library/Android/sdk/platform-tools`).
4. Add the folder to your shell PATH by adding this line to your `~/.zshrc` or `~/.bash_profile`:
   ```bash
   export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
   ```

---

### 🪟 Windows Platform Tools Installation

#### Option A: Via Chocolatey
If you use [Chocolatey](https://chocolatey.org/), open **Command Prompt** or **PowerShell** as Administrator and run:

```cmd
choco install adb
```

#### Option B: Via Scoop
If you use [Scoop](https://scoop.sh/), run:

```powershell
scoop install adb
```

#### Option C: Official Manual Download
1. Download the [Android SDK Platform-Tools for Windows](https://dl.google.com/android/repository/platform-tools-latest-windows.zip).
2. Extract the `.zip` file to a folder like `C:\platform-tools`.
3. Add `C:\platform-tools` to your system Environment Variables (`PATH`).

---

### ✅ Verifying Platform Tools Setup
Open your terminal (macOS Terminal or Windows Command Prompt / PowerShell) and run:

```bash
adb version
fastboot --version
```

If both commands return version information, your platform tools are ready!

---

## 📱 Step 2: Setting Up Your Android Phone

To allow AdVard to communicate with your device, enable **USB Debugging**:

1. Open **Settings** on your Android device.
2. Navigate to **About Phone** (or **System** → **About Phone**).
3. Tap **Build Number** **7 times** until you see the prompt *"You are now a developer!"*.
4. Go back to **Settings** → **System** → **Developer Options**.
5. Toggle **USB Debugging** to **ON**.
6. When connecting your phone to your computer via USB for the first time, check *"Always allow from this computer"* on your phone's screen and tap **Allow**.

---

## 💻 Step 3: Installing & Launching AdVard

### 🍏 macOS Setup
1. Download `AdVard-4.1.2.dmg` or `AdVard-4.1.2-mac.zip`.
2. Double-click the `.dmg` file to open it.
3. Drag **AdVard.app** into your **Applications** folder.

### 🪟 Windows Setup
1. Download `AdVard Setup 4.1.2.exe`.
2. Double-click the installer and follow the prompt instructions.

---

## ⚠️ Step 4: Resolving macOS Gatekeeper Warnings

Because AdVard is an open-source application and is not signed with a paid Apple Developer ID certificate, macOS Gatekeeper may show a security notice such as:
> *"AdVard can’t be opened because it is from an unidentified developer"* or *"macOS cannot verify that this app is free from malware."*

I have outlined 3 quick ways to bypass this warning:

### Method 1: Right-Click Open (Quickest GUI Method)
1. Open your **Applications** folder in Finder.
2. **Right-click** (or hold <kbd>Control</kbd> and click) on **AdVard**.
3. Click **Open** in the menu.
4. Click **Open** in the popup dialog. macOS will save this exception, allowing normal double-click launches in the future.

### Method 2: System Settings Security Approval
1. Attempt to open AdVard once so macOS logs the security block.
2. Open **System Settings** → **Privacy & Security**.
3. Scroll down to the **Security** section.
4. Locate the message: *"AdVard was blocked from use because it is not from an identified developer."*
5. Click **Open Anyway** and authenticate with your Mac password.

### Method 3: Terminal Command (One-line Fix)
Open **Terminal** and remove the quarantine attribute directly:

```bash
sudo xattr -rd com.apple.quarantine /Applications/AdVard.app
```

Or run:

```bash
xattr -cr /Applications/AdVard.app
```

---

## 🛡️ Step 5: Resolving Windows Defender SmartScreen Warnings

On Windows, if Windows Defender SmartScreen displays *"Windows protected your PC"*:

1. Click **More info** on the SmartScreen dialog.
2. Click **Run anyway**.
