use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use crate::db::get_master_db;

#[derive(Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub displayName: String,
}

#[derive(Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user: User,
    pub recoveryCode: String,
}

#[tauri::command]
pub fn register_user(app: AppHandle, username: String, password: String, display_name: Option<String>) -> Result<RegisterResponse, String> {
    if username.len() < 3 || password.len() < 4 {
        return Err("Username must be at least 3 characters and password at least 4".to_string());
    }

    let username_lower = username.to_lowercase();
    let conn = get_master_db(&app).map_err(|e| format!("DB Error: {}", e))?;

    // Check if user exists
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE username = ?1",
        [&username_lower],
        |row| row.get(0),
    ).map_err(|e| format!("DB Error: {}", e))?;

    if count > 0 {
        return Err("Username already exists".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let name = display_name.unwrap_or(username.clone());
    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| format!("Hash Error: {}", e))?;

    // Generate 12-char recovery code
    let raw_recovery = Uuid::new_v4().to_string().replace("-", "").chars().take(12).collect::<String>().to_uppercase();
    let recovery_code = format!("{}-{}-{}", &raw_recovery[0..4], &raw_recovery[4..8], &raw_recovery[8..12]);
    let recovery_hash = hash(&raw_recovery, DEFAULT_COST).map_err(|e| format!("Hash Error: {}", e))?;

    conn.execute(
        "INSERT INTO users (id, username, displayName, passwordHash, recoveryHash) VALUES (?1, ?2, ?3, ?4, ?5)",
        [&id, &username_lower, &name, &password_hash, &recovery_hash],
    ).map_err(|e| format!("DB Error: {}", e))?;

    Ok(RegisterResponse {
        user: User {
            id,
            username: username_lower,
            displayName: name,
        },
        recoveryCode: recovery_code,
    })
}

#[tauri::command]
pub fn login_user(app: AppHandle, username: String, password: String) -> Result<User, String> {
    let username_lower = username.to_lowercase();
    let conn = get_master_db(&app).map_err(|e| format!("DB Error: {}", e))?;

    let mut stmt = conn.prepare("SELECT id, displayName, passwordHash FROM users WHERE username = ?1").map_err(|e| format!("DB Error: {}", e))?;
    
    let user_data = stmt.query_row([&username_lower], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    });

    match user_data {
        Ok((id, display_name, password_hash)) => {
            if verify(&password, &password_hash).unwrap_or(false) {
                Ok(User {
                    id,
                    username: username_lower,
                    displayName: display_name,
                })
            } else {
                Err("Invalid username or password".to_string())
            }
        }
        Err(_) => Err("Invalid username or password".to_string())
    }
}

#[tauri::command]
pub fn reset_password(app: AppHandle, username: String, recovery_code: String, new_password: String) -> Result<String, String> {
    if new_password.len() < 4 {
        return Err("Password must be at least 4 characters".to_string());
    }

    let username_lower = username.to_lowercase();
    let conn = get_master_db(&app).map_err(|e| format!("DB Error: {}", e))?;

    let mut stmt = conn.prepare("SELECT id, recoveryHash FROM users WHERE username = ?1").map_err(|e| format!("DB Error: {}", e))?;
    let user_data = stmt.query_row([&username_lower], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
        ))
    });

    match user_data {
        Ok((id, recovery_hash)) => {
            let raw_code = recovery_code.replace("-", "");
            if verify(&raw_code, &recovery_hash).unwrap_or(false) {
                let new_hash = hash(&new_password, DEFAULT_COST).map_err(|e| format!("Hash Error: {}", e))?;
                conn.execute(
                    "UPDATE users SET passwordHash = ?1 WHERE id = ?2",
                    [&new_hash, &id],
                ).map_err(|e| format!("DB Error: {}", e))?;
                Ok("Password reset successfully".to_string())
            } else {
                Err("Invalid recovery code".to_string())
            }
        }
        Err(_) => Err("Invalid username or recovery code".to_string())
    }
}
