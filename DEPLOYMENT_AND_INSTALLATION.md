# CardCanvas: Complete Deployment & Installation Guide

Welcome to the **CardCanvas** installation guide. CardCanvas is designed to be highly flexible, allowing you to run it as a standalone, offline desktop application.

This document is written for users of all technical backgrounds. You do not need to be a programmer to install and use CardCanvas.

Choose the setup that best fits your needs:
1. **[Native Desktop Application](#option-1-native-desktop-application)** (Recommended for everyday use on Mac, Windows, or Linux)
2. **[Development Mode](#option-2-development-mode)** (For developers modifying the code)

---

## Option 1: Native Desktop Application

The absolute best way to experience CardCanvas is by installing it directly on your computer. Once installed, it behaves exactly like any other software.

To get the installer file (`.dmg` for Mac or `.exe` for Windows), you can either download the latest release from GitHub or build it yourself.

### Step 1: Install Prerequisites
Your computer needs two free tools to compile the application from its source code:
1. **Node.js** (Handles the user interface): [Download & Install Here](https://nodejs.org/)
2. **Rust** (Handles the fast, secure backend): [Download & Install Here](https://rustup.rs/)

### Step 2: Build the Application
Once the prerequisites are installed, follow these steps to generate your installer:

1. Open your computer's **Terminal** (macOS/Linux) or **Command Prompt / PowerShell** (Windows).
2. Navigate to the `cardcanvas` folder.
3. Type the following command and press Enter:
   ```bash
   npm run tauri build
   ```
4. *Wait a few minutes.* The compiler is creating a highly optimized, standalone application for your specific operating system.

### Step 3: Install and Play
Once the build process finishes, your application is ready! 
- **Apple macOS Users:** Open the folder `src-tauri/target/release/bundle/macos/`. You will find a `CardCanvas.app` and a `CardCanvas.dmg`. Double-click the `.dmg` and drag CardCanvas into your Applications folder.
- **Windows Users:** Open the folder `src-tauri/target/release/bundle/msi/`. You will find a `.msi` or `.exe` installer. Double-click it to install CardCanvas to your system.

---

## Option 2: Development Mode

If you are a programmer looking to modify the code, you will want to run the application in "Development Mode." This mode enables "hot-reloading," meaning anytime you save a file, the application instantly updates on your screen.

**To code the Native Desktop App:**
```bash
npm run tauri dev
```

**To code the Frontend App version (No native features):**
```bash
npm run dev
```

---

## Frequently Asked Questions (FAQ)

**Is my data private?**
Yes. CardCanvas does not connect to the cloud. Your data (whiteboards, text, and media) is saved directly to a local SQLite database on your hard drive.

**Can I download CardCanvas directly from the Google Play Store or Apple App Store?**
Not currently. CardCanvas is currently optimized for desktop-sized screens.

**I get an error saying "command not found" when trying to build.**
This usually means Node.js or Rust did not install correctly. Try restarting your computer or terminal after installing the prerequisites to ensure your system recognizes the new tools.

---

## 💾 How to Backup & Transfer Your Data

If you are moving to a new computer or just want to safely back up your boards, copying your data is as easy as copying a single folder! CardCanvas stores all of your whiteboards, text, and media inside a hidden application data folder.

**To transfer your data to a new computer:**
1. Open the CardCanvas data folder on your current computer (paths listed below).
2. Copy the entire `com.cardcanvas.app` folder to a USB drive or cloud storage.
3. On your *new* computer, install and open CardCanvas once so it creates its initial folders, then close the app.
4. Replace the new, empty `com.cardcanvas.app` folder with the one you copied. When you open the app, everything will be exactly as you left it!

### 📍 Where to find your Data Folder

**macOS:**
1. Open **Finder**.
2. Press `Cmd + Shift + G` and paste: `~/Library/Application Support/com.cardcanvas.app`

**Windows:**
1. Open the **File Explorer**.
2. Click the address bar at the top, paste the following, and press Enter: `%APPDATA%\com.cardcanvas.app`

**Linux:**
Navigate to `~/.local/share/com.cardcanvas.app`
