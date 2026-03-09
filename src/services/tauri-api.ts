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

// Get list tables query (via Rust)
export async function getListTablesQuery(dbType: string): Promise<string> {
  return invoke<string>('get_list_tables_query', { dbType });
}

// Database connection pool (frontend-side via tauri-plugin-sql)
const dbPool: Map<string, Database> = new Map();

export async function getDbConnection(connection: DatabaseConnection): Promise<Database> {
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
}

// Query execution (via tauri-plugin-sql JS API)
export async function executeQuery(
  connection: DatabaseConnection,
  query: string
): Promise<QueryResult> {
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

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}
