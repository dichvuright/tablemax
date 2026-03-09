use mongodb::{bson::Document, options::ClientOptions, Client};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tauri::State;
use tokio::sync::Mutex;

pub type MongoPool = Arc<Mutex<HashMap<String, Client>>>;

/// Get or create a MongoDB client for the given connection
async fn get_client(
    pool: &MongoPool,
    connection_id: &str,
    conn_string: &str,
) -> Result<Client, String> {
    let mut pool_guard = pool.lock().await;

    if let Some(client) = pool_guard.get(connection_id) {
        return Ok(client.clone());
    }

    let client_options = ClientOptions::parse(conn_string)
        .await
        .map_err(|e| format!("Failed to parse MongoDB connection string: {}", e))?;

    let client = Client::with_options(client_options)
        .map_err(|e| format!("Failed to create MongoDB client: {}", e))?;

    pool_guard.insert(connection_id.to_string(), client.clone());
    Ok(client)
}

#[tauri::command]
pub async fn mongo_test_connection(conn_string: String) -> Result<super::connection::ConnectionTestResult, String> {
    let start = Instant::now();

    let client_options = ClientOptions::parse(&conn_string)
        .await
        .map_err(|e| format!("Invalid connection string: {}", e))?;

    let client = Client::with_options(client_options)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    // Ping the server to verify connection
    let db = client.database("admin");
    db.run_command(mongodb::bson::doc! { "ping": 1 })
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(super::connection::ConnectionTestResult {
        success: true,
        message: "MongoDB connection successful".to_string(),
        latency_ms: Some(elapsed),
    })
}

#[tauri::command]
pub async fn mongo_list_databases(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
) -> Result<Vec<String>, String> {
    let client = get_client(&pool, &connection_id, &conn_string).await?;

    let names = client
        .list_database_names()
        .await
        .map_err(|e| format!("Failed to list databases: {}", e))?;

    Ok(names)
}

#[tauri::command]
pub async fn mongo_list_collections(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
) -> Result<Vec<String>, String> {
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);

    let names = db
        .list_collection_names()
        .await
        .map_err(|e| format!("Failed to list collections: {}", e))?;

    Ok(names)
}

#[tauri::command]
pub async fn mongo_find(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
    collection: String,
    filter: Option<String>,
    limit: Option<i64>,
) -> Result<Value, String> {
    let start = Instant::now();
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);
    let coll = db.collection::<Document>(&collection);

    let filter_doc: Document = match filter {
        Some(f) if !f.trim().is_empty() => {
            serde_json::from_str::<Value>(&f)
                .map_err(|e| format!("Invalid filter JSON: {}", e))
                .and_then(|v| {
                    mongodb::bson::to_document(&v)
                        .map_err(|e| format!("Failed to convert filter: {}", e))
                })?
        }
        _ => Document::new(),
    };

    let limit_val = limit.unwrap_or(100);

    let mut cursor = coll
        .find(filter_doc)
        .limit(limit_val)
        .await
        .map_err(|e| format!("Find failed: {}", e))?;

    let mut rows: Vec<Value> = Vec::new();
    let mut all_keys: Vec<String> = Vec::new();
    let mut key_set = std::collections::HashSet::new();

    use futures_util::StreamExt;
    while let Some(doc) = cursor.next().await {
        let doc = doc.map_err(|e| format!("Document read error: {}", e))?;
        let json_val: Value = mongodb::bson::to_bson(&doc)
            .map_err(|e| format!("BSON conversion error: {}", e))
            .and_then(|bson| {
                serde_json::to_value(&bson).map_err(|e| format!("JSON conversion error: {}", e))
            })?;

        // Collect column keys in order of first appearance
        if let Value::Object(ref map) = json_val {
            for key in map.keys() {
                if key_set.insert(key.clone()) {
                    all_keys.push(key.clone());
                }
            }
        }

        rows.push(json_val);
    }

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(serde_json::json!({
        "columns": all_keys,
        "rows": rows,
        "affected_rows": 0,
        "execution_time_ms": elapsed,
    }))
}

#[tauri::command]
pub async fn mongo_aggregate(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
    collection: String,
    pipeline: String,
) -> Result<Value, String> {
    let start = Instant::now();
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);
    let coll = db.collection::<Document>(&collection);

    let pipeline_val: Vec<Document> = serde_json::from_str::<Vec<Value>>(&pipeline)
        .map_err(|e| format!("Invalid pipeline JSON: {}", e))?
        .into_iter()
        .map(|v| {
            mongodb::bson::to_document(&v)
                .map_err(|e| format!("Failed to convert pipeline stage: {}", e))
        })
        .collect::<Result<Vec<Document>, String>>()?;

    let mut cursor = coll
        .aggregate(pipeline_val)
        .await
        .map_err(|e| format!("Aggregation failed: {}", e))?;

    let mut rows: Vec<Value> = Vec::new();
    let mut all_keys: Vec<String> = Vec::new();
    let mut key_set = std::collections::HashSet::new();

    use futures_util::StreamExt;
    while let Some(doc) = cursor.next().await {
        let doc = doc.map_err(|e| format!("Document read error: {}", e))?;
        let json_val: Value =
            serde_json::to_value(&doc).map_err(|e| format!("JSON conversion error: {}", e))?;

        if let Value::Object(ref map) = json_val {
            for key in map.keys() {
                if key_set.insert(key.clone()) {
                    all_keys.push(key.clone());
                }
            }
        }

        rows.push(json_val);
    }

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(serde_json::json!({
        "columns": all_keys,
        "rows": rows,
        "affected_rows": 0,
        "execution_time_ms": elapsed,
    }))
}

#[tauri::command]
pub async fn mongo_disconnect(
    pool: State<'_, MongoPool>,
    connection_id: String,
) -> Result<(), String> {
    let mut pool_guard = pool.lock().await;
    pool_guard.remove(&connection_id);
    Ok(())
}
