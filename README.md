<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-local--first-green?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

# 📋 CardCanvas

**CardCanvas** is a self-hosted, local-first visual workspace where you organize notes, links, images, PDFs, and clippings as free-flowing draggable cards on an infinite canvas. Think of it as your personal digital cork-board — but with rich text editing, an Excalidraw-powered whiteboard, tag-based filtering, and zero cloud dependencies.

Everything runs on your machine. Your data stays in a single SQLite file. No accounts, no subscriptions, no tracking.

---

## ✨ Features

### 🗂️ Workspaces
- Organize content into **Folders → Boards** (like folders → documents)
- Each board is an infinite canvas where you drag-and-drop cards freely
- Cards never overlap — collision detection nudges them to the nearest open spot
- Right-click the canvas to create new cards, or double-click empty space for a quick note

### 📝 Card Types
| Type | Description |
|---|---|
| **Rich Text** | Full rich text with headings, lists, bold/italic, code blocks, links, images, highlights |
| **Link** | Bookmark a URL with notes |
| **Image** | Upload or paste images directly |
| **PDF** | Upload PDF files — they render inline as a preview |
| **Article** | Clip web content and save it as a card |

### 🎨 Card Customization
- **Instant color palette** — hover over any card to reveal 7 color dots below the header
- **Free-flow drag** — cards move pixel-by-pixel (no grid snapping)
- **Free-flow resize** — grab the bottom-right corner and resize smoothly
- **Z-ordering** — right-click → "Bring to Front" / "Send to Back"

### 🏷️ Tags
- Add tags to any card (comma-separated in the editor, or use `#hashtags` in content)
- Switch to the **Tags** tab in the sidebar to see all cards across all boards
- Filter by one or multiple tags (AND logic)
- Cards appear in a uniform grid for quick scanning

