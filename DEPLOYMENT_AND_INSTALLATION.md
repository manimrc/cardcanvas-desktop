# CardCanvas: Complete Deployment & Installation Guide

Welcome to the **CardCanvas** installation guide. CardCanvas is designed to be highly flexible, allowing you to run it as a standalone, offline desktop application or host it on your own server for web access. 

This document is written for users of all technical backgrounds. You do not need to be a programmer to install and use CardCanvas.

Choose the setup that best fits your needs:
1. **[Native Desktop Application](#option-1-native-desktop-application)** (Recommended for everyday use on Mac, Windows, or Linux)
2. **[Self-Hosted Web Application](#option-2-self-hosted-web-version-via-docker)** (Recommended for servers, NAS, and accessing via Android/iOS devices)
3. **[Development Mode](#option-3-development-mode)** (For developers modifying the code)

---

## Option 1: Native Desktop Application

The absolute best way to experience CardCanvas is by installing it directly on your computer. Once installed, it behaves exactly like any other software (like Google Chrome or Microsoft Word)—you just double-click the icon to open it. **You do not need to use the terminal to run the app after it is installed.**

To get the installer file (`.dmg` for Mac or `.exe` for Windows), you need to "build" the application once.

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

*You can now close the terminal. Open CardCanvas from your Applications or Start Menu anytime!*

---

## Option 2: Self-Hosted Web Version via Docker

If you want to use CardCanvas on your **Android phone, iPhone, tablet**, or access it from multiple computers, the best method is to use Docker. Docker packages the application into a secure "container" that runs a local website on your network.

### Step 1: Install Docker
You will need Docker Desktop installed on the computer that will act as the "host" or server.
- **Docker Desktop:** [Download & Install Here](https://www.docker.com/products/docker-desktop/)

### Step 2: Start the Container
1. Open your **Terminal** or **Command Prompt** and navigate to the `cardcanvas` folder.
2. Build the Docker container by running:
   ```bash
   docker build -t cardcanvas-web .
   ```
3. Once the build is complete, start the application by running:
   ```bash
   docker run -p 3000:3000 -v cardcanvas_data:/app/data -d cardcanvas-web
   ```
   
   **What does this command do?**
   - `-p 3000:3000`: Opens a doorway (port 3000) so you can access the app.
   - `-v cardcanvas_data:/app/data`: Creates a permanent storage vault. If your computer restarts, your boards and images will remain safe.
   - `-d`: Runs the app silently in the background.

### Step 3: Access from Any Device
- **On the Host Computer:** Open your web browser and go to `http://localhost:3000`
- **On your Phone / Tablet (Android or iOS):** Ensure your mobile device is connected to the same Wi-Fi network as the host computer. Open your mobile web browser and type the host computer's local IP address followed by `:3000` (for example: `http://192.168.1.15:3000`).

---

## Option 3: Development Mode

If you are a programmer looking to modify the code, you will want to run the application in "Development Mode." This mode enables "hot-reloading," meaning anytime you save a file, the application instantly updates on your screen.

**To code the Native Desktop App:**
```bash
npm run tauri dev
```

**To code the Web App version (No desktop features):**
```bash
npm run dev
```

---

## Frequently Asked Questions (FAQ)

**Is my data private?**
Yes. CardCanvas does not connect to the cloud. If you use the Native Desktop Application, your data (whiteboards, text, and media) is saved directly to a local SQLite database on your hard drive. If you use Docker, your data is saved strictly inside your local Docker volume. 

**Can I download CardCanvas directly from the Google Play Store or Apple App Store?**
Not currently. While the underlying technology (Tauri) supports mobile applications, CardCanvas is currently optimized for desktop-sized screens. To use it perfectly on your mobile device today, we highly recommend following the **Option 2 (Docker)** instructions to access it via your mobile web browser.

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

**Docker (Web Version):**
If you are using Docker, your data is stored inside the `cardcanvas_data` volume you created in the run command. You can locate it on your host system using Docker Desktop or by running `docker volume inspect cardcanvas_data`.
