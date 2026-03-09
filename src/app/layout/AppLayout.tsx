import { useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { ConnectionForm } from '@/features/connection/ConnectionForm';
import { QueryEditor } from '@/features/query-editor/QueryEditor';
import { QueryTabs } from '@/features/query-editor/QueryTabs';
import { VirtualDataGrid } from '@/features/table-viewer/VirtualDataGrid';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { useTabStore } from '@/features/query-editor/tabStore';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Database } from 'lucide-react';

export function AppLayout() {
  const { activeConnectionId, connections, loadConnections } = useConnectionStore();
  const { tabs, activeTabId, addTab, removeTab } = useTabStore();
  const activeConnection = connections.find(c => c.id === activeConnectionId);
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+N: New tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      addTab();
    }
    // Ctrl+W: Close tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) {
        removeTab(activeTabId);
      }
    }
  }, [addTab, removeTab, activeTabId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <div className="h-10 border-b border-border flex items-center px-4 gap-2 shrink-0 bg-card/50">
            {activeConnection ? (
              <>
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeConnection.color }}
                />
                <span className="text-xs font-medium truncate">
                  {activeConnection.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {activeConnection.database || activeConnection.host}
                </span>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground/50">
                  {activeConnection.type.toUpperCase()}
                </span>
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  No connection selected
                </span>
              </>
            )}
          </div>

          {/* Content Area */}
          {activeConnectionId ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Query Tabs */}
              <QueryTabs />
              {/* Query Editor */}
              <QueryEditor />
              {/* Results - from active tab */}
              <VirtualDataGrid
                result={activeTab?.result ?? null}
                error={activeTab?.error ?? null}
                isLoading={activeTab?.isExecuting ?? false}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Database className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground/80">
                    Welcome to TableMax
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a connection to get started
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center text-[10px] text-muted-foreground/40">
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/30">Ctrl+N</kbd>
                    <span>New Tab</span>
                    <span>·</span>
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/30">Ctrl+Enter</kbd>
                    <span>Run Query</span>
                    <span>·</span>
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/30">Ctrl+W</kbd>
                    <span>Close Tab</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="h-6 px-3 flex items-center gap-3 border-t border-border bg-muted/10 shrink-0">
            {activeConnection && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-muted-foreground/60">
                    Connected to {activeConnection.name}
                  </span>
                </div>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground/40">
                  {tabs.length} tab{tabs.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </main>

        {/* Dialogs */}
        <ConnectionForm />
        <Toaster position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  );
}
