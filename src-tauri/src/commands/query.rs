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
    connection_method: Option<String>,
    uri: Option<String>,
    auth_source: Option<String>,
) -> Result<String, String> {
    // If URI mode, return raw URI
    if connection_method.as_deref() == Some("uri") {
        return uri.ok_or_else(|| "URI is required in URI mode".to_string());
    }

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
            let auth_param = match auth_source.as_deref() {
                Some(src) if !src.is_empty() => format!("?authSource={}", src),
                _ => String::new(),
            };

            if username.is_empty() {
                Ok(format!("mongodb://{}:{}/{}{}", host, port, database, auth_param))
            } else {
                Ok(format!(
                    "mongodb://{}:{}@{}:{}/{}{}",
                    username, password, host, port, database, auth_param
                ))
            }
        }
        "redis" => {
            if username.is_empty() && password.is_empty() {
                Ok(format!("redis://{}:{}", host, port))
            } else if username.is_empty() {
                Ok(format!("redis://:{}@{}:{}", password, host, port))
            } else {
                Ok(format!("redis://{}:{}@{}:{}", username, password, host, port))
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
        "redis" => Ok("__redis_list_keys".to_string()),
        _ => Err(format!("Unsupported database type: {}", db_type)),
    }
}
