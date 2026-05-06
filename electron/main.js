const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;
let serverProcess = null;

const PORT = 3000;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Check if a port is available (nothing listening on it)
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Wait until the Next.js server is ready on the given port
 */
function waitForServer(port, maxWait = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > maxWait) {
          reject(new Error('Server startup timeout'));
        } else {
          setTimeout(check, 300);
        }
      });
      socket.on('timeout', () => {
        socket.destroy();
        setTimeout(check, 300);
      });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

/**
 * Start the Next.js standalone server
 */
function startNextServer() {
  // In production builds, electron-builder puts resources in app.asar or resources/
  // Check for extraResources first (unpacked), then fall back to asar path
  const resourcesPath = path.join(process.resourcesPath || '', 'standalone');
  const asarPath = path.join(app.getAppPath(), '.next', 'standalone');

  let serverDir;
  let serverPath;

  if (require('fs').existsSync(path.join(resourcesPath, 'server.js'))) {
    serverDir = resourcesPath;
    serverPath = path.join(resourcesPath, 'server.js');
  } else {
    serverDir = asarPath;
    serverPath = path.join(asarPath, 'server.js');
  }

  // Set the data directory to the user's app data folder
  const userDataPath = app.getPath('userData');

  // Use system Node.js (NOT Electron's binary) to run the Next.js server,
  // since better-sqlite3 native module is built for Node.js, not Electron's V8.
  const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node';

  serverProcess = spawn(nodeBin, [serverPath], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      // Tell our app where to store the database
      CARDCANVAS_DATA_DIR: path.join(userDataPath, 'data'),
    },
    cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Ensure the shell can find 'node' on PATH
    shell: false,
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Next.js] ${data.toString().trim()}`);
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Next.js server exited with code ${code}`);
    serverProcess = null;
  });
}

/**
 * Create the main browser window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'CardCanvas',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Modern frameless look with native title bar
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#0f0f13',
    show: false,
  });

  // Show window when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the Next.js app
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---- App lifecycle ----

app.whenReady().then(async () => {
  if (isDev) {
    // In dev mode, assume `npm run dev` is already running
    createWindow();
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } else {
    // Production: start the Next.js standalone server
    const portFree = await isPortFree(PORT);
    if (!portFree) {
      console.log(`Port ${PORT} is in use, trying to connect anyway...`);
    } else {
      startNextServer();
    }

    try {
      await waitForServer(PORT);
      createWindow();
    } catch (err) {
      console.error('Could not start Next.js server:', err);
      app.quit();
    }
  }

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps stay in the dock until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill the Next.js server when quitting
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});
