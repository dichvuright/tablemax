mod commands;
mod bridge;

use commands::connection;
use commands::mongodb as mongo_cmd;
use commands::query;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(mongo_cmd::MongoPool::default())
        .invoke_handler(tauri::generate_handler![
            connection::test_connection,
            connection::connect_db,
            connection::disconnect_db,
            connection::save_connections,
            connection::load_connections,
            query::build_connection_string,
            query::get_list_tables_query,
            mongo_cmd::mongo_test_connection,
            mongo_cmd::mongo_list_databases,
            mongo_cmd::mongo_list_collections,
            mongo_cmd::mongo_find,
            mongo_cmd::mongo_aggregate,
            mongo_cmd::mongo_insert_one,
            mongo_cmd::mongo_update_one,
            mongo_cmd::mongo_delete_one,
            mongo_cmd::mongo_count,
            mongo_cmd::mongo_disconnect,
            bridge::cpp_bridge::engine_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
