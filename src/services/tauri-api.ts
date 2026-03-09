import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import type { DatabaseConnection, ConnectionTestResult, QueryResult } from '../../shared/types/connection';
function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriAvailable()) {
    throw new Error(
      `Tauri runtime not available. Run "npm run tauri dev" instead of "npm run dev" to start the full app with backend.`
    );
  }
  return invoke<T>(cmd, args);
}
export async function saveConnections(connections: DatabaseConnection[]): Promise<void> {
  return safeInvoke('save_connections', { connections });
}
export async function loadConnections(): Promise<DatabaseConnection[]> {
  if (!isTauriAvailable()) return [];
  return safeInvoke<DatabaseConnection[]>('load_connections');
}
export async function testConnection(connection: DatabaseConnection): Promise<ConnectionTestResult> {
  if (connection.type === 'mongodb') {
    const connString = getEffectiveConnectionString(connection);
    return safeInvoke<ConnectionTestResult>('mongo_test_connection', { connString });
  }
  return safeInvoke<ConnectionTestResult>('test_connection', { connection });
}
export async function connectDatabase(connectionId: string): Promise<void> {
  return safeInvoke('connect_db', { connectionId });
}
export async function disconnectDatabase(connectionId: string): Promise<void> {
  return safeInvoke('disconnect_db', { connectionId });
}
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
function getEffectiveConnectionString(connection: DatabaseConnection): string {
  if (connection.connectionMethod === 'uri' && connection.uri) {
    let uri = connection.uri.trim();
    if (!uri.includes('://')) {
      switch (connection.type) {
        case 'postgres':
          uri = `postgres://${uri}`;
          break;
        case 'mysql':
          uri = `mysql://${uri}`;
          break;
        case 'mongodb':
          uri = `mongodb://${uri}`;
          break;
        case 'redis':
          uri = `redis://${uri}`;
          break;
        default:
          break;
      }
    }
    if (connection.type === 'postgres' && uri.startsWith('postgresql://')) {
      uri = 'postgres' + uri.slice('postgresql'.length);
    }
    try {
      const parsed = new URL(uri);
      if (!parsed.pathname || parsed.pathname === '/') {
        if (connection.type === 'postgres') {
          uri = uri.replace(/\/?$/, '/postgres');
        } else if (connection.type === 'mysql') {
          uri = uri.replace(/\/?$/, '/mysql');
        }
      }
    } catch {
    }

    return uri;
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
export async function getListTablesQuery(dbType: string): Promise<string> {
  return safeInvoke<string>('get_list_tables_query', { dbType });
}
const dbPool: Map<string, Database> = new Map();
export async function getDbConnection(connection: DatabaseConnection): Promise<Database> {
  if (connection.type === 'mongodb' || connection.type === 'redis') {
    throw new Error(`Use ${connection.type}-specific functions for ${connection.type} connections`);
  }
  const existing = dbPool.get(connection.id);
  if (existing) return existing;
  const connString = getEffectiveConnectionString(connection);
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
  await safeInvoke('mongo_disconnect', { connectionId }).catch(() => {});
}
export async function mongoListDatabases(connection: DatabaseConnection): Promise<string[]> {
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<string[]>('mongo_list_databases', {
    connectionId: connection.id,
    connString,
  });
}

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

export async function mongoInsertOne(
  connection: DatabaseConnection,
  collection: string,
  document: string,
): Promise<string> {
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<string>('mongo_insert_one', {
    connectionId: connection.id,
    connString,
    database: connection.database,
    collection,
    document,
  });
}

export async function mongoUpdateOne(
  connection: DatabaseConnection,
  collection: string,
  filter: string,
  update: string,
): Promise<number> {
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<number>('mongo_update_one', {
    connectionId: connection.id,
    connString,
    database: connection.database,
    collection,
    filter,
    update,
  });
}

export async function mongoDeleteOne(
  connection: DatabaseConnection,
  collection: string,
  filter: string,
): Promise<number> {
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<number>('mongo_delete_one', {
    connectionId: connection.id,
    connString,
    database: connection.database,
    collection,
    filter,
  });
}

export async function mongoCount(
  connection: DatabaseConnection,
  collection: string,
): Promise<number> {
  const connString = getEffectiveConnectionString(connection);
  return safeInvoke<number>('mongo_count', {
    connectionId: connection.id,
    connString,
    database: connection.database,
    collection,
  });
}
export async function executeQuery(
  connection: DatabaseConnection,
  query: string,
): Promise<QueryResult> {
  if (connection.type === 'mongodb') {
    return executeMongoQuery(connection, query);
  }
  if (connection.type === 'redis') {
    throw new Error('Redis query execution not yet implemented');
  }
  const start = performance.now();
  const db = await getDbConnection(connection);

  const trimmed = query.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT')
    || trimmed.startsWith('SHOW')
    || trimmed.startsWith('DESCRIBE')
    || trimmed.startsWith('EXPLAIN')
    || trimmed.startsWith('PRAGMA');

  if (isSelect) {
    let rows: Record<string, unknown>[];

    if (connection.type === 'postgres') {
      try {
        const jsonQuery = `SELECT row_to_json(t)::text as _row FROM (${query.replace(/;\s*$/, '')}) t`;
        const jsonRows = await db.select<{ _row: string }[]>(jsonQuery);
        rows = jsonRows.map(r => {
          try { return JSON.parse(r._row); } catch { return { _raw: r._row }; }
        });
      } catch {
        rows = await db.select<Record<string, unknown>[]>(query);
      }
    } else {
      rows = await db.select<Record<string, unknown>[]>(query);
    }

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
async function executeMongoQuery(
  connection: DatabaseConnection,
  query: string,
): Promise<QueryResult> {
  const trimmed = query.trim();
  const findMatch = trimmed.match(/^db\.(\w+)\.find\((.*)?\)$/s);
  if (findMatch) {
    const collection = findMatch[1];
    const filter = findMatch[2]?.trim() || '';
    return mongoFind(connection, collection, filter || undefined);
  }
  const aggMatch = trimmed.match(/^db\.(\w+)\.aggregate\((.+)\)$/s);
  if (aggMatch) {
    const collection = aggMatch[1];
    const pipeline = aggMatch[2].trim();
    return mongoAggregate(connection, collection, pipeline);
  }
  if (/^[\w.]+$/.test(trimmed)) {
    return mongoFind(connection, trimmed);
  }
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
export function generateId(): string {
  return crypto.randomUUID();
}