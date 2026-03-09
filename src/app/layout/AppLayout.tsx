import { useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { ConnectionForm } from '@/features/connection/ConnectionForm';
import { QueryEditor } from '@/features/query-editor/QueryEditor';
import { QueryTabs } from '@/features/query-editor/QueryTabs';
import { VirtualDataGrid } from '@/features/table-viewer/VirtualDataGrid';
import { MongoDocumentView } from '@/features/table-viewer/MongoDocumentView';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { useTabStore } from '@/features/query-editor/tabStore';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Database } from 'lucide-react';
import { DatabaseIcon } from '@/components/icons/database-icons';
import { DB_LABELS } from '../../../shared/types/connection';

export function AppLayout() {
  const { activeConnectionId, connections, loadConnections } = useConnectionStore();
  const { tabs, activeTabId, addTab, removeTab } = useTabStore();
  const activeConnection = connections.find(c => c.id === activeConnectionId);
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      addTab();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) removeTab(activeTabId);
    }
  }, [addTab, removeTab, activeTabId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <div className="h-10 border-b border-border/50 flex items-center px-4 gap-2.5 shrink-0 bg-card/20" data-tauri-drag-region>
            {activeConnection ? (
              <>
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${activeConnection.color}15`, border: `1px solid ${activeConnection.color}25` }}
                >
                  <DatabaseIcon type={activeConnection.type} className="size-3" />
                </div>
                <span className="text-xs font-medium truncate">
                  {activeConnection.name}
                </span>
                <span className="text-[10px] text-muted-foreground/50 font-mono">
                  {activeConnection.database || (
                    activeConnection.connectionMethod === 'uri' && activeConnection.uri
                      ? (() => { try { const u = new URL(activeConnection.uri); return u.host || activeConnection.uri; } catch { return activeConnection.uri; } })()
                      : activeConnection.host
                  )}
                </span>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground/30 font-mono uppercase">
                  {DB_LABELS[activeConnection.type]}
                </span>
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground/50">
                  Select a connection to start
                </span>
              </>
            )}
          </div>

          {/* Content */}
          {activeConnectionId ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <QueryTabs />
              <QueryEditor />
              {activeConnection?.type === 'mongodb' ? (
                <MongoDocumentView
                  result={activeTab?.result ?? null}
                  error={activeTab?.error ?? null}
                  isLoading={activeTab?.isExecuting ?? false}
                />
              ) : (
                <VirtualDataGrid
                  result={activeTab?.result ?? null}
                  error={activeTab?.error ?? null}
                  isLoading={activeTab?.isExecuting ?? false}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-5">
                <div className="mx-auto w-14 h-14 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center">
                  <Database className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground/70">
                    Welcome to TableMax
                  </h2>
                  <p className="text-xs text-muted-foreground/40 mt-1">
                    Create or select a connection to get started
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-muted-foreground/25">
                  <span><kbd className="px-1 py-0.5 rounded border border-border/30 bg-muted/20 font-mono text-[9px]">Ctrl+N</kbd> New Tab</span>
                  <span><kbd className="px-1 py-0.5 rounded border border-border/30 bg-muted/20 font-mono text-[9px]">Ctrl+Enter</kbd> Run</span>
                  <span><kbd className="px-1 py-0.5 rounded border border-border/30 bg-muted/20 font-mono text-[9px]">Ctrl+W</kbd> Close</span>
                </div>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="h-5 px-3 flex items-center gap-3 border-t border-border/30 bg-muted/5 shrink-0">
            {activeConnection && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                  <span className="text-[9px] text-muted-foreground/40 font-mono">
                    {activeConnection.name}
                  </span>
                </div>
                <div className="flex-1" />
                <span className="text-[9px] text-muted-foreground/25 font-mono">
                  {tabs.length} tab{tabs.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </main>

        <ConnectionForm />
        <Toaster position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  );
}
