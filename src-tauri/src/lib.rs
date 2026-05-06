mod db;
mod auth;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        auth::register_user,
        auth::login_user,
        auth::reset_password,
        workspace::get_tree,
        workspace::create_folder,
        workspace::create_board,
        workspace::get_cards,
        workspace::create_card,
        workspace::update_card,
        workspace::delete_card,
        workspace::get_all_cards,
        workspace::delete_folder,
        workspace::rename_folder,
        workspace::delete_board,
        workspace::rename_board,
        workspace::get_whiteboard,
        workspace::update_whiteboard
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
