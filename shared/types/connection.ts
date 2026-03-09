export type DatabaseType = 'mysql' | 'postgres' | 'sqlite';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  color: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  affected_rows: number;
  execution_time_ms: number;
}

export const DB_DEFAULT_PORTS: Record<DatabaseType, number> = {
  mysql: 3306,
  postgres: 5432,
  sqlite: 0,
};

export const DB_LABELS: Record<DatabaseType, string> = {
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
  sqlite: 'SQLite',
};

export const DB_COLORS: Record<DatabaseType, string> = {
  mysql: '#00758F',
  postgres: '#336791',
  sqlite: '#003B57',
};
