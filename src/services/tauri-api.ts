import { invoke } from '@tauri-apps/api/core';
import type { DatabaseConnection, ConnectionTestResult, QueryResult } from '../../shared/types/connection';

// Connection management
export async function testConnection(connection: DatabaseConnection): Promise<ConnectionTestResult> {
  return invoke<ConnectionTestResult>('test_connection', { connection });
}

export async function connectDatabase(connectionId: string): Promise<void> {
  return invoke('connect_db', { connectionId });
}

export async function disconnectDatabase(connectionId: string): Promise<void> {
  return invoke('disconnect_db', { connectionId });
}

// Connection persistence
export async function saveConnections(connections: DatabaseConnection[]): Promise<void> {
  return invoke('save_connections', { connections });
}

export async function loadConnections(): Promise<DatabaseConnection[]> {
  return invoke<DatabaseConnection[]>('load_connections');
}

// Query execution
export async function executeQuery(connectionId: string, query: string): Promise<QueryResult> {
  return invoke<QueryResult>('execute_query', { connectionId, query });
}

// Schema
export async function getSchemaInfo(connectionId: string): Promise<string[]> {
  return invoke<string[]>('get_tables', { connectionId });
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}
