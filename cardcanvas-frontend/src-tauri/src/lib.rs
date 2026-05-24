use tauri::Manager;
use cardcanvas_backend::{init_app_state, start_axum_server, state::AppState};
use uuid::Uuid;

#[tauri::command]
async fn upload_media(
    state: tauri::State<'_, AppState>,
    user_id: String,
    filename: String,
    mime_type: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|e| e.to_string())?;

    let response = state
        .media_service
        .save_file(user_uuid, filename, mime_type, data)
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.url)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // 1. Resolve OS-specific App Data Directory for CardCanvas
      let app_data_dir = app.path().app_data_dir().expect("failed to resolve app data directory");
      
      let db_dir = app_data_dir.join("db");
      let media_dir = app_data_dir.join("media");

      // 2. Ensure directories exist
      std::fs::create_dir_all(&db_dir).expect("failed to create database folder");
      std::fs::create_dir_all(&media_dir).expect("failed to create media folder");

      // 3. Construct local SQLite database path and URL
      let db_path = db_dir.join("cardcanvas.db");
      let database_url = format!("sqlite://{}", db_path.to_str().expect("invalid database path"));
      let media_dir_str = media_dir.to_str().expect("invalid media directory path").to_string();

      // 4. Generate a secure, single-session JWT secret
      let jwt_secret = Uuid::new_v4().to_string();

      println!("Initializing local CardCanvas database at: {}", db_path.display());
      println!("Local media uploads stored at: {}", media_dir.display());

      // 5. Initialize SQLite database pool, run migrations, and construct AppState
      match tauri::async_runtime::block_on(init_app_state(&database_url, jwt_secret, media_dir_str)) {
        Ok(state) => {
          // Manage AppState in Tauri so commands can access it
          app.manage(state.clone());

          // 6. Spawn the Axum server in a background thread
          tauri::async_runtime::spawn(async move {
            println!("Spawning local Axum API server on background thread...");
            if let Err(e) = start_axum_server(state).await {
              eprintln!("Axum server error: {}", e);
            }
          });
          println!("Axum backend thread spawned successfully.");
        }
        Err(e) => {
          eprintln!("CRITICAL ERROR: Failed to initialize SQLite backend state: {}", e);
          eprintln!("The desktop app backend server could not be started.");
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![upload_media])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
