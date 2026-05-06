import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Master database stores only user accounts — never card data.
const DATA_DIR = process.env.CARDCANVAS_DATA_DIR || path.join(process.cwd(), 'data');
const MASTER_DB_PATH = path.join(DATA_DIR, 'master.db');

let masterDb: Database.Database | null = null;

export function getMasterDb(): Database.Database {
  if (!masterDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    masterDb = new Database(MASTER_DB_PATH);
    masterDb.pragma('journal_mode = WAL');
    masterDb.pragma('foreign_keys = ON');

    masterDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        displayName TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        recoveryHash TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Add column if migrating from an older version
    try {
      masterDb.exec('ALTER TABLE users ADD COLUMN recoveryHash TEXT');
    } catch (e) {}
  }
  return masterDb;
}

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  recoveryHash?: string | null;
  createdAt: string;
}
