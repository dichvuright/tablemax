mod commands;

use commands::connection;
use commands::query;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            connection::test_connection,
            connection::connect_db,
            connection::disconnect_db,
            connection::save_connections,
            connection::load_connections,
            query::execute_query,
            query::get_tables,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
