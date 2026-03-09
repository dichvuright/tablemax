import { ConnectionList } from '@/features/connection/ConnectionList';
import { SchemaTree } from '@/features/schema-browser/SchemaTree';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { Plus, Database, ChevronDown } from 'lucide-react';

export function Sidebar() {
  const openForm = useConnectionStore(s => s.openForm);
  const activeConnectionId = useConnectionStore(s => s.activeConnectionId);

  return (
    <aside className="w-60 h-full border-r border-border/50 bg-card/20 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 px-3 flex items-center gap-2 border-b border-border/50 shrink-0" data-tauri-drag-region>
        <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Database className="h-3 w-3 text-white" />
        </div>
        <span className="font-semibold text-xs tracking-tight">TableMax</span>
        <span className="text-[9px] text-muted-foreground/40 ml-auto">v0.1</span>
      </div>

      {/* New Connection */}
      <div className="p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-7 text-[11px] border-dashed border-border/50 text-muted-foreground hover:text-foreground"
          onClick={() => openForm()}
        >
          <Plus className="h-3 w-3" />
          New Connection
        </Button>
      </div>

      {/* Section: Connections */}
      <div className="px-3 py-1.5 flex items-center">
        <ChevronDown className="size-3 text-muted-foreground/40 mr-1.5" />
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
          Connections
        </span>
      </div>

      {/* Connection List */}
      <div className={`overflow-y-auto ${activeConnectionId ? '' : 'flex-1'}`}>
        <ConnectionList />
      </div>

      {/* Schema Browser */}
      {activeConnectionId && (
        <>
          <div className="h-px bg-border/30 mx-3" />
          <div className="px-3 py-1.5 flex items-center">
            <ChevronDown className="size-3 text-muted-foreground/40 mr-1.5" />
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Schema
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SchemaTree />
          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/30">
        <span className="text-[9px] text-muted-foreground/30 font-mono">
          TableMax Engine v0.1.0
        </span>
      </div>
    </aside>
  );
}
