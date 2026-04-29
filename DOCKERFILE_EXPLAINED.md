# Dockerfile Deep Dive — CardCanvas

This document explains every single line of the CardCanvas Dockerfile, the `.dockerignore`, and the `docker-compose.yml`. It's written for beginners who want to understand not just *what* each line does, but *why* it exists and *how* it works under the hood.

---

## Table of Contents

- [Background: What Is Docker?](#background-what-is-docker)
- [Background: What Is a Multi-Stage Build?](#background-what-is-a-multi-stage-build)
- [The .dockerignore File](#the-dockerignore-file)
- [Stage 1: deps — Install All Dependencies](#stage-1-deps--install-all-dependencies)
- [Stage 2: builder — Build the Next.js App](#stage-2-builder--build-the-nextjs-app)
- [Stage 3: prod-deps — Production Dependencies Only](#stage-3-prod-deps--production-dependencies-only)
- [Stage 4: runner — The Final Production Image](#stage-4-runner--the-final-production-image)
- [The docker-compose.yml](#the-docker-composeyml)
- [How It All Fits Together](#how-it-all-fits-together)
- [Common Questions](#common-questions)

---

## Background: What Is Docker?

Docker is a tool that packages your app and all its dependencies into a **container** — a lightweight, isolated environment that runs identically on any machine. Think of it like shipping your app in a box that includes its own operating system, Node.js, and all libraries. Anyone with Docker installed can run your container without installing Node.js, npm, or anything else.

**Key terms:**
- **Image** — A read-only template (like a snapshot/blueprint). You *build* images from a Dockerfile.
- **Container** — A running instance of an image. You *start* containers from images.
- **Volume** — Persistent storage that survives when a container is stopped or deleted.
- **Layer** — Docker builds images in layers. Each instruction (`RUN`, `COPY`, etc.) creates a layer. Unchanged layers are cached, making rebuilds fast.

---

## Background: What Is a Multi-Stage Build?

A regular Dockerfile installs everything (build tools, dev dependencies, source code) in one image. The result is huge — often 1-2 GB.

A **multi-stage build** uses multiple `FROM` statements. Each `FROM` starts a new "stage" with a fresh filesystem. You can copy specific files from one stage to another using `COPY --from=stageName`. The final image only contains what you explicitly copy into it.

**Our Dockerfile has 4 stages:**

```
Stage 1 (deps)      →  Install ALL npm packages (dev + prod)
Stage 2 (builder)   →  Build the Next.js app using those packages
Stage 3 (prod-deps) →  Install ONLY production npm packages
Stage 4 (runner)    →  Final image: built app + prod deps only
```

**Result:** The final image contains no source code, no dev tools, no build artifacts — just the compiled app and what it needs to run. This makes it small (~300 MB instead of ~1.5 GB) and secure (less attack surface).

---

## The .dockerignore File

```
node_modules
.next
.git
data
*.DS_Store
.env*
.vercel
npm-debug.log*
yarn-debug.log*
.pnpm-debug.log*
.gitignore
CLAUDE.md
AGENTS.md
test.js
coverage
*.tsbuildinfo
```

### What It Does

When Docker builds an image, it first sends all files in the project directory (called the **build context**) to the Docker daemon. The `.dockerignore` file tells Docker to **exclude** certain files from this transfer.

### Why Each Entry Exists

| Entry | Why it's excluded |
|---|---|
| `node_modules` | Will be installed fresh inside the container via `npm ci`. Including your local `node_modules` would be huge (~500 MB), slow, and might contain packages compiled for a different OS (e.g., macOS binaries won't work in the Alpine Linux container) |
| `.next` | This is your local build output. The container will run `npm run build` to generate its own `.next` folder |
| `.git` | Git history is unnecessary in the container and can be large |
| `data` | Your local SQLite database. The container creates its own fresh DB. If you included this, your personal data would be baked into the image (security risk) |
| `*.DS_Store` | macOS hidden files — completely irrelevant |
| `.env*` | Environment variable files may contain secrets (API keys, passwords). Never bake these into an image |
| `.vercel` | Vercel deployment config — not needed for Docker |
| `*-debug.log*` | npm/yarn debug logs — unnecessary clutter |
| `.gitignore` | Not needed inside the container |
| `CLAUDE.md`, `AGENTS.md` | AI assistant configuration files — not needed at runtime |
| `test.js`, `coverage` | Test files and coverage reports — not needed in production |
| `*.tsbuildinfo` | TypeScript incremental build cache — the container builds from scratch |

### Performance Impact

Without `.dockerignore`, Docker would upload **everything** (including `node_modules`, `.git`, etc.) to the daemon before building. With it, the build context is just your source files — typically under 5 MB instead of 500+ MB. This makes builds significantly faster.

---

## Stage 1: deps — Install All Dependencies

```dockerfile
# ---- Stage 1: Install ALL dependencies (for building) ----
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
```

### Line-by-line breakdown

#### `FROM node:20-alpine AS deps`

```
FROM  → Start a new stage using an existing base image
node:20-alpine → The base image: Node.js version 20 on Alpine Linux
AS deps → Name this stage "deps" so other stages can reference it
```

**Why `node:20-alpine`?**
- `node:20` gives us Node.js 20 (the LTS version our project needs)
- `-alpine` means it uses Alpine Linux instead of Debian/Ubuntu. Alpine is a *tiny* Linux distribution (~5 MB vs ~120 MB). This makes our image much smaller
- The trade-off: Alpine uses `musl libc` instead of `glibc`, which means some native packages (like `better-sqlite3`) need to be compiled from source

**Why `AS deps`?**
- This is a label. Later stages can say `COPY --from=deps /app/node_modules ./node_modules` to grab files from this stage

---

#### `RUN apk add --no-cache python3 make g++`

```
RUN     → Execute a shell command inside the container
apk add → Alpine's package manager (like apt-get on Ubuntu)
--no-cache → Don't save the package index to disk (keeps image smaller)
python3 make g++ → Three build tools
```

**Why do we need these?**

Our project uses `better-sqlite3`, which is a **native Node.js addon** — it contains C++ code that must be compiled into a binary that Node.js can load. The compilation process (`node-gyp`) requires:

| Tool | Purpose |
|---|---|
| `python3` | `node-gyp` (the build tool for native addons) is a Python program |
| `make` | Controls the C++ compilation process |
| `g++` | The actual C++ compiler that turns `.cpp` files into `.so` binaries |

Without these tools, `npm ci` would fail when it tries to install `better-sqlite3`.

---

#### `WORKDIR /app`

```
WORKDIR → Set the working directory for all subsequent commands
/app    → The directory path inside the container
```

This is like running `mkdir -p /app && cd /app`. All future `RUN`, `COPY`, and `CMD` instructions will execute relative to `/app`. It's a convention to use `/app` for the application directory.

---

#### `COPY package.json package-lock.json ./`

```
COPY → Copy files from your computer (build context) into the container
package.json package-lock.json → The source files
./ → The destination inside the container (which is /app because of WORKDIR)
```

**Why copy only these two files and not the full source code?**

This is a **Docker caching optimization**. Docker caches each layer. If the files in a `COPY` instruction haven't changed, Docker reuses the cached layer and skips the next `RUN` instruction too.

By copying only `package.json` and `package-lock.json` first:
- If you only changed your source code (not dependencies), Docker reuses the cached `npm ci` layer
- `npm ci` takes 30-60 seconds. Caching it saves massive time during development

If we did `COPY . .` followed by `RUN npm ci`, *any* source code change would invalidate the cache and force a full reinstall.

---

#### `RUN npm ci`

```
RUN    → Execute a command
npm ci → "Clean Install" — install dependencies exactly as specified in package-lock.json
```

**Why `npm ci` instead of `npm install`?**

| `npm install` | `npm ci` |
|---|---|
| May update `package-lock.json` | Never modifies `package-lock.json` |
| Tries to reuse existing `node_modules` | Deletes `node_modules` and installs fresh |
| Can produce slightly different versions | 100% reproducible builds |
| For development | For CI/CD and Docker builds |

`npm ci` guarantees that every build uses the exact same dependency versions. This is critical for production.

---

## Stage 2: builder — Build the Next.js App

```dockerfile
# ---- Stage 2: Build the Next.js application ----
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```

### Line-by-line breakdown

#### `FROM node:20-alpine AS builder`

Start a **new, clean** filesystem. Nothing from Stage 1 carries over automatically — we have a fresh Alpine + Node.js environment.

#### `RUN apk add --no-cache python3 make g++`

We need the native build tools again because `better-sqlite3`'s compiled binary is linked against the system's C library. Even though we already compiled it in Stage 1, the Next.js build process also needs to resolve these native modules.

#### `COPY --from=deps /app/node_modules ./node_modules`

```
COPY --from=deps → Copy from the "deps" stage (Stage 1), not from your computer
/app/node_modules → The source: all installed packages from Stage 1
./node_modules → The destination in this stage
```

This is the magic of multi-stage builds. We don't need to run `npm ci` again — we just grab the already-installed packages from Stage 1.

#### `COPY . .`

```
COPY . . → Copy everything from your project directory into /app in the container
```

Now we bring in all the source code (`src/`, `public/`, `tsconfig.json`, `next.config.ts`, etc.). The `.dockerignore` ensures we don't copy `node_modules`, `.git`, `data`, etc.

**Why didn't we do this in Stage 1?**

Because Stage 1 only needs `package.json` and `package-lock.json`. If we copied everything, any source code change would bust the `npm ci` cache.

#### `RUN npm run build`

```
npm run build → Runs "next build" (defined in package.json scripts)
```

This compiles the Next.js application:
1. TypeScript is compiled to JavaScript
2. React components are optimized and bundled
3. Static pages are pre-rendered
4. Server-side code is prepared for production

The output goes into the `.next/` directory. This is what we'll copy into the final image.

---

## Stage 3: prod-deps — Production Dependencies Only

```dockerfile
# ---- Stage 3: Production-only dependencies ----
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
```

### Why a separate stage for production dependencies?

Stage 1 installed **all** dependencies (including dev dependencies like `eslint`, `typescript`, `@types/*`). Those are needed to build the app, but not to run it.

This stage installs only production dependencies, which are significantly smaller.

#### `RUN npm ci --omit=dev && npm cache clean --force`

```
npm ci --omit=dev → Install, but skip anything listed under "devDependencies"
&& → Only run the next command if the first succeeds
npm cache clean --force → Delete npm's download cache to reduce image size
```

**Size comparison (approximate):**
- All dependencies: ~400 MB
- Production only: ~200 MB
- After cache clean: ~180 MB

The `--force` flag is required because npm normally prevents cache cleaning to avoid accidental data loss. In a Docker build, we know we won't need the cache.

---

## Stage 4: runner — The Final Production Image

```dockerfile
# ---- Stage 4: Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy build output, runtime config, and production dependencies
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=prod-deps /app/node_modules ./node_modules

# Create data directory owned by non-root user
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

USER nextjs
EXPOSE 3000

# Run next directly for proper SIGTERM handling (graceful shutdown)
CMD ["node_modules/.bin/next", "start"]
```

This is the **only stage that ends up in your final Docker image**. Everything from Stages 1-3 is discarded — we only keep what we explicitly `COPY --from=...` into this stage.

### Line-by-line breakdown

#### `FROM node:20-alpine AS runner`

A fresh Alpine + Node.js image. No build tools (`python3`, `make`, `g++`) are installed — we don't need them to *run* the app. This makes the final image smaller and more secure.

#### `ENV NODE_ENV=production`

```
ENV → Set an environment variable that persists when the container runs
NODE_ENV=production → Tells Node.js and Next.js to run in production mode
```

**What production mode does:**
- Next.js serves pre-compiled pages instead of compiling on-the-fly
- React disables development warnings and devtools
- Error stack traces are hidden from users
- Logging is minimized
- Some npm packages switch to optimized code paths

#### `ENV PORT=3000` and `ENV HOSTNAME=0.0.0.0`

```
PORT=3000 → The port Next.js will listen on inside the container
HOSTNAME=0.0.0.0 → Listen on all network interfaces, not just localhost
```

**Why `0.0.0.0`?**

Inside a container, `localhost` (or `127.0.0.1`) means "only accept connections from inside this container." But we need the app to accept connections from the Docker host (your computer) and potentially external network. `0.0.0.0` means "listen on all interfaces," which allows Docker's port mapping (`-p 3000:3000`) to work.

If you set `HOSTNAME=localhost`, the app would run but you couldn't access it from your browser.

---

#### Non-root user creation

```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
```

```
addgroup --system --gid 1001 nodejs
  → Create a system group called "nodejs" with group ID 1001

adduser --system --uid 1001 nextjs
  → Create a system user called "nextjs" with user ID 1001
  → --system means no password, no home directory, no login shell
```

**Why?**

By default, Docker runs everything as `root` (the superuser). If an attacker exploits a vulnerability in the app, they'd have full root access to the container — and potentially to the host system.

Running as a non-root user limits damage:
- The `nextjs` user can only read/write files it owns
- It cannot install packages, change system config, or access other processes
- It cannot escalate to the host system

This is a **security best practice** recommended by Docker, OWASP, and every cloud provider.

---

#### Copying files from previous stages

```dockerfile
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=prod-deps /app/node_modules ./node_modules
```

We cherry-pick only what's needed to run the app:

| Source | What it is | Why it's needed |
|---|---|---|
| `.next/` | Compiled Next.js output (JavaScript bundles, pre-rendered HTML) | This IS the app — without it, there's nothing to serve |
| `public/` | Static files (favicon, images) | Served directly by Next.js for any files in this folder |
| `package.json` | Project metadata | Next.js reads this at runtime for the project name and version |
| `next.config.ts` | Next.js configuration | Contains settings like `serverExternalPackages: ['better-sqlite3']` which Next.js needs at runtime |
| `node_modules/` | Production runtime libraries (from Stage 3) | Libraries needed at runtime: `better-sqlite3`, `react`, `uuid`, etc. |

**What's NOT copied (and why):**

| Not included | Why |
|---|---|
| `src/` (source code) | Already compiled into `.next/` — raw TypeScript is not needed |
| `tsconfig.json` | Only needed during compilation, not at runtime |
| `python3`, `make`, `g++` | Only needed to compile native modules during install, not at runtime |
| Dev dependencies | `eslint`, `typescript`, `@types/*` are development-only tools |

---

#### Data directory

```dockerfile
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app
```

```
mkdir -p /app/data → Create the data directory (where SQLite stores its database file)
  -p means "create parent directories if needed" and "don't error if it already exists"

chown -R nextjs:nodejs /app → Change ownership of /app and everything inside it
  -R → Recursive (all files and subdirectories)
  nextjs:nodejs → owner:group — the non-root user we created
```

**Why?**

The SQLite database (`cardboard.db`) is created at runtime in `/app/data/`. Since we'll run as the `nextjs` user (not root), that user needs write permission to this directory. Without `chown`, the directory would be owned by root, and the app would crash with a `SQLITE_CANTOPEN` error.

---

#### Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
```

A healthcheck tells Docker how to verify that your app is actually working (not just that the process is running — a process can hang without crashing).

**The flags:**

| Flag | Value | Meaning |
|---|---|---|
| `--interval` | `30s` | Check every 30 seconds |
| `--timeout` | `5s` | If the check takes longer than 5 seconds, consider it failed |
| `--start-period` | `10s` | After starting the container, wait 10 seconds before the first check (gives the app time to boot up) |
| `--retries` | `3` | Mark the container as "unhealthy" only after 3 consecutive failures |

**The command:**

```
wget --no-verbose --tries=1 --spider http://localhost:3000/
```

- `wget` — A command-line HTTP client (pre-installed on Alpine)
- `--no-verbose` — Don't print download progress
- `--tries=1` — Try only once (don't retry on failure)
- `--spider` — Don't download the page, just check if it responds (like a `HEAD` request)
- `http://localhost:3000/` — The URL to check

If wget gets a `200 OK` response, the healthcheck passes. Otherwise, it fails. After 3 failures, Docker marks the container as `unhealthy`, and orchestrators (like Docker Compose `restart: unless-stopped`, or Kubernetes) can automatically restart it.

---

#### `USER nextjs`

```
USER → Switch to this user for all subsequent instructions and when the container runs
```

From this point on, the container runs as `nextjs` (not root). This must come **after** all `RUN` commands that need root (like `mkdir`, `chown`, `adduser`) and **before** the `CMD`.

---

#### `EXPOSE 3000`

```
EXPOSE → Document that the container listens on this port
```

**Important:** `EXPOSE` does **not** actually publish the port. It's purely documentation — a hint to the person running the container that they should map port 3000. The actual port mapping happens with `-p 3000:3000` in `docker run` or in `docker-compose.yml`.

---

#### `CMD ["node_modules/.bin/next", "start"]`

```
CMD → The default command to run when the container starts
["node_modules/.bin/next", "start"] → Run the Next.js production server
```

**Why not `CMD ["npm", "start"]`?**

Both would work, but there's an important difference:

| `npm start` | `node_modules/.bin/next start` |
|---|---|
| npm is a wrapper — it spawns a child process | Runs Next.js directly as PID 1 |
| When Docker sends `SIGTERM` (stop signal), npm may not forward it to Next.js | Next.js receives `SIGTERM` directly and shuts down gracefully |
| The container may take 10+ seconds to stop (Docker force-kills after timeout) | The container stops cleanly in under 1 second |

**Why the `exec form` (JSON array) instead of `shell form`?**

```dockerfile
# Exec form (preferred) — runs the command directly
CMD ["node_modules/.bin/next", "start"]

# Shell form (avoid) — wraps in /bin/sh -c "..."
CMD node_modules/.bin/next start
```

The exec form runs the process directly (it becomes PID 1). The shell form wraps it in a shell, which means signals go to the shell, not your app. Always use exec form for `CMD`.

---

## The docker-compose.yml

```yaml
services:
  cardcanvas:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - cardcanvas-data:/app/data
    restart: unless-stopped
    environment:
      - NODE_ENV=production

volumes:
  cardcanvas-data:
```

Docker Compose is a tool that simplifies running containers. Instead of typing long `docker run` commands, you describe your setup in a YAML file.

### Line-by-line breakdown

#### `services:`

The top-level key. Each entry under `services` is a container to run.

#### `cardcanvas:`

The name of our service. This becomes the container's hostname on Docker's internal network.

#### `build: .`

```
build: . → Build the Docker image from the Dockerfile in the current directory
```

When you run `docker compose up --build`, Docker reads this and runs `docker build .` using the Dockerfile in the project root.

#### `ports: - "3000:3000"`

```
"HOST_PORT:CONTAINER_PORT"
"3000:3000" → Map port 3000 on your computer to port 3000 inside the container
```

This is what allows you to open `http://localhost:3000` in your browser and reach the app inside the container.

If you wanted the app on a different port on your machine:
```yaml
ports:
  - "8080:3000"  # Access via http://localhost:8080
```

#### `volumes: - cardcanvas-data:/app/data`

```
VOLUME_NAME:CONTAINER_PATH
cardcanvas-data:/app/data → Mount the named volume at /app/data inside the container
```

**Why?**

Containers are **ephemeral** — when you stop and remove a container, everything inside it is deleted. Our SQLite database (`data/cardboard.db`) would be lost on every restart.

A **volume** is persistent storage managed by Docker. It lives on your host machine's filesystem (usually at `/var/lib/docker/volumes/`) and is mounted into the container. The data survives:
- Container restarts
- Container rebuilds (`docker compose up --build`)
- Container removal (`docker compose down`)

The only thing that deletes a volume is explicitly running `docker compose down -v` (the `-v` flag) or `docker volume rm`.

#### `restart: unless-stopped`

```
Restart policy for the container:
- "no" → Never restart (default)
- "always" → Always restart, even after Docker daemon restart
- "unless-stopped" → Restart unless YOU manually stopped it
- "on-failure" → Restart only if the process exits with a non-zero code
```

`unless-stopped` is ideal for self-hosted apps:
- If the app crashes, Docker restarts it automatically
- If your server reboots, Docker restarts it automatically
- If you manually stop it (`docker compose stop`), it stays stopped

#### `environment: - NODE_ENV=production`

Sets environment variables inside the container. This overrides the `ENV` in the Dockerfile (though in our case, they're the same value).

#### `volumes: cardcanvas-data:`

At the bottom level, this **declares** the named volume. Docker creates it automatically if it doesn't exist. It's a volume managed by Docker (not a directory on your filesystem).

---

## How It All Fits Together

Here's the complete flow when you run `docker compose up -d --build`:

```
1. Docker reads docker-compose.yml
2. Docker reads .dockerignore (excludes node_modules, .git, data, etc.)
3. Docker sends the build context (~5 MB of source files) to the daemon

STAGE 1 (deps):
4. Pull node:20-alpine base image (if not cached)
5. Install python3, make, g++ for native compilation
6. Copy package.json + package-lock.json
7. Run npm ci (install ALL dependencies)
   → Compiles better-sqlite3 from C++ source

STAGE 2 (builder):
8. Fresh node:20-alpine
9. Install python3, make, g++
10. Copy node_modules from Stage 1
11. Copy all source code
12. Run npm run build (compile TypeScript, bundle React, pre-render pages)
   → Output goes to .next/

STAGE 3 (prod-deps):
13. Fresh node:20-alpine
14. Install python3, make, g++
15. Copy package.json + package-lock.json
16. Run npm ci --omit=dev (install only production deps)
   → Smaller node_modules (~180 MB vs ~400 MB)

STAGE 4 (runner):
17. Fresh node:20-alpine (NO build tools installed)
18. Set environment variables
19. Create non-root user
20. Copy .next/ from Stage 2
21. Copy public/ from Stage 2
22. Copy node_modules/ from Stage 3
23. Create /app/data directory
24. Set up healthcheck
25. Switch to non-root user
26. CMD: start Next.js production server

STAGES 1, 2, 3 ARE DISCARDED — only Stage 4 becomes the final image

27. Docker creates the cardcanvas-data volume (if new)
28. Docker starts the container from the final image
29. The volume is mounted at /app/data
30. Port 3000 is mapped to your host
31. Next.js starts and listens on 0.0.0.0:3000
32. You open http://localhost:3000 🎉
```

---

## Common Questions

### Why do we install python3/make/g++ in 3 separate stages?

Each stage is a completely independent filesystem. Build tools installed in Stage 1 don't exist in Stage 2. We need them wherever `npm ci` or `npm run build` touches `better-sqlite3`.

**Crucially, Stage 4 (runner) does NOT install them.** The final image has no compiler, no build tools — just the pre-compiled binary. This is intentional for security and size.

### Why not just one stage?

A single-stage build would look like:

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["npm", "start"]
```

This works, but the final image would include:
- Source code (unnecessary at runtime)
- Dev dependencies like eslint, typescript (~200 MB extra)
- Build tools like python3, make, g++ (~150 MB extra)
- npm cache (~50 MB)

Total: ~1.5 GB instead of ~300 MB.

### Can I use Debian instead of Alpine?

Yes. Replace `node:20-alpine` with `node:20` and `apk add` with `apt-get install`. The image will be larger (~900 MB vs ~300 MB) but you avoid potential musl/glibc compatibility issues.

### How do I view the final image size?

```bash
docker images | grep cardcanvas
```

### How do I get a shell inside the running container?

```bash
docker compose exec cardcanvas /bin/sh
```

Note: It's a `sh` shell, not `bash` (Alpine doesn't include bash by default).

### How do I back up the database?

```bash
docker cp $(docker compose ps -q cardcanvas):/app/data/cardboard.db ./backup.db
```
