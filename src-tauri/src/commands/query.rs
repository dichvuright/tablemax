use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use std::time::Instant;
use std::collections::HashMap;

use super::connection::DatabaseConnection;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<HashMap<String, serde_json::Value>>,
    pub affected_rows: u64,
    pub execution_time_ms: u64,
}

const STORE_FILE: &str = "connections.json";
const STORE_KEY: &str = "connections";

fn get_connection_by_id(app: &AppHandle, connection_id: &str) -> Result<DatabaseConnection, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    match store.get(STORE_KEY) {
        Some(value) => {
            let connections: Vec<DatabaseConnection> =
                serde_json::from_value(value.clone()).map_err(|e| e.to_string())?;
            connections
                .into_iter()
                .find(|c| c.id == connection_id)
                .ok_or_else(|| format!("Connection '{}' not found", connection_id))
        }
        None => Err("No connections found".to_string()),
    }
}

#[tauri::command]
pub async fn execute_query(
    app: AppHandle,
    connection_id: String,
    query: String,
) -> Result<QueryResult, String> {
    let connection = get_connection_by_id(&app, &connection_id)?;
    let conn_string = connection.connection_string();
    let start = Instant::now();

    // Use tauri-plugin-sql's Database to execute queries
    // The SQL plugin handles the actual database connection
    use tauri_plugin_sql::{DbInstances, DbPool};

    let db_instances = app.state::<DbInstances>();
    let mut instances = db_instances.0.lock().await;

    // Check if connection already exists, if not create it
    if !instances.contains_key(&conn_string) {
        let pool = DbPool::connect(&conn_string, &app)
            .await
            .map_err(|e| format!("Failed to connect: {}", e))?;
        instances.insert(conn_string.clone(), pool);
    }

    let db = instances
        .get(&conn_string)
        .ok_or("Database connection not found")?;

    // Determine if this is a SELECT/read query or a write query
    let trimmed = query.trim().to_uppercase();
    let is_select = trimmed.starts_with("SELECT")
        || trimmed.starts_with("SHOW")
        || trimmed.starts_with("DESCRIBE")
        || trimmed.starts_with("EXPLAIN")
        || trimmed.starts_with("PRAGMA");

    if is_select {
        // Execute as a select query
        let result: Vec<HashMap<String, serde_json::Value>> = db
            .select(&query, vec![])
            .await
            .map_err(|e| format!("Query error: {}", e))?;

        let columns = if let Some(first_row) = result.first() {
            first_row.keys().cloned().collect()
        } else {
            vec![]
        };

        let elapsed = start.elapsed().as_millis() as u64;

        Ok(QueryResult {
            columns,
            rows: result,
            affected_rows: 0,
            execution_time_ms: elapsed,
        })
    } else {
        // Execute as a write query
        let (affected, _last_insert_id) = db
            .execute(&query, vec![])
            .await
            .map_err(|e| format!("Query error: {}", e))?;

        let elapsed = start.elapsed().as_millis() as u64;

        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            affected_rows: affected,
            execution_time_ms: elapsed,
        })
    }
}

#[tauri::command]
pub async fn get_tables(
    app: AppHandle,
    connection_id: String,
) -> Result<Vec<String>, String> {
    let connection = get_connection_by_id(&app, &connection_id)?;

    let query = match connection.db_type.as_str() {
        "mysql" => "SHOW TABLES".to_string(),
        "postgres" => "SELECT tablename FROM pg_tables WHERE schemaname = 'public'".to_string(),
        "sqlite" => "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name".to_string(),
        _ => return Err("Unsupported database type".to_string()),
    };

    let result = execute_query(app, connection_id, query).await?;

    let tables: Vec<String> = result
        .rows
        .iter()
        .filter_map(|row| {
            row.values()
                .next()
                .and_then(|v| v.as_str().map(|s| s.to_string()))
        })
        .collect();

    Ok(tables)
}
