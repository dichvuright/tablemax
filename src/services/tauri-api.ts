import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import type { DatabaseConnection, ConnectionTestResult, QueryResult } from '../../shared/types/connection';

// Connection persistence (via Rust commands)
export async function saveConnections(connections: DatabaseConnection[]): Promise<void> {
  return invoke('save_connections', { connections });
}

export async function loadConnections(): Promise<DatabaseConnection[]> {
  return invoke<DatabaseConnection[]>('load_connections');
}

// Connection testing (via Rust commands)
export async function testConnection(connection: DatabaseConnection): Promise<ConnectionTestResult> {
  if (connection.type === 'mongodb') {
    const connString = buildMongoConnectionString(connection);
    return invoke<ConnectionTestResult>('mongo_test_connection', { connString });
  }
  return invoke<ConnectionTestResult>('test_connection', { connection });
}

// Connection management (via Rust for validation)
export async function connectDatabase(connectionId: string): Promise<void> {
  return invoke('connect_db', { connectionId });
}

export async function disconnectDatabase(connectionId: string): Promise<void> {
  return invoke('disconnect_db', { connectionId });
}

// Build connection string (via Rust)
export async function buildConnectionString(connection: DatabaseConnection): Promise<string> {
  return invoke<string>('build_connection_string', {
    dbType: connection.type,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    database: connection.database,
  });
}

// Build MongoDB connection string locally (for frontend use)
function buildMongoConnectionString(connection: DatabaseConnection): string {
  const { host, port, username, password, database } = connection;
  if (!username) {
    return `mongodb://${host}:${port}/${database}`;
  }
  return `mongodb://${username}:${password}@${host}:${port}/${database}`;
}

// Get list tables query (via Rust)
export async function getListTablesQuery(dbType: string): Promise<string> {
  return invoke<string>('get_list_tables_query', { dbType });
}

// Database connection pool (frontend-side via tauri-plugin-sql) — SQL databases only
const dbPool: Map<string, Database> = new Map();

export async function getDbConnection(connection: DatabaseConnection): Promise<Database> {
  if (connection.type === 'mongodb') {
    throw new Error('Use MongoDB-specific functions for MongoDB connections');
  }

  const existing = dbPool.get(connection.id);
  if (existing) return existing;

  const connString = await buildConnectionString(connection);
  const db = await Database.load(connString);
  dbPool.set(connection.id, db);
  return db;
}

export async function closeDbConnection(connectionId: string): Promise<void> {
  const db = dbPool.get(connectionId);
  if (db) {
    await db.close();
    dbPool.delete(connectionId);
  }
  // Also disconnect MongoDB if applicable
  await invoke('mongo_disconnect', { connectionId }).catch(() => {});
}

// ─── MongoDB-specific functions ─────────────────────────────────

export async function mongoListCollections(connection: DatabaseConnection): Promise<string[]> {
  const connString = buildMongoConnectionString(connection);
  return invoke<string[]>('mongo_list_collections', {
    connectionId: connection.id,
    connString,
    database: connection.database,
  });
}

export async function mongoFind(
  connection: DatabaseConnection,
  collection: string,
  filter?: string,
  limit?: number,
): Promise<QueryResult> {
  const connString = buildMongoConnectionString(connection);
  return invoke<QueryResult>('mongo_find', {
    connectionId: connection.id,
    connString,
    database: connection.database,
    collection,
    filter: filter || null,
    limit: limit || 100,
  });
}

export async function mongoAggregate(
  connection: DatabaseConnection,
  collection: string,
  pipeline: string,
): Promise<QueryResult> {
  const connString = buildMongoConnectionString(connection);
  return invoke<QueryResult>('mongo_aggregate', {
    connectionId: connection.id,
    connString,
    database: connection.database,
    collection,
    pipeline,
  });
}

// ─── Unified query execution ─────────────────────────────────

export async function executeQuery(
  connection: DatabaseConnection,
  query: string,
): Promise<QueryResult> {
  // MongoDB path
  if (connection.type === 'mongodb') {
    return executeMongoQuery(connection, query);
  }

  // SQL path (via tauri-plugin-sql JS API)
  const start = performance.now();
  const db = await getDbConnection(connection);

  const trimmed = query.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT')
    || trimmed.startsWith('SHOW')
    || trimmed.startsWith('DESCRIBE')
    || trimmed.startsWith('EXPLAIN')
    || trimmed.startsWith('PRAGMA');

  if (isSelect) {
    const rows = await db.select<Record<string, unknown>[]>(query);
    const elapsed = Math.round(performance.now() - start);

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
      columns,
      rows,
      affected_rows: 0,
      execution_time_ms: elapsed,
    };
  } else {
    const result = await db.execute(query);
    const elapsed = Math.round(performance.now() - start);

    return {
      columns: [],
      rows: [],
      affected_rows: result.rowsAffected,
      execution_time_ms: elapsed,
    };
  }
}

/**
 * Parse and execute MongoDB queries.
 * Supports:
 *   db.collection.find({filter})
 *   db.collection.aggregate([pipeline])
 *   Just a collection name → defaults to find({})
 */
async function executeMongoQuery(
  connection: DatabaseConnection,
  query: string,
): Promise<QueryResult> {
  const trimmed = query.trim();

  // Pattern: db.collectionName.find({...})
  const findMatch = trimmed.match(/^db\.(\w+)\.find\((.*)?\)$/s);
  if (findMatch) {
    const collection = findMatch[1];
    const filter = findMatch[2]?.trim() || '';
    return mongoFind(connection, collection, filter || undefined);
  }

  // Pattern: db.collectionName.aggregate([...])
  const aggMatch = trimmed.match(/^db\.(\w+)\.aggregate\((.+)\)$/s);
  if (aggMatch) {
    const collection = aggMatch[1];
    const pipeline = aggMatch[2].trim();
    return mongoAggregate(connection, collection, pipeline);
  }

  // Simple collection name → find all
  if (/^[\w.]+$/.test(trimmed)) {
    return mongoFind(connection, trimmed);
  }

  // Try parsing as JSON filter on a collection
  // Format: collectionName { filter }
  const simpleMatch = trimmed.match(/^(\w+)\s+(\{.+\})$/s);
  if (simpleMatch) {
    return mongoFind(connection, simpleMatch[1], simpleMatch[2]);
  }

  throw new Error(
    'Invalid MongoDB query. Use:\n' +
    '  db.collection.find({filter})\n' +
    '  db.collection.aggregate([pipeline])\n' +
    '  collectionName\n' +
    '  collectionName {filter}'
  );
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}
