/// Build a connection string from the connection parameters.
/// This is used by the frontend to pass to the tauri-plugin-sql JS API.
#[tauri::command]
pub fn build_connection_string(
    db_type: String,
    host: String,
    port: u16,
    username: String,
    password: String,
    database: String,
) -> Result<String, String> {
    match db_type.as_str() {
        "mysql" => Ok(format!(
            "mysql://{}:{}@{}:{}/{}",
            username, password, host, port, database
        )),
        "postgres" => Ok(format!(
            "postgres://{}:{}@{}:{}/{}",
            username, password, host, port, database
        )),
        "sqlite" => Ok(format!("sqlite:{}", database)),
        "mongodb" => {
            if username.is_empty() {
                Ok(format!("mongodb://{}:{}/{}", host, port, database))
            } else {
                Ok(format!("mongodb://{}:{}@{}:{}/{}", username, password, host, port, database))
            }
        }
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}

/// Get the appropriate SQL query to list tables for a given database type
#[tauri::command]
pub fn get_list_tables_query(db_type: String) -> Result<String, String> {
    match db_type.as_str() {
        "mysql" => Ok("SHOW TABLES".to_string()),
        "postgres" => Ok("SELECT tablename FROM pg_tables WHERE schemaname = 'public'".to_string()),
        "sqlite" => Ok("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name".to_string()),
        "mongodb" => Ok("__mongo_list_collections".to_string()),
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}
