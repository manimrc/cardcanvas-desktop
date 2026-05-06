import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// In desktop (Electron) mode, CARDCANVAS_DATA_DIR points to the user's app data folder.
// In dev/web mode, fall back to ./data in the project root.
const DATA_DIR = process.env.CARDCANVAS_DATA_DIR || path.join(process.cwd(), 'data');

// Cache of open database connections keyed by userId
const dbCache = new Map<string, Database.Database>();

/**
 * Get the database for a specific user.
 * Each user has their own isolated SQLite file: data/<userId>.db
 * This means all existing SQL queries work unchanged — the isolation
 * is at the file level, not the query level.
 */
export function getDb(userId?: string): Database.Database {
  // Fall back to legacy single-user mode if no userId provided
  const key = userId || '__default__';
  const dbFileName = userId ? `${userId}.db` : 'cardboard.db';
  const dbPath = path.join(DATA_DIR, dbFileName);

  const cached = dbCache.get(key);
  if (cached) return cached;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeDatabase(db);
  dbCache.set(key, db);
  return db;
}

/** Legacy DBs had uploads.cardId NOT NULL + FK; allow standalone uploads for Add Media. */
function migrateUploadsOptionalCardId(db: Database.Database) {
  try {
    const cols = db.prepare('PRAGMA table_info(uploads)').all() as { name: string; notnull: number }[];
    if (!cols.length) return;
    const cardCol = cols.find(c => c.name === 'cardId');
    if (!cardCol || cardCol.notnull === 0) return;
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN;
      CREATE TABLE uploads__migrated (
        id TEXT PRIMARY KEY,
        cardId TEXT,
        filename TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        data BLOB NOT NULL,
        createdAt TEXT NOT NULL
      );
      INSERT INTO uploads__migrated SELECT id, cardId, filename, mimetype, data, createdAt FROM uploads;
      DROP TABLE uploads;
      ALTER TABLE uploads__migrated RENAME TO uploads;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  } catch {
    /* already migrated or no uploads table */
  }
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      parentId TEXT,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      folderId TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      boardId TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'richtext',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      url TEXT,
      color TEXT NOT NULL DEFAULT '#FFF9C4',
      x REAL NOT NULL DEFAULT 100,
      y REAL NOT NULL DEFAULT 100,
      width REAL NOT NULL DEFAULT 280,
      height REAL NOT NULL DEFAULT 200,
      zIndex INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      cardId TEXT,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      data BLOB NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS whiteboard (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default whiteboard if empty
  const wbCount = db.prepare('SELECT COUNT(*) as count FROM whiteboard').get() as { count: number };
  if (wbCount.count === 0) {
    db.prepare('INSERT INTO whiteboard (id, content, updatedAt) VALUES (?, ?, ?)').run(
      'default',
      '<h1>My Whiteboard</h1><p>Start typing, paste images, or drop content here...</p>',
      new Date().toISOString()
    );
  }

  try {
    db.exec('ALTER TABLE cards ADD COLUMN tags TEXT DEFAULT "[]"');
  } catch (e) {}

  migrateUploadsOptionalCardId(db);

  // Seed default data if empty
  const folderCount = db.prepare('SELECT COUNT(*) as count FROM folders').get() as { count: number };
  if (folderCount.count === 0) {
    const rootFolderId = uuidv4();
    const boardId = uuidv4();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO folders (id, parentId, name, createdAt, updatedAt) VALUES (?, NULL, ?, ?, ?)').run(rootFolderId, 'My Workspace', now, now);
    db.prepare('INSERT INTO boards (id, folderId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run(boardId, rootFolderId, 'Getting Started', now, now);

    // Create a welcome card
    const welcomeCardId = uuidv4();
    db.prepare(`
      INSERT INTO cards (id, boardId, type, title, content, color, x, y, width, height, zIndex, createdAt, updatedAt)
      VALUES (?, ?, 'richtext', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      welcomeCardId, boardId,
      'Welcome to CardCanvas! 🎉',
      '<h2>Welcome to CardCanvas!</h2><p>Double-click this card to edit it. Right-click the canvas to add new cards.</p><p><strong>Card Types:</strong></p><ul><li>📝 Rich Text</li><li>🔗 Links</li><li>🖼️ Images</li><li>📄 PDFs</li><li>📰 Clipped Articles</li></ul>',
      '#E3F2FD',
      200, 150, 340, 280, 1, now, now
    );

    const tipCardId = uuidv4();
    db.prepare(`
      INSERT INTO cards (id, boardId, type, title, content, color, x, y, width, height, zIndex, createdAt, updatedAt)
      VALUES (?, ?, 'richtext', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tipCardId, boardId,
      'Quick Tips 💡',
      '<h3>Quick Tips</h3><ul><li>🖱️ <strong>Pan</strong>: Click &amp; drag on empty space</li><li>🔍 <strong>Zoom</strong>: Scroll wheel or pinch</li><li>✏️ <strong>Edit</strong>: Double-click any card</li><li>🎨 <strong>Color</strong>: Use the color picker in toolbar</li><li>📁 <strong>Organize</strong>: Use folders in the sidebar</li></ul>',
      '#F3E5F5',
      600, 180, 320, 260, 2, now, now
    );
  }
}
