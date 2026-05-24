-- CardCanvas SQLite Schema

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    recovery_hash TEXT,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS folders (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT,
    url        TEXT,
    content    TEXT,
    x          REAL NOT NULL DEFAULT 0.0,
    y          REAL NOT NULL DEFAULT 0.0,
    width      REAL,
    height     REAL,
    color      TEXT,
    tags       TEXT NOT NULL DEFAULT '[]',
    is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whiteboard (
    board_id   TEXT PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    elements   TEXT NOT NULL DEFAULT '[]',
    app_state  TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    mime_type  TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date          TEXT NOT NULL,
    mood                TEXT,
    mood_score          REAL NOT NULL DEFAULT 5.0,
    grateful_text       TEXT,
    content             TEXT,
    long_term_vision    TEXT,
    tiny_win            TEXT,
    reflection_answers  TEXT NOT NULL DEFAULT '[]',
    tags                TEXT NOT NULL DEFAULT '[]',
    photo_urls          TEXT NOT NULL DEFAULT '[]',
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, entry_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_user_id  ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_board_id ON cards(board_id);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_id    ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_date  ON journal_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_mood       ON journal_entries(user_id, mood);
