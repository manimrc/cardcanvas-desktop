use tauri::AppHandle;
use crate::db::get_user_db;
use uuid::Uuid;

#[tauri::command]
pub fn upload_media(
    app: AppHandle,
    user_id: String,
    filename: String,
    mime_type: String,
    data: Vec<u8>
) -> Result<String, String> {
    let conn = get_user_db(&app, &user_id).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let size = data.len() as i64;
    
    conn.execute(
        "INSERT INTO uploads (id, filename, mimeType, size, data) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &filename, &mime_type, &size, &data],
    ).map_err(|e| e.to_string())?;
    
    // Return custom media protocol URL
    Ok(format!("media://localhost/{}/{}", user_id, id))
}

pub fn get_media_handler(app: &AppHandle, uri: &str) -> Result<(Vec<u8>, String), String> {
    // uri is like media://localhost/{user_id}/{upload_id}
    let parts: Vec<&str> = uri.split('/').collect();
    if parts.len() < 5 {
        return Err("Invalid URI".to_string());
    }
    
    let user_id = parts[3];
    let upload_id = parts[4];
    
    let conn = get_user_db(app, user_id).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT data, mimeType FROM uploads WHERE id = ?1").map_err(|e| e.to_string())?;
    
    let result = stmt.query_row([&upload_id], |row| {
        let data: Vec<u8> = row.get(0)?;
        let mime_type: String = row.get(1)?;
        Ok((data, mime_type))
    }).map_err(|e| e.to_string())?;
    
    Ok(result)
}
