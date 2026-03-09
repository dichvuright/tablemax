import { useState, useEffect, useCallback } from 'react';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { useTabStore } from '@/features/query-editor/tabStore';
import * as api from '@/services/tauri-api';
import {
  ChevronRight,
  ChevronDown,
  Table2,
  FolderOpen,
  RefreshCw,
  Loader2,
  Database as DbIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TableInfo {
  name: string;
  isExpanded: boolean;
}

interface MongoDatabase {
  name: string;
  isExpanded: boolean;
  collections: string[];
  isLoading: boolean;
}

export function SchemaTree() {
  const { activeConnectionId, connections } = useConnectionStore();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [mongoDbs, setMongoDbs] = useState<MongoDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeConnection = connections.find(c => c.id === activeConnectionId);
  const isMongo = activeConnection?.type === 'mongodb';

  const loadSchema = useCallback(async () => {
    if (!activeConnection) return;

    setIsLoading(true);
    try {
      if (isMongo) {
        if (activeConnection.database?.trim()) {
          // Specific database — list its collections directly
          const collections = await api.mongoListCollections(activeConnection);
          setMongoDbs([{
            name: activeConnection.database,
            isExpanded: true,
            collections,
            isLoading: false,
          }]);
        } else {
          // No database specified → list all databases
          const dbNames = await api.mongoListDatabases(activeConnection);
          setMongoDbs(dbNames.map(name => ({
            name,
            isExpanded: false,
            collections: [],
            isLoading: false,
          })));
        }
      } else {
        // SQL databases
        const db = await api.getDbConnection(activeConnection);
        const query = await api.getListTablesQuery(activeConnection.type);
        const rows = await db.select<Record<string, unknown>[]>(query);
        const tableNames = rows.map(row => {
          const firstValue = Object.values(row)[0];
          return String(firstValue ?? '');
        }).filter(Boolean);

        setTables(tableNames.map(name => ({ name, isExpanded: false })));
      }
    } catch (err) {
      toast.error('Failed to load schema', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeConnection, isMongo]);

  useEffect(() => {
    if (activeConnectionId) {
      loadSchema();
    } else {
      setTables([]);
      setMongoDbs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectionId]);

  const toggleTable = (index: number) => {
    setTables(prev =>
      prev.map((t, i) =>
        i === index ? { ...t, isExpanded: !t.isExpanded } : t
      )
    );
  };

  const toggleMongoDb = async (index: number) => {
    const db = mongoDbs[index];
    if (!db || !activeConnection) return;

    // If already expanded, just collapse
    if (db.isExpanded) {
      setMongoDbs(prev => prev.map((d, i) =>
        i === index ? { ...d, isExpanded: false } : d
      ));
      return;
    }

    // Update the connection's database field so queries use the correct namespace
    const { updateConnection } = useConnectionStore.getState();
    const updatedConn = { ...activeConnection, database: db.name };
    await updateConnection(updatedConn);

    // If collections not loaded yet, load them
    if (db.collections.length === 0) {
      setMongoDbs(prev => prev.map((d, i) =>
        i === index ? { ...d, isLoading: true, isExpanded: true } : d
      ));

      try {
        const collections = await api.mongoListCollections(updatedConn);
        setMongoDbs(prev => prev.map((d, i) =>
          i === index ? { ...d, collections, isLoading: false } : d
        ));
      } catch (err) {
        toast.error(`Failed to list collections for ${db.name}`, {
          description: err instanceof Error ? err.message : String(err),
        });
        setMongoDbs(prev => prev.map((d, i) =>
          i === index ? { ...d, isLoading: false, isExpanded: false } : d
        ));
      }
    } else {
      // Already loaded, just expand
      setMongoDbs(prev => prev.map((d, i) =>
        i === index ? { ...d, isExpanded: true } : d
      ));
    }
  };

  const handleTableClick = (tableName: string) => {
    const { activeTabId, updateTabQuery } = useTabStore.getState();
    if (!activeTabId) return;
    const query = isMongo
      ? `db.${tableName}.find({})`
      : `SELECT * FROM ${tableName} LIMIT 100;`;
    updateTabQuery(activeTabId, query);
    useConnectionStore.getState().executeQuery(query);
  };

  const handleMongoCollectionClick = async (dbName: string, collName: string) => {
    // Update database context
    if (activeConnection && activeConnection.database !== dbName) {
      const { updateConnection } = useConnectionStore.getState();
      await updateConnection({ ...activeConnection, database: dbName });
    }

    // Inject query into active tab
    const { activeTabId, updateTabQuery } = useTabStore.getState();
    if (!activeTabId) return;
    const query = `db.${collName}.find({})`;
    updateTabQuery(activeTabId, query);

    // Auto-execute — like Compass: click collection → see docs immediately
    setSelectedCollection(collName);
    useConnectionStore.getState().executeQuery(query);
  };

  if (!activeConnectionId) return null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
          {isMongo ? 'Databases' : 'Tables'}
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

      <div className="px-2 space-y-px">
        {isLoading && tables.length === 0 && mongoDbs.length === 0 && (
          <div className="px-2 py-4 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground/40" />
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              Loading...
            </p>
          </div>
        )}

        {!isLoading && tables.length === 0 && mongoDbs.length === 0 && (
          <div className="px-2 py-4 text-center">
            <FolderOpen className="h-4 w-4 mx-auto text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              No {isMongo ? 'databases' : 'tables'} found
            </p>
          </div>
        )}

        {/* MongoDB: Database → Collection tree */}
        {isMongo && mongoDbs.map((db, dbIndex) => (
          <div key={db.name}>
            <button
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-colors ${
                db.isExpanded
                  ? 'bg-accent/40 text-accent-foreground'
                  : 'hover:bg-muted/30'
              }`}
              onClick={() => toggleMongoDb(dbIndex)}
            >
              {db.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              )}
              <DbIcon className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] truncate">{db.name}</span>
              {db.isLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto text-muted-foreground/40" />}
            </button>

            {db.isExpanded && (
              <div className="ml-4 space-y-px">
                {db.collections.length === 0 && !db.isLoading && (
                  <p className="text-[10px] text-muted-foreground/30 px-2 py-1">No collections</p>
                )}
                {db.collections.map(coll => (
                  <button
                    key={coll}
                    className="w-full flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted/30 text-left transition-colors"
                    onDoubleClick={() => handleMongoCollectionClick(db.name, coll)}
                    title={`Double-click to query: db.${coll}.find({})`}
                  >
                    <Table2 className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    <span className="text-[11px] truncate text-foreground/70">{coll}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* SQL: Flat table list */}
        {!isMongo && tables.map((table, index) => (
          <div key={table.name}>
            <button
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/30 text-left transition-colors"
              onClick={() => toggleTable(index)}
              onDoubleClick={() => handleTableClick(table.name)}
              title={`Double-click to query: SELECT * FROM ${table.name}`}
            >
              {table.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              )}
              <Table2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] truncate">{table.name}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
