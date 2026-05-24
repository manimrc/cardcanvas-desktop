# CardCanvas Desktop v2

CardCanvas Desktop v2 is a modern, offline-first, native enterprise visual workspace for organizing cards, notes, links, and media on an infinite canvas. It is powered by **Tauri v2**, **Next.js**, and an **embedded Rust Axum backend** running an **embedded SQLite database**.

Unlike traditional web-wrapped shells, CardCanvas Desktop v2 runs the entire application stack locally on your computer—requiring zero Docker configuration, zero external databases, and zero server hosting.

---

## 🛠️ Architecture

CardCanvas Desktop v2 uses a native multi-threaded architecture:

1. **Frontend**: Next.js 16 (React) client-side SPA served directly inside Tauri's high-performance native OS webview.
2. **Embedded Backend**: High-performance Rust API server using Axum, running in a background thread spawned within Tauri's application lifecycle.
3. **Database**: Embedded SQLite database configured with **WAL (Write-Ahead Logging)** mode for concurrent, non-blocking desktop reads and writes.
4. **Storage**: Local filesystem media storage directory managed natively in the user's platform App Data folder.

```text
Tauri Desktop App
├── Next.js Webview (Frontend SPA)
├── Embedded Axum Thread (Rust Backend API)
├── SQLite Database File (local storage)
└── Local Uploads Directory (filesystem media)
```

---

## 📂 Project Structure

```text
.
├── cardcanvas-frontend/    # Next.js Frontend
│   ├── src-tauri/          # Tauri v2 native desktop wrapper (Rust)
│   │   ├── src/lib.rs      # Tauri app lifecycle & native command handlers
│   │   └── tauri.conf.json # Tauri window, build, and package config
│   ├── src/                # Next.js react pages, components, adapters
│   └── package.json        # Frontend & Tauri scripts
├── cardcanvas-backend/     # Rust Axum backend (as a library & standalone CLI)
│   ├── src/
│   │   ├── domain/         # Modular Business Domains (Auth, Cards, Workspaces, etc.)
│   │   ├── db.rs           # SQLite pool creation and WAL options
│   │   ├── lib.rs          # Reusable library entry points for Tauri integration
│   │   └── main.rs         # Standalone backend entry point
│   └── Cargo.toml          # Rust dependencies (sqlx with SQLite)
└── scripts/                # Local utility scripts (deploy, backup)
```

---

## 🚀 Getting Started (Development)

To run the native desktop application in development mode:

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18+)
- **Rust toolchain** (installed via [Rustup](https://rustup.rs/))
- **macOS Xcode Command Line Tools** (run `xcode-select --install` in terminal)

### 2. Startup Command
Navigate to the frontend folder, install npm packages, and start the Tauri development loop:
```bash
cd cardcanvas-frontend
npm install
npm run tauri dev
```

Tauri will:
- Spin up the Next.js frontend dev server on `http://localhost:3000`.
- Compile the Rust backend code.
- Automatically resolve your OS App Data folder:
  - **macOS**: `~/Library/Application Support/com.cardcanvas.desktop.v2/`
  - **Linux**: `~/.local/share/com.cardcanvas.desktop.v2/`
- Create `/db/cardcanvas.db` and `/media/` directories inside the App Data path.
- Run database migrations on SQLite.
- Start the Axum API server in the background on port `8080`.
- Launch the native desktop window.

---

## 📦 Packaging and Builds

To bundle CardCanvas Desktop v2 into an installable native installer (e.g. `.dmg` or `.app` on macOS, `.msi` on Windows):

Run the deploy/packaging script:
```bash
./scripts/deploy.sh
```
Or build directly via npm:
```bash
cd cardcanvas-frontend
npm run tauri build
```
The output installers will be compiled and placed in:
`cardcanvas-frontend/src-tauri/target/release/bundle/`

---

## 💾 Local Backups

Since CardCanvas is fully offline-first, your database and media files are stored locally. To backup your visual boards, cards, and media:

Run the backup script:
```bash
./scripts/backup.sh
```
The script will stagelessly copy your local SQLite database and media folders from your system's Application Support path, compress them, and save the archive into:
`~/cardcanvas-backups/cardcanvas_backup_[timestamp].tar.gz`

---

## 🔐 Security & Desktop Best Practices

- **Single-Session Secrets**: The backend JWT secret is generated as a secure, random UUID on app startup. It is stored in memory and refreshed each time the app is launched.
- **Strict CORS Origin Lock**: The Axum backend is locked down to only accept HTTP requests initiated from Tauri's native webview protocol origins (`tauri://localhost` and `http://tauri.localhost`), preventing other local desktop apps from accessing your API.
- **WAL Journaling**: The SQLite database uses Write-Ahead Logging to enable safe, fast write operations from the application while keeping UI threads smooth and fluid.
