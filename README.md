# CardBoard

CardBoard is a self-hosted visual workspace where you organize notes, links, images, and PDFs as draggable cards.
It is designed for personal research, ideation, and planning with local-first persistence (SQLite).

## What You Get

- Infinite board-style workspace (per board)
- Rich text cards with TipTap formatting
- Link, image, and PDF cards
- Global **Tags mode**:
  - combines cards from all boards
  - filter by one or many hashtags
  - uniform grid layout for quick scanning
- Sidebar workspace tree (folders -> boards)
- Theme toggle (dark/light)
- Board snapshot download (PNG)
- Docker and local development support

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- TipTap editor
- SQLite (`better-sqlite3`)
- Vanilla CSS

## Prerequisites

For local development:

- Node.js 20+ recommended
- npm

For container deployment:

- Docker
- Docker Compose

## Local Setup (Beginner Friendly)

1) Clone the repository and open the project:

```bash
git clone <your-repo-url>
cd cardboard
```

2) Install dependencies:

```bash
npm install
```

3) Start the development server:

```bash
npm run dev
```

4) Open the app in your browser:

- [http://localhost:3000](http://localhost:3000)

5) First run behavior:

- SQLite file is created automatically under `data/cardboard.db`
- default folder/board/sample cards are seeded if the DB is empty

## Production Build (Without Docker)

```bash
npm run build
npm start
```

App runs on port `3000` by default.

## Docker Setup

### Quick Start

```bash
docker compose up -d --build
```

Then open:

- [http://localhost:3000](http://localhost:3000)

### Stop

```bash
docker compose down
```

### Data Persistence

- `docker-compose.yml` mounts `/app/data` to volume `cardboard-data`
- your SQLite DB survives container restarts/rebuilds

## Dockerfile Review

The current Dockerfile is production-ready and improved for size and reliability:

- Multi-stage build (`deps`, `builder`, `prod-deps`, `runner`)
- Native build tools installed where needed for `better-sqlite3`
- Final runtime image includes:
  - production `node_modules` only
  - built `.next` output
  - `public`
- `NODE_ENV=production` and exposed `3000`

This is a solid baseline for self-hosted deployment.

## Common Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm start        # run production server
npm run lint     # lint project
```

## Project Structure

```text
cardboard/
├── src/
│   ├── app/
│   │   ├── api/                # boards, folders, cards, uploads
│   │   ├── globals.css
│   │   └── page.tsx            # main app shell
│   ├── components/
│   │   ├── Canvas/
│   │   ├── Editor/
│   │   ├── Sidebar/
│   │   ├── Toolbar/
│   │   └── AddMediaModal.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── hashtags.ts
│   │   └── mediaType.ts
│   └── types/
├── data/                        # sqlite db folder
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/folders` | list folders + boards |
| POST | `/api/folders` | create folder |
| PUT | `/api/folders` | rename folder |
| DELETE | `/api/folders?id=` | delete folder |
| GET | `/api/boards` | list/get boards |
| POST | `/api/boards` | create board |
| PUT | `/api/boards` | rename board |
| DELETE | `/api/boards?id=` | delete board |
| GET | `/api/cards?boardId=` | list cards in one board |
| GET | `/api/cards?all=1` | list cards across all boards |
| POST | `/api/cards` | create card |
| PUT | `/api/cards` | update card |
| DELETE | `/api/cards?id=` | delete card |
| POST | `/api/upload` | upload file (image/pdf) |
| GET | `/api/upload?id=` | read uploaded file |

## Troubleshooting

- Build fails on native sqlite dependency:
  - ensure Node version is modern (20+)
  - run `rm -rf node_modules package-lock.json && npm install`
- Port 3000 busy:
  - run on another port: `PORT=3001 npm run dev`
- Blank UI after major updates:
  - restart dev server and hard refresh browser
- Docker container starts but no data persists:
  - verify `cardboard-data` volume exists (`docker volume ls`)

## License

MIT
