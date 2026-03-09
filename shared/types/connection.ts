export type DatabaseType = 'mysql' | 'postgres' | 'sqlite' | 'mongodb' | 'redis';

export type ConnectionMethod = 'form' | 'uri';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  connectionMethod: ConnectionMethod;
  // Form-based fields
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  // URI-based
  uri?: string;
  // Options
  color: string;
  ssl?: boolean;
  authSource?: string; // MongoDB auth database
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
  mongodb: 27017,
  redis: 6379,
};

export const DB_LABELS: Record<DatabaseType, string> = {
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
  sqlite: 'SQLite',
  mongodb: 'MongoDB',
  redis: 'Redis',
};

export const DB_COLORS: Record<DatabaseType, string> = {
  mysql: '#00758F',
  postgres: '#336791',
  sqlite: '#003B57',
  mongodb: '#47A248',
  redis: '#DC382D',
};

/** URI prefixes for auto-detection */
export const DB_URI_PREFIXES: Record<string, DatabaseType> = {
  'mysql://': 'mysql',
  'postgres://': 'postgres',
  'postgresql://': 'postgres',
  'sqlite:': 'sqlite',
  'mongodb://': 'mongodb',
  'mongodb+srv://': 'mongodb',
  'redis://': 'redis',
  'rediss://': 'redis',
};
