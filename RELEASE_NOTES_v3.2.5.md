# 🚀 AdVard Release Notes — v3.2.5

We are thrilled to announce **AdVard v3.2.5**, featuring our brand-new **Dedicated File Sharing System & Phone Explorer**, seamless Drag-and-Drop transfers, an interactive **Background Progress Loader Dock**, and instant Android MediaStore indexing!

---

## 🎉 Major New Feature: File Sharing & Phone Explorer System

AdVard now includes a complete, high-speed **File Sharing & Explorer System** designed for effortless file management between your Laptop and Android phone:

- 📂 **Full-Featured Phone File Explorer**: Browse your phone's internal storage with breadcrumb navigation, live search, list & grid views, and detailed file metadata inspectors.
- ⚡ **Drag & Drop Laptop-to-Phone Sharing**: Drag any files or folders directly from your laptop and drop them onto the app to transfer them straight to your phone.
- 💻 **Laptop Download Manager**: Select individual files, multiple items, or entire folders on your phone and pull them to your laptop with a single click.
- 🖼️ **Live Media & Document Preview Drawer**: Instantly preview photos, videos, audio, text, and code files stored on your phone directly inside AdVard before downloading.

---

## 📊 Live Transfer Progress & Controls Dock

- **Real-Time 0%–100% Progress Bar**: Live byte-level percentage tracking powered by ADB stream output.
- **Interactive Controls (Pause, Resume, Cancel)**:
  - **Pause ⏸️**: Temporarily freeze background transfers.
  - **Resume ▶️**: Continue streaming file bytes.
  - **Cancel 🛑**: Instantly terminate active file transfers.
- **Clean UI Layout**: Positioned right below the File Sharing window for convenient control.

---

## ⚙️ Core Enhancements

- **Strict Android Downloads Routing**: All files transferred from your laptop land directly inside your phone's **Downloads** folder (`/storage/emulated/0/Download/`).
- **Current Date & Time Timestamp Update (`touch -c`)**: Uploaded files carry the current timestamp (Today) so they appear right at the top of your phone's **Recent / Today** lists.
- **Modern Android 10+ MediaStore Indexing (`cmd media_provider scan-file`)**: Photos, videos, and documents appear immediately in Android Gallery, Photos, and Files apps.
- **Emoji & Unicode Filename Support**: Complete support for filenames containing emojis (`🔗 ⬇️`), parentheses, and special spaces.
- **macOS Metadata Filtering**: Skips macOS OS junk files (`Icon\r`, `.DS_Store`, `._*`, `Thumbs.db`).

---

## 📥 Installation & Build

Download the binary for your operating system:
- **macOS**: `AdVard-3.2.5.dmg` / `AdVard-3.2.5-mac.zip`
- **Windows**: `AdVard Setup 3.2.5.exe`
- **Linux**: `AdVard-3.2.5.AppImage` / `advard_3.2.5_amd64.deb`
