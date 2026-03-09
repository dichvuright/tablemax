use mongodb::{bson::Document, options::ClientOptions, Client};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tauri::State;
use tokio::sync::Mutex;

pub type MongoPool = Arc<Mutex<HashMap<String, Client>>>;
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
pub async fn mongo_insert_one(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
    collection: String,
    document: String,
) -> Result<String, String> {
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);
    let coll = db.collection::<Document>(&collection);

    let doc: Document = serde_json::from_str::<Value>(&document)
        .map_err(|e| format!("Invalid JSON: {}", e))
        .and_then(|v| {
            mongodb::bson::to_document(&v)
                .map_err(|e| format!("Failed to convert to BSON: {}", e))
        })?;

    let result = coll.insert_one(doc)
        .await
        .map_err(|e| format!("Insert failed: {}", e))?;

    let id = serde_json::to_string(&result.inserted_id)
        .unwrap_or_else(|_| "unknown".to_string());

    Ok(id)
}

#[tauri::command]
pub async fn mongo_update_one(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
    collection: String,
    filter: String,
    update: String,
) -> Result<u64, String> {
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);
    let coll = db.collection::<Document>(&collection);

    let filter_doc: Document = serde_json::from_str::<Value>(&filter)
        .map_err(|e| format!("Invalid filter JSON: {}", e))
        .and_then(|v| {
            mongodb::bson::to_document(&v)
                .map_err(|e| format!("Failed to convert filter: {}", e))
        })?;

    let update_doc: Document = serde_json::from_str::<Value>(&update)
        .map_err(|e| format!("Invalid update JSON: {}", e))
        .and_then(|v| {
            mongodb::bson::to_document(&v)
                .map_err(|e| format!("Failed to convert update: {}", e))
        })?;
    let final_update = if update_doc.keys().any(|k| k.starts_with('$')) {
        update_doc
    } else {
        mongodb::bson::doc! { "$set": update_doc }
    };

    let result = coll.update_one(filter_doc, final_update)
        .await
        .map_err(|e| format!("Update failed: {}", e))?;

    Ok(result.modified_count)
}

#[tauri::command]
pub async fn mongo_delete_one(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
    collection: String,
    filter: String,
) -> Result<u64, String> {
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);
    let coll = db.collection::<Document>(&collection);

    let filter_doc: Document = serde_json::from_str::<Value>(&filter)
        .map_err(|e| format!("Invalid filter JSON: {}", e))
        .and_then(|v| {
            mongodb::bson::to_document(&v)
                .map_err(|e| format!("Failed to convert filter: {}", e))
        })?;

    let result = coll.delete_one(filter_doc)
        .await
        .map_err(|e| format!("Delete failed: {}", e))?;

    Ok(result.deleted_count)
}

#[tauri::command]
pub async fn mongo_count(
    pool: State<'_, MongoPool>,
    connection_id: String,
    conn_string: String,
    database: String,
    collection: String,
) -> Result<u64, String> {
    let client = get_client(&pool, &connection_id, &conn_string).await?;
    let db = client.database(&database);
    let coll = db.collection::<Document>(&collection);

    let count = coll.estimated_document_count()
        .await
        .map_err(|e| format!("Count failed: {}", e))?;

    Ok(count)
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