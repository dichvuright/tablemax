import { useState, useEffect } from 'react';
import { useConnectionStore } from '@/features/connection/connectionStore';
import * as api from '@/services/tauri-api';
import {
  ChevronRight,
  ChevronDown,
  Table2,
  FolderOpen,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TableInfo {
  name: string;
  isExpanded: boolean;
}

export function SchemaTree() {
  const { activeConnectionId, connections } = useConnectionStore();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeConnection = connections.find(c => c.id === activeConnectionId);

  const loadSchema = async () => {
    if (!activeConnection) return;

    setIsLoading(true);
    try {
      let tableNames: string[];

      if (activeConnection.type === 'mongodb') {
        // MongoDB: use dedicated list collections command
        if (!activeConnection.database?.trim()) {
          toast.error('MongoDB requires a database name', {
            description: 'Edit your connection and enter a database name (e.g. "admin" or "test")',
          });
          setIsLoading(false);
          return;
        }
        tableNames = await api.mongoListCollections(activeConnection);
      } else {
        // SQL databases: use tauri-plugin-sql
        const db = await api.getDbConnection(activeConnection);
        const query = await api.getListTablesQuery(activeConnection.type);
        const rows = await db.select<Record<string, unknown>[]>(query);
        tableNames = rows.map(row => {
          const firstValue = Object.values(row)[0];
          return String(firstValue ?? '');
        }).filter(Boolean);
      }

      setTables(tableNames.map(name => ({ name, isExpanded: false })));
    } catch (err) {
      toast.error('Failed to load schema', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load schema when connection changes
  useEffect(() => {
    if (activeConnectionId) {
      loadSchema();
    } else {
      setTables([]);
    }
  }, [activeConnectionId]);

  const toggleTable = (index: number) => {
    setTables(prev =>
      prev.map((t, i) =>
        i === index ? { ...t, isExpanded: !t.isExpanded } : t
      )
    );
  };

  const handleTableClick = (tableName: string) => {
    if (activeConnection?.type === 'mongodb') {
      const query = `db.${tableName}.find({})`;
      useConnectionStore.getState().executeQuery(query);
    } else {
      const query = `SELECT * FROM ${tableName} LIMIT 100;`;
      useConnectionStore.getState().executeQuery(query);
    }
  };

  if (!activeConnectionId) return null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {activeConnection?.type === 'mongodb' ? 'Collections' : 'Tables'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={loadSchema}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Table List */}
      <div className="px-2 space-y-0.5">
        {isLoading && tables.length === 0 && (
          <div className="px-2 py-4 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Loading tables...
            </p>
          </div>
        )}

        {!isLoading && tables.length === 0 && (
          <div className="px-2 py-4 text-center">
            <FolderOpen className="h-4 w-4 mx-auto text-muted-foreground/40" />
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              No tables found
            </p>
          </div>
        )}

        {tables.map((table, index) => (
          <div key={table.name}>
            <button
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/50 text-left transition-colors group"
              onClick={() => toggleTable(index)}
              onDoubleClick={() => handleTableClick(table.name)}
              title={`Double-click to query: SELECT * FROM ${table.name}`}
            >
              {table.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <Table2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs truncate">{table.name}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
