# 📋 CardBoard

> A self-hosted, open-source infinite whiteboard where every sticky note is a **Card**.

![CardBoard](https://img.shields.io/badge/CardBoard-Infinite%20Whiteboard-7c5cfc?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-Local%20Storage-003B57?style=flat-square&logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)

## ✨ Features

- **Infinite Canvas** — Pan, zoom, and organize cards freely on an endless whiteboard
- **Multiple Card Types** — Rich text, links, images, PDFs, and clipped articles
- **Rich Text Editor** — Full TipTap editor with formatting, headings, lists, links, images, and code blocks
- **PDF Viewer** — Dedicated viewer for PDF cards
- **Folder & Board Organization** — Hierarchical folder/file tree in the sidebar
- **Calendar Widget** — Built-in calendar in the sidebar
- **Local SQLite Database** — All data stored locally, no external services needed
- **Docker Deployable** — Single command deployment with persistent data

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Editor | TipTap (rich text) |
| Canvas | Custom React infinite canvas |
| Database | SQLite via better-sqlite3 |
| Styling | Vanilla CSS (dark theme) |
| Icons | Lucide React |
| Deployment | Docker / Docker Compose |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **Docker** (optional, for containerized deployment)

### Local Development

```bash
# 1. Clone and navigate to the project
cd cardboard

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

### Docker Deployment (Single Command)

```bash
# Build and run with Docker Compose
docker compose up -d

# App is now running at http://localhost:3000
# Data persists in a Docker volume (cardboard-data)
```

To stop:
```bash
docker compose down
```

To rebuild after changes:
```bash
docker compose up -d --build
```

## 📖 Usage Guide

### Canvas Navigation
- **Pan**: Click and drag on empty canvas space
- **Zoom**: Scroll wheel or pinch gesture
- **Double-click canvas**: Create a new rich text card

### Card Management
- **Right-click canvas**: Context menu to create cards of any type
- **Double-click card**: Open the rich text editor
- **Drag cards**: Click and drag to reposition
- **Resize**: Drag the bottom-right corner handle
- **Right-click card**: Edit, reorder, or delete

### Sidebar
- **Calendar**: Navigate months, today is highlighted
- **File Tree**: Create folders, boards, rename, and delete
- **Click a board**: Switch to that board's canvas

### Rich Text Editor
- Full formatting toolbar: bold, italic, underline, strikethrough, highlight
- Headings (H1, H2, H3), bullet/ordered lists, blockquotes, code blocks
- Insert links and images
- Text alignment controls
- Color picker for card background
- **Ctrl/Cmd + S**: Quick save
- **Escape**: Close editor

## 📁 Project Structure

```
cardboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── boards/route.ts    # Board CRUD API
│   │   │   ├── cards/route.ts     # Card CRUD API
│   │   │   ├── folders/route.ts   # Folder CRUD API
│   │   │   └── upload/route.ts    # File upload API
│   │   ├── globals.css            # Complete design system
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main app page
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── CanvasCard.tsx     # Individual card component
│   │   │   └── InfiniteCanvas.tsx # Pan/zoom canvas
│   │   ├── Editor/
│   │   │   └── RichTextEditor.tsx # TipTap editor modal
│   │   ├── Sidebar/
│   │   │   ├── Calendar.tsx       # Calendar widget
│   │   │   ├── FileTree.tsx       # Folder/board tree
│   │   │   └── Sidebar.tsx        # Sidebar container
│   │   ├── Toolbar/
│   │   │   └── Toolbar.tsx        # Top toolbar
│   │   ├── ContextMenu.tsx        # Right-click menu
│   │   └── PDFViewer.tsx          # PDF viewer modal
│   ├── lib/
│   │   └── db.ts                  # SQLite database setup
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── data/                          # SQLite database (auto-created)
├── Dockerfile                     # Production Docker build
├── docker-compose.yml             # Single-command deployment
└── package.json
```

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `folders` | Hierarchical folder organization |
| `boards` | Whiteboards belonging to folders |
| `cards` | Cards with type, content, position, and styling |
| `uploads` | Binary file storage for images and PDFs |

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List all folders and boards |
| POST | `/api/folders` | Create a folder |
| PUT | `/api/folders` | Rename a folder |
| DELETE | `/api/folders?id=` | Delete a folder |
| GET | `/api/boards` | List/get boards |
| POST | `/api/boards` | Create a board |
| PUT | `/api/boards` | Rename a board |
| DELETE | `/api/boards?id=` | Delete a board |
| GET | `/api/cards?boardId=` | Get cards for a board |
| POST | `/api/cards` | Create a card |
| PUT | `/api/cards` | Update a card |
| DELETE | `/api/cards?id=` | Delete a card |
| POST | `/api/upload` | Upload a file |
| GET | `/api/upload?id=` | Retrieve a file |

## 📄 License

MIT — Use freely for personal and commercial projects.
