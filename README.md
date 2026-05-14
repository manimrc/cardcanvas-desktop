# CardCanvas

CardCanvas is a local-first visual workspace for organizing notes, links, images, PDFs, article clippings, and whiteboards. It is built as a native desktop app with Tauri, Next.js, React, Rust, and SQLite.

The app is designed for private, offline-first use. Your account, boards, cards, uploads, and whiteboards are stored locally on your machine.

## What It Does

- Create folders and boards for separate workspaces.
- Place rich cards anywhere on an infinite canvas.
- Add rich text, links, images, PDFs, and article-style cards.
- Upload media into the local SQLite store.
- Drag, resize, recolor, search, and tag cards.
- View all tagged cards across boards.
- Draw on a board-specific Excalidraw whiteboard.
- Export a board as a PNG image.
- Use local username/password accounts with recovery-key based password reset.

## Current App Shape

CardCanvas has evolved from the older browser-only version into a Tauri desktop application.

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Rust Tauri commands |
| Database | SQLite through Rust `rusqlite` |
| Rich text | TipTap |
| Whiteboard | Excalidraw |
| Styling | Vanilla CSS |

The frontend talks to the Rust backend through Tauri `invoke(...)` calls. The Rust side owns auth, workspace data, card persistence, media uploads, and whiteboard storage.

## Recommended Install

For normal use, build and install the native desktop app:

```bash
npm install
npm run tauri build
```

The generated installer/app bundle will be placed under:

```text
src-tauri/target/release/bundle/
```

For complete install, development, backup, and transfer instructions, see [DEPLOYMENT_AND_INSTALLATION.md](./DEPLOYMENT_AND_INSTALLATION.md).

## Development

Run the native desktop app in development mode:

```bash
npm run tauri dev
```

Run the frontend development server only:

```bash
npm run dev
```

The frontend-only mode is useful for UI work, but Tauri-backed features require the native development app.

## Useful Checks

```bash
npm run build
npm run lint
npx tsc --noEmit
cd src-tauri && cargo check
```

## Data Storage

Native desktop data is stored in the Tauri application data directory:

- macOS: `~/Library/Application Support/com.cardcanvas.app`
- Windows: `%APPDATA%\com.cardcanvas.app`
- Linux: `~/.local/share/com.cardcanvas.app`

The app uses:

- `master.db` for users and recovery data
- one SQLite database per user for folders, boards, cards, uploads, and whiteboards

## Main Project Structure

```text
src/
  app/                  Next.js routes and app shell
  components/           Canvas, sidebar, toolbar, auth, editor, media, whiteboard UI
  lib/                  Card collision, tag extraction, media type helpers
  types/                Shared TypeScript app models

src-tauri/
  src/auth.rs           Local user auth and recovery key commands
  src/db.rs             SQLite setup and migrations
  src/workspace.rs      Folder, board, card, and whiteboard commands
  src/media.rs          Local media upload and media:// serving
  tauri.conf.json       Tauri desktop app config
```

## Notes For Future Work

The codebase is ready for iterative bug fixes and feature work. The most important rule is to keep the desktop/Tauri data path as the source of truth: frontend state should stay in sync with Rust commands and SQLite schema changes.
