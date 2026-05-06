use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use crate::db::get_user_db;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct Folder {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Board {
    pub id: String,
    pub folderId: Option<String>,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Card {
    pub id: String,
    pub boardId: String,
    pub r#type: String, // using r#type because 'type' is a Rust keyword
    pub content: Option<String>,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub color: Option<String>,
    pub tags: Option<String>,
    pub isLocked: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FolderTree {
    pub folders: Vec<Folder>,
    pub boards: Vec<Board>,
}

#[tauri::command]
pub fn get_tree(app: AppHandle, user_id: String) -> Result<FolderTree, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| format!("DB Error: {}", e))?;
    
    let mut folder_stmt = conn.prepare("SELECT id, name FROM folders").map_err(|e| e.to_string())?;
    let folders: Vec<Folder> = folder_stmt.query_map([], |row| {
        Ok(Folder {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(Result::ok).collect();

    let mut board_stmt = conn.prepare("SELECT id, folderId, name FROM boards").map_err(|e| e.to_string())?;
    let boards: Vec<Board> = board_stmt.query_map([], |row| {
        Ok(Board {
            id: row.get(0)?,
            folderId: row.get(1)?,
            name: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(Result::ok).collect();

    Ok(FolderTree { folders, boards })
}

#[tauri::command]
pub fn create_folder(app: AppHandle, user_id: String, name: String) -> Result<Folder, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    conn.execute("INSERT INTO folders (id, name) VALUES (?1, ?2)", [&id, &name]).map_err(|e| e.to_string())?;
    
    Ok(Folder { id, name })
}

#[tauri::command]
pub fn create_board(app: AppHandle, user_id: String, folder_id: Option<String>, name: String) -> Result<Board, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO boards (id, folderId, name) VALUES (?1, ?2, ?3)",
        rusqlite::params![&id, &folder_id, &name],
    ).map_err(|e| e.to_string())?;
    
    Ok(Board { id, folderId: folder_id, name })
}

#[tauri::command]
pub fn get_cards(app: AppHandle, user_id: String, board_id: String) -> Result<Vec<Card>, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, boardId, type, content, x, y, width, height, color, tags, isLocked FROM cards WHERE boardId = ?1").map_err(|e| e.to_string())?;
    
    let cards: Vec<Card> = stmt.query_map([&board_id], |row| {
        let is_locked: i32 = row.get(10)?;
        Ok(Card {
            id: row.get(0)?,
            boardId: row.get(1)?,
            r#type: row.get(2)?,
            content: row.get(3)?,
            x: row.get(4)?,
            y: row.get(5)?,
            width: row.get(6)?,
            height: row.get(7)?,
            color: row.get(8)?,
            tags: row.get(9)?,
            isLocked: is_locked == 1,
        })
    }).map_err(|e| e.to_string())?.filter_map(Result::ok).collect();

    Ok(cards)
}

#[tauri::command]
pub fn create_card(app: AppHandle, user_id: String, card: Card) -> Result<Card, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let is_locked = if card.isLocked { 1 } else { 0 };
    
    conn.execute(
        "INSERT INTO cards (id, boardId, type, content, x, y, width, height, color, tags, isLocked) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![&card.id, &card.boardId, &card.r#type, &card.content, &card.x, &card.y, &card.width, &card.height, &card.color, &card.tags, is_locked],
    ).map_err(|e| e.to_string())?;
    
    Ok(card)
}

#[tauri::command]
pub fn update_card(app: AppHandle, user_id: String, card: Card) -> Result<Card, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let is_locked = if card.isLocked { 1 } else { 0 };
    
    conn.execute(
        "UPDATE cards SET type = ?1, content = ?2, x = ?3, y = ?4, width = ?5, height = ?6, color = ?7, tags = ?8, isLocked = ?9 WHERE id = ?10 AND boardId = ?11",
        rusqlite::params![&card.r#type, &card.content, &card.x, &card.y, &card.width, &card.height, &card.color, &card.tags, is_locked, &card.id, &card.boardId],
    ).map_err(|e| e.to_string())?;
    
    Ok(card)
}

#[tauri::command]
pub fn delete_card(app: AppHandle, user_id: String, board_id: String, card_id: String) -> Result<bool, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM cards WHERE id = ?1 AND boardId = ?2",
        [&card_id, &board_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub fn delete_folder(app: AppHandle, user_id: String, folder_id: String) -> Result<bool, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM folders WHERE id = ?1", [&folder_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn rename_folder(app: AppHandle, user_id: String, folder_id: String, name: String) -> Result<bool, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    conn.execute("UPDATE folders SET name = ?1 WHERE id = ?2", [&name, &folder_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_board(app: AppHandle, user_id: String, board_id: String) -> Result<bool, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM boards WHERE id = ?1", [&board_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn rename_board(app: AppHandle, user_id: String, board_id: String, name: String) -> Result<bool, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    conn.execute("UPDATE boards SET name = ?1 WHERE id = ?2", [&name, &board_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_all_cards(app: AppHandle, user_id: String) -> Result<Vec<Card>, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, boardId, type, content, x, y, width, height, color, tags, isLocked FROM cards").map_err(|e| e.to_string())?;
    
    let cards: Vec<Card> = stmt.query_map([], |row| {
        let is_locked: i32 = row.get(10)?;
        Ok(Card {
            id: row.get(0)?,
            boardId: row.get(1)?,
            r#type: row.get(2)?,
            content: row.get(3)?,
            x: row.get(4)?,
            y: row.get(5)?,
            width: row.get(6)?,
            height: row.get(7)?,
            color: row.get(8)?,
            tags: row.get(9)?,
            isLocked: is_locked == 1,
        })
    }).map_err(|e| e.to_string())?.filter_map(Result::ok).collect();

    Ok(cards)
}

#[derive(Serialize, Deserialize)]
pub struct WhiteboardData {
    pub elements: String,
    pub appState: String,
}

#[tauri::command]
pub fn get_whiteboard(app: AppHandle, user_id: String, board_id: String) -> Result<WhiteboardData, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT elements, appState FROM whiteboard WHERE boardId = ?1").map_err(|e| e.to_string())?;
    let row = stmt.query_row([&board_id], |r| {
        Ok(WhiteboardData {
            elements: r.get(0)?,
            appState: r.get(1)?,
        })
    });

    match row {
        Ok(data) => Ok(data),
        Err(_) => Ok(WhiteboardData {
            elements: "[]".to_string(),
            appState: "{}".to_string(),
        })
    }
}

#[tauri::command]
pub fn update_whiteboard(app: AppHandle, user_id: String, board_id: String, elements: String, app_state: String) -> Result<bool, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO whiteboard (boardId, elements, appState, updatedAt) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
         ON CONFLICT(boardId) DO UPDATE SET elements=excluded.elements, appState=excluded.appState, updatedAt=CURRENT_TIMESTAMP",
        [&board_id, &elements, &app_state],
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}