### ✏️ Whiteboard (Excalidraw)
- The **Whiteboard** tab gives you a full [Excalidraw](https://excalidraw.com) drawing canvas
- Freehand drawing, shapes (rectangles, circles, diamonds), arrows, text
- Drag & drop images onto the whiteboard
- Auto-saves every 2 seconds to your local database
- Respects dark/light theme

### 🔍 Other Features
- **Global search** — filter cards by title or content in real-time
- **Board export** — download any board as a PNG screenshot
- **Dark / Light mode** — toggle with the theme button in the toolbar
- **Responsive** — works on mobile with a collapsible sidebar
- **Upload system** — drag & drop or paste images/PDFs from clipboard

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [React 19](https://react.dev) + [TypeScript 5](https://www.typescriptlang.org) |
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Rich Text Editor | [TipTap](https://tiptap.dev) |
| Whiteboard | [Excalidraw](https://excalidraw.com) (embedded React component) |
| Database | [SQLite](https://sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Icons | [Lucide React](https://lucide.dev) |
| Styling | Vanilla CSS with custom design tokens (no Tailwind) |
| Containerization | Docker with multi-stage build |

---

## 📋 Prerequisites

You only need **one** of the two options below:

### Option A: Run Locally (without Docker)

| Requirement | Version | How to Check |
|---|---|---|
| **Node.js** | 20 or newer | `node --version` |
| **npm** | 10 or newer (ships with Node 20) | `npm --version` |

> **Don't have Node.js?** Download it from [nodejs.org](https://nodejs.org). Pick the **LTS** version. It includes npm automatically.

### Option B: Run with Docker

| Requirement | Version | How to Check |
|---|---|---|
| **Docker** | 20+ | `docker --version` |
| **Docker Compose** | v2+ (included in Docker Desktop) | `docker compose version` |

> **Don't have Docker?** Download [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your OS (Windows, Mac, or Linux). It includes Docker Compose.

---

## 🚀 Quick Start — Local Development

This is the easiest way to get started. Follow these steps exactly:

### Step 1: Clone the repository

```bash
git clone https://github.com/manimrc/cardcanvas.git
cd cardcanvas
```

### Step 2: Install dependencies

```bash
npm install
```

> **What this does:** Downloads all the libraries the project needs into a `node_modules/` folder. This may take 1-2 minutes the first time.

> **⚠️ If you get errors about `better-sqlite3`:** This is a native C++ module. On macOS, you may need Xcode Command Line Tools:
> ```bash
> xcode-select --install
> ```
> On Linux (Ubuntu/Debian):
> ```bash
> sudo apt-get install python3 make g++
> ```

### Step 3: Start the development server

```bash
npm run dev
```

You should see output like:

```
▲ Next.js 16.2.4 (Turbopack)
- Local:   http://localhost:3000
✓ Ready in 400ms
```

### Step 4: Open the app

Open your browser and go to:

👉 **http://localhost:3000**

### Step 5: You're done!

On the first launch:
- A SQLite database is **automatically created** at `data/cardboard.db`
- A default workspace, board, and sample cards are seeded for you
- You can start creating cards immediately

### Stopping the server

Press `Ctrl + C` in the terminal to stop the development server.

---

## 🏗️ Production Build (Without Docker)

If you want to run a faster, optimized version locally:

```bash
# Build the optimized production bundle
npm run build

# Start the production server
npm start
```

The app will be available at **http://localhost:3000**.

> **Difference from dev mode:** The production build is pre-compiled and much faster. Dev mode recompiles on every file change, which is useful only during development.

---

## 🐳 Docker Setup

Docker lets you run CardCanvas in an isolated container — no need to install Node.js on your machine.

### Quick Start (one command)

```bash
docker compose up -d --build
```

**What this does:**
1. Builds the Docker image (multi-stage, ~300MB final image)
2. Creates a persistent volume for your database
3. Starts the container in the background (`-d`)

Then open: 👉 **http://localhost:3000**

### Common Docker Commands

```bash
# Start (if already built)
docker compose up -d

# Stop (keeps your data)
docker compose down

# Stop AND delete all data
docker compose down -v

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Check container health
docker ps
```

### How Data Persistence Works

```
Your computer                    Docker container
─────────────                    ─────────────────
                                 /app/data/cardboard.db
                                     ↕ (mounted volume)
docker volume: cardcanvas-data ──────┘
```

- Your SQLite database lives in a Docker **volume** called `cardcanvas-data`
- This volume **survives** container restarts, rebuilds, and updates
- To see your volumes: `docker volume ls`
- To back up your data: `docker cp $(docker compose ps -q cardcanvas):/app/data/cardboard.db ./backup.db`

### Running on a Different Port

Edit `docker-compose.yml` and change the port mapping:

```yaml
ports:
  - "8080:3000"   # Access on http://localhost:8080
```

### Deploying on a Server

CardCanvas works great on any VPS (DigitalOcean, Hetzner, AWS EC2, etc.):

1. SSH into your server
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone the repo: `git clone https://github.com/manimrc/cardcanvas.git && cd cardcanvas`
4. Start: `docker compose up -d --build`
5. (Optional) Set up a reverse proxy (Nginx/Caddy) for HTTPS

---

## 📁 Project Structure

```
cardcanvas/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # REST API endpoints
│   │   │   ├── boards/route.ts       #   CRUD for boards
│   │   │   ├── cards/route.ts        #   CRUD for cards
│   │   │   ├── folders/route.ts      #   CRUD for folders
│   │   │   ├── upload/route.ts       #   File upload/download
│   │   │   └── whiteboard/route.ts   #   Whiteboard state persistence
│   │   ├── globals.css               # All styles (design tokens + components)
│   │   ├── layout.tsx                # Root HTML layout + metadata
│   │   └── page.tsx                  # Main app shell + state orchestrator
│   │
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── CanvasCard.tsx        # Individual card (drag, resize, color)
│   │   │   ├── InfiniteCanvas.tsx    # Scrollable canvas with collision detection
│   │   │   └── TagGridView.tsx       # Grid layout for Tags mode
│   │   ├── Editor/
│   │   │   └── RichTextEditor.tsx    # TipTap-based card editor modal
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx           # Tab navigation (Workspaces/Tags/Whiteboard)
│   │   │   └── FileTree.tsx          # Folder → Board tree view
│   │   ├── Toolbar/
│   │   │   └── Toolbar.tsx           # Top toolbar (add card, search, export, theme)
│   │   ├── Whiteboard/
│   │   │   └── WhiteboardView.tsx    # Excalidraw integration with auto-save
│   │   ├── AddMediaModal.tsx         # Upload/paste modal for images & PDFs
│   │   ├── ContextMenu.tsx           # Right-click context menu
│   │   └── PDFViewer.tsx             # PDF viewer modal
│   │
│   ├── lib/
│   │   ├── collision.ts              # AABB collision detection for cards
│   │   ├── constants.ts              # Shared constants (colors, upload limits)
│   │   ├── db.ts                     # SQLite database setup + migrations
│   │   ├── hashtags.ts               # Tag extraction and filtering logic
│   │   └── mediaType.ts              # MIME type inference for uploads
│   │
│   └── types/
│       └── index.ts                  # TypeScript interfaces (Card, Board, Folder)
│
├── data/                             # SQLite database (auto-created)
│   └── cardboard.db
│
├── public/                           # Static assets
├── Dockerfile                        # Multi-stage production Docker build
├── docker-compose.yml                # One-command Docker deployment
├── .dockerignore                     # Files excluded from Docker build context
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies and scripts
└── README.md                         # You are here
```

---

## 🔌 API Reference

All endpoints are REST-style and return JSON. The server runs on `http://localhost:3000`.

### Folders

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/folders` | — | Get all folders and boards |
| `POST` | `/api/folders` | `{ parentId?, name }` | Create a new folder |
| `PUT` | `/api/folders` | `{ id, name }` | Rename a folder |
| `DELETE` | `/api/folders?id=xxx` | — | Delete a folder (cascading) |

### Boards

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/boards` | — | List all boards |
| `GET` | `/api/boards?id=xxx` | — | Get a specific board |
| `POST` | `/api/boards` | `{ folderId, name }` | Create a board in a folder |
| `PUT` | `/api/boards` | `{ id, name }` | Rename a board |
| `DELETE` | `/api/boards?id=xxx` | — | Delete a board (cascading) |

### Cards

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/cards?boardId=xxx` | — | Get all cards on a board |
| `GET` | `/api/cards?all=1` | — | Get all cards across all boards |
| `GET` | `/api/cards?id=xxx` | — | Get a single card |
| `POST` | `/api/cards` | `{ boardId, type, title, content, color, x, y, ... }` | Create a card |
| `PUT` | `/api/cards` | `{ id, ...fields }` | Update card (partial update) |
| `DELETE` | `/api/cards?id=xxx` | — | Delete a card |

**Card fields:**
```json
{
  "id": "uuid",
  "boardId": "uuid",
  "type": "richtext | link | image | pdf | article",
  "title": "Card Title",
  "content": "<p>HTML content from TipTap</p>",
  "url": "https://... or /api/upload?id=xxx",
  "color": "#FFF9C4",
  "tags": ["tag1", "tag2"],
  "x": 200,
  "y": 150,
  "width": 280,
  "height": 200,
  "zIndex": 1
}
```

### File Uploads

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/upload` | `FormData { file, cardId? }` | Upload a file (image or PDF) |
| `GET` | `/api/upload?id=xxx` | — | Download/display an uploaded file |

### Whiteboard

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/whiteboard` | — | Get whiteboard state (Excalidraw JSON) |
| `PUT` | `/api/whiteboard` | `{ content }` | Save whiteboard state |

---

## 🗄️ Database Schema

CardCanvas uses a single SQLite file (`data/cardboard.db`) with 5 tables:

```sql
folders (id, parentId, name, createdAt, updatedAt)
    └── boards (id, folderId, name, createdAt, updatedAt)
            └── cards (id, boardId, type, title, content, url, color, 
                       x, y, width, height, zIndex, tags, createdAt, updatedAt)

uploads (id, cardId, filename, mimetype, data, createdAt)

whiteboard (id, content, updatedAt)   -- single row, id="default"
```

- Foreign keys with `ON DELETE CASCADE` — deleting a folder removes all its boards and their cards
- WAL mode enabled for performance
- Auto-migrates on startup (e.g., adds `tags` column if missing)

---

## 🛠️ Common Commands Reference

```bash
# ─── Development ───
npm run dev          # Start dev server with hot reload (http://localhost:3000)
npm run build        # Create optimized production build
npm start            # Run the production build
npm run lint         # Run ESLint

# ─── Docker ───
docker compose up -d --build    # Build and start in background
docker compose down             # Stop containers (keep data)
docker compose down -v          # Stop AND delete all data
docker compose logs -f          # Stream container logs
docker compose ps               # Check container status

# ─── Database ───
# Back up your database:
cp data/cardboard.db data/cardboard.db.bak

# Reset database (start fresh):
rm data/cardboard.db
# Then restart the server — it will re-seed

# ─── Custom Port ───
PORT=3001 npm run dev            # Dev on port 3001
PORT=8080 npm start              # Production on port 8080
```

---

## ❓ Troubleshooting

### `npm install` fails with native module errors

**Problem:** `better-sqlite3` is a native C++ addon that needs to be compiled.

**Fix (macOS):**
```bash
xcode-select --install
rm -rf node_modules package-lock.json
npm install
```

**Fix (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install python3 make g++
rm -rf node_modules package-lock.json
npm install
```

**Fix (Windows):**
```bash
npm install --global windows-build-tools
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 is already in use

```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Blank screen / UI not loading

1. Stop the dev server (`Ctrl + C`)
2. Delete the Next.js cache: `rm -rf .next`
3. Restart: `npm run dev`
4. Hard refresh in browser: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)

### Docker container starts but app is inaccessible

```bash
# Check if container is running and healthy
docker compose ps

# Check logs for errors
docker compose logs -f

# Rebuild from scratch
docker compose down
docker compose up -d --build
```

### Database is corrupted

```bash
# Remove the database and let it re-seed
rm data/cardboard.db
# Then restart the dev server or rebuild the Docker container
```

### Whiteboard doesn't load (Excalidraw)

Excalidraw is a large library (~2MB) loaded dynamically. If it's slow:
1. Wait a few seconds on first load — it's downloading the Excalidraw bundle
2. Check browser console for errors
3. Try a hard refresh

---

## 🏗️ Dockerfile Explained

The Dockerfile uses a 4-stage multi-stage build for security and small image size:

```
Stage 1 (deps)       → Install ALL npm dependencies
Stage 2 (builder)    → Build the Next.js app
Stage 3 (prod-deps)  → Install only production dependencies
Stage 4 (runner)     → Final image with built app + prod deps only
```

**Key details:**
- Runs as a **non-root user** (`nextjs:nodejs`) for security
- Has a **healthcheck** that pings `http://localhost:3000/` every 30s
- Uses `node_modules/.bin/next start` directly (instead of `npm start`) for proper `SIGTERM` handling and graceful shutdown
- Python3/make/g++ are installed only in build stages (not in the final image) for compiling `better-sqlite3`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the linter: `npm run lint`
5. Build to verify: `npm run build`
6. Commit: `git commit -m "feat: add my feature"`
7. Push: `git push origin feature/my-feature`
8. Open a Pull Request

---

## 📄 License

[MIT](LICENSE) — use it however you want.
