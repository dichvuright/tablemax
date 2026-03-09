use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseConnection {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    #[serde(rename = "connectionMethod")]
    pub connection_method: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
    #[serde(default)]
    pub uri: Option<String>,
    pub color: String,
    #[serde(default)]
    pub ssl: Option<bool>,
    #[serde(default, rename = "authSource")]
    pub auth_source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
}

impl DatabaseConnection {
    /// Build a connection string based on database type
    pub fn connection_string(&self) -> String {
        if self.connection_method == "uri" {
            return self.uri.clone().unwrap_or_default();
        }

        match self.db_type.as_str() {
            "mysql" => format!(
                "mysql://{}:{}@{}:{}/{}",
                self.username, self.password, self.host, self.port, self.database
            ),
            "postgres" => format!(
                "postgres://{}:{}@{}:{}/{}",
                self.username, self.password, self.host, self.port, self.database
            ),
            "sqlite" => format!("sqlite:{}", self.database),
            "mongodb" => {
                let auth_source = self.auth_source.as_deref().unwrap_or("");
                let auth_param = if !auth_source.is_empty() {
                    format!("?authSource={}", auth_source)
                } else {
                    String::new()
                };
                if self.username.is_empty() {
                    format!("mongodb://{}:{}/{}{}", self.host, self.port, self.database, auth_param)
                } else {
                    format!(
                        "mongodb://{}:{}@{}:{}/{}{}",
                        self.username, self.password, self.host, self.port, self.database, auth_param
                    )
                }
            }
            "redis" => {
                if self.username.is_empty() && self.password.is_empty() {
                    format!("redis://{}:{}", self.host, self.port)
                } else if self.username.is_empty() {
                    format!("redis://:{}@{}:{}", self.password, self.host, self.port)
                } else {
                    format!("redis://{}:{}@{}:{}", self.username, self.password, self.host, self.port)
                }
            }
            _ => String::new(),
        }
    }
}

#[tauri::command]
pub async fn test_connection(connection: DatabaseConnection) -> Result<ConnectionTestResult, String> {
    let start = Instant::now();

    match connection.db_type.as_str() {
        "sqlite" => {
            // SQLite: just validate path is non-empty
            if connection.database.trim().is_empty() {
                return Ok(ConnectionTestResult {
                    success: false,
                    message: "Database path is required for SQLite".to_string(),
                    latency_ms: None,
                });
            }
            let elapsed = start.elapsed().as_millis() as u64;
            Ok(ConnectionTestResult {
                success: true,
                message: "SQLite connection ready".to_string(),
                latency_ms: Some(elapsed),
            })
        }
        "mysql" | "postgres" | "redis" => {
            // Actually test TCP connectivity to host:port
            let addr = format!("{}:{}", connection.host, connection.port);

            match tokio::time::timeout(
                std::time::Duration::from_secs(5),
                tokio::net::TcpStream::connect(&addr),
            )
            .await
            {
                Ok(Ok(_stream)) => {
                    let elapsed = start.elapsed().as_millis() as u64;
                    Ok(ConnectionTestResult {
                        success: true,
                        message: format!(
                            "{} server reachable at {}",
                            connection.db_type.to_uppercase(),
                            addr
                        ),
                        latency_ms: Some(elapsed),
                    })
                }
                Ok(Err(e)) => Ok(ConnectionTestResult {
                    success: false,
                    message: format!("Connection refused: {}", e),
                    latency_ms: None,
                }),
                Err(_) => Ok(ConnectionTestResult {
                    success: false,
                    message: format!("Connection timed out after 5s to {}", addr),
                    latency_ms: None,
                }),
            }
        }
        // MongoDB uses its own dedicated command (mongo_test_connection)
        "mongodb" => Ok(ConnectionTestResult {
            success: false,
            message: "Use MongoDB-specific test handler".to_string(),
            latency_ms: None,
        }),
        _ => Ok(ConnectionTestResult {
            success: false,
            message: format!("Unsupported database type: {}", connection.db_type),
            latency_ms: None,
        }),
    }
}

#[tauri::command]
pub async fn connect_db(connection_id: String) -> Result<(), String> {
    if connection_id.is_empty() {
        return Err("Connection ID is required".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn disconnect_db(connection_id: String) -> Result<(), String> {
    if connection_id.is_empty() {
        return Err("Connection ID is required".to_string());
    }
    Ok(())
}

const STORE_FILE: &str = "connections.json";
const STORE_KEY: &str = "connections";

#[tauri::command]
pub async fn save_connections(
    app: AppHandle,
    connections: Vec<DatabaseConnection>,
) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    let json_value = serde_json::to_value(&connections).map_err(|e| e.to_string())?;
    store.set(STORE_KEY, json_value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_connections(app: AppHandle) -> Result<Vec<DatabaseConnection>, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    match store.get(STORE_KEY) {
        Some(value) => {
            let connections: Vec<DatabaseConnection> =
                serde_json::from_value(value.clone()).map_err(|e| e.to_string())?;
            Ok(connections)
        }
        None => Ok(vec![]),
    }
}
