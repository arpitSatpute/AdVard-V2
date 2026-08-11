# GitHub Release & Cross-Platform Distribution Guide for AdVard

To allow any user to download and run **AdVard** on macOS, Windows, or Linux without compiling code, follow this complete workflow to build installers and publish them to **GitHub Releases**.

---

## Part 1: How to Build Installers Locally

We use `electron-builder` to package AdVard into standalone binary installers (`.dmg`, `.exe`, `.AppImage`).

### 1. Build for macOS (`.dmg`)
Run on a Mac:
```bash
npm run dist:mac
```
- Output location: `release/AdVard-0.1.0.dmg` and `release/AdVard-0.1.0-mac.zip`

### 2. Build for Windows (`.exe` NSIS Installer)
Run on Windows (or via GitHub Actions):
```bash
npm run dist:win
```
- Output location: `release/AdVard Setup 0.1.0.exe`

### 3. Build for Linux (`.AppImage` / `.deb`)
Run on Linux (or via GitHub Actions):
```bash
npm run dist:linux
```
- Output location: `release/AdVard-0.1.0.AppImage`

---

## Part 2: Automated Cross-Platform Builds with GitHub Actions

Since compiling Windows `.exe` and Linux `.AppImage` requires native operating systems, the best practice is to let **GitHub Actions** build all 3 OS binaries automatically whenever you push a version tag (e.g. `v0.1.0`) to GitHub.

Create `.github/workflows/build-release.yml` in your repository:

```yaml
name: Build and Release AdVard

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Build Release for ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build and Package Electron App
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist
```

---

## Part 3: Step-by-Step Instructions to Push & Release on GitHub

### Step 1: Initialize Git & Push Repository
If you haven't pushed your code to GitHub yet:

```bash
git init
git add .
git commit -m "Initial commit of AdVard Android USB Controller"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/AdVard.git
git push -u origin main
```

### Step 2: Create a Release Tag
When you are ready to publish a downloadable version for users:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will trigger automatically, build `.dmg`, `.exe`, and `.AppImage`, and attach them directly to your **GitHub Release** page!

### Step 3: Manual Upload Alternative (If not using GitHub Actions)
If you build locally on Mac (`npm run dist:mac`):
1. Go to your repository on `github.com/YOUR_USERNAME/AdVard`.
2. Click **Releases** → **Draft a new release**.
3. Set tag version to `v0.1.0`.
4. Drag and drop `release/AdVard-0.1.0.dmg` (macOS installer) or `release/AdVard Setup 0.1.0.exe` into the binary attachment area.
5. Click **Publish release**.

---

## How End Users Run AdVard on Any Device

Once published to GitHub Releases:
1. End users navigate to your GitHub repository's **Releases** page: `https://github.com/YOUR_USERNAME/AdVard/releases`.
2. Users download the file matching their computer OS:
   - **Mac Users**: Download `AdVard-0.1.0.dmg`, open it, and drag `AdVard` to Applications.
   - **Windows Users**: Download `AdVard Setup 0.1.0.exe` and double-click to install.
   - **Linux Users**: Download `AdVard-0.1.0.AppImage`, run `chmod +x AdVard-0.1.0.AppImage`, and double-click to launch.
3. Users connect their Android phone via USB with **USB Debugging** enabled — AdVard immediately detects the phone offline with no extra software setup required!
