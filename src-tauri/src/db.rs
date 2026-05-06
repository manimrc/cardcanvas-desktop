use std::fs;
use std::path::PathBuf;
use rusqlite::{Connection, Result};
use tauri::{AppHandle, Manager};

pub fn get_data_dir(app: &AppHandle) -> PathBuf {
    let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
    let data_dir = app_data_dir.join("data");
    
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).expect("Failed to create data directory");
    }
    data_dir
}

pub fn get_master_db(app: &AppHandle) -> Result<Connection> {
    let data_dir = get_data_dir(app);
    let db_path = data_dir.join("master.db");
    
    let conn = Connection::open(db_path)?;
    
    // Enable WAL mode
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;

    // Initialize master schema
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            displayName TEXT,
            passwordHash TEXT,
            recoveryHash TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    )?;

    Ok(conn)
}

pub fn get_user_db(app: &AppHandle, user_id: &str) -> Result<Connection> {
    let data_dir = get_data_dir(app);
    let db_name = if user_id.is_empty() {
        "cardboard.db".to_string()
    } else {
        format!("{}.db", user_id)
    };
    
    let db_path = data_dir.join(db_name);
    let conn = Connection::open(db_path)?;
    
    // Enable WAL and foreign keys
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;"
    )?;

    // Initialize workspace schema
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS boards (
            id TEXT PRIMARY KEY,
            folderId TEXT,
            name TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            boardId TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT,
            x REAL NOT NULL,
            y REAL NOT NULL,
            width REAL,
            height REAL,
            color TEXT,
            tags TEXT,
            isLocked INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS uploads (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            mimeType TEXT NOT NULL,
            size INTEGER NOT NULL,
            data BLOB NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS whiteboard (
            boardId TEXT PRIMARY KEY,
            elements TEXT NOT NULL,
            appState TEXT NOT NULL,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
        );"
    )?;

    Ok(conn)
}
