import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ConnectionForm } from '@/features/connection/ConnectionForm';
import { QueryEditor } from '@/features/query-editor/QueryEditor';
import { ResultTable } from '@/features/table-viewer/ResultTable';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { Toaster } from '@/components/ui/sonner';
import { Database } from 'lucide-react';

export function AppLayout() {
  const { activeConnectionId, connections, loadConnections } = useConnectionStore();
  const activeConnection = connections.find(c => c.id === activeConnectionId);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="h-12 border-b border-border flex items-center px-4 gap-2 shrink-0 bg-card/50">
          {activeConnection ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeConnection.color }}
              />
              <span className="text-sm font-medium truncate">
                {activeConnection.name}
              </span>
              <span className="text-xs text-muted-foreground">
                — {activeConnection.database || activeConnection.host}
              </span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                No connection selected
              </span>
            </>
          )}
        </div>

        {/* Content Area */}
        {activeConnectionId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Query Editor */}
            <QueryEditor />
            {/* Results */}
            <ResultTable />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Database className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground/80">
                  Welcome to DB Studio
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a connection to get started
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ConnectionForm />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
