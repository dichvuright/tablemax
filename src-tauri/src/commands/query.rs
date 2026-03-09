use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub affected_rows: u64,
    pub execution_time_ms: u64,
}

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
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}
