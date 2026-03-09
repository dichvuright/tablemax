import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import type { DatabaseConnection, ConnectionTestResult, QueryResult } from '../../shared/types/connection';

/**
 * Helper: check if we're running inside the Tauri webview.
 * When running via `npm run dev` (Vite only), the Tauri runtime is absent.
 * Use `npm run tauri dev` for the full app with backend.
 */
function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Safe wrapper around invoke that gives a clear error in browser-only mode */
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriAvailable()) {
    throw new Error(
      `Tauri runtime not available. Run "npm run tauri dev" instead of "npm run dev" to start the full app with backend.`
    );
  }
  return invoke<T>(cmd, args);
}

// Connection persistence (via Rust commands)
export async function saveConnections(connections: DatabaseConnection[]): Promise<void> {
  return safeInvoke('save_connections', { connections });
}

export async function loadConnections(): Promise<DatabaseConnection[]> {
  if (!isTauriAvailable()) return []; // Graceful fallback: return empty list in browser
  return safeInvoke<DatabaseConnection[]>('load_connections');
}

// Connection testing (via Rust commands)
export async function testConnection(connection: DatabaseConnection): Promise<ConnectionTestResult> {
  if (connection.type === 'mongodb') {
    const connString = getEffectiveConnectionString(connection);
    return safeInvoke<ConnectionTestResult>('mongo_test_connection', { connString });
  }
  return safeInvoke<ConnectionTestResult>('test_connection', { connection });
}

// Connection management (via Rust for validation)
export async function connectDatabase(connectionId: string): Promise<void> {
  return safeInvoke('connect_db', { connectionId });
}

export async function disconnectDatabase(connectionId: string): Promise<void> {
  return safeInvoke('disconnect_db', { connectionId });
}

// Build connection string (via Rust)
export async function buildConnectionString(connection: DatabaseConnection): Promise<string> {
  return safeInvoke<string>('build_connection_string', {
    dbType: connection.type,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    database: connection.database,
    connectionMethod: connection.connectionMethod,
    uri: connection.uri || null,
    authSource: connection.authSource || null,
  });
}

/** Get effective connection string — handles both form and URI modes */
function getEffectiveConnectionString(connection: DatabaseConnection): string {
  if (connection.connectionMethod === 'uri' && connection.uri) {
    return connection.uri;
  }

  const { type, host, port, username, password, database, authSource } = connection;
  switch (type) {
    case 'mysql':
      return `mysql://${username}:${password}@${host}:${port}/${database}`;
    case 'postgres':
      return `postgres://${username}:${password}@${host}:${port}/${database}`;
    case 'sqlite':
      return `sqlite:${database}`;
    case 'mongodb': {
      const authParam = authSource ? `?authSource=${authSource}` : '';
      if (!username) return `mongodb://${host}:${port}/${database}${authParam}`;
      return `mongodb://${username}:${password}@${host}:${port}/${database}${authParam}`;
    }
    case 'redis':
      if (!username && !password) return `redis://${host}:${port}`;
      if (!username) return `redis://:${password}@${host}:${port}`;
      return `redis://${username}:${password}@${host}:${port}`;
    default:
      return '';
  }
}

// Get list tables query (via Rust)
export async function getListTablesQuery(dbType: string): Promise<string> {
  return safeInvoke<string>('get_list_tables_query', { dbType });
}

// Database connection pool (frontend-side via tauri-plugin-sql) — SQL databases only
const dbPool: Map<string, Database> = new Map();

export async function getDbConnection(connection: DatabaseConnection): Promise<Database> {
  if (connection.type === 'mongodb' || connection.type === 'redis') {
    throw new Error(`Use ${connection.type}-specific functions for ${connection.type} connections`);
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
  await safeInvoke('mongo_disconnect', { connectionId }).catch(() => {});
}

// ─── MongoDB-specific functions ─────────────────────────────────

export async function mongoListCollections(connection: DatabaseConnection): Promise<string[]> {
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<string[]>('mongo_list_collections', {
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
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<QueryResult>('mongo_find', {
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
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<QueryResult>('mongo_aggregate', {
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

  // Redis path (TODO: implement Redis commands)
  if (connection.type === 'redis') {
    throw new Error('Redis query execution not yet implemented');
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
