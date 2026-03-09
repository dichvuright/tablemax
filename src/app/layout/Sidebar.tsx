import { ConnectionList } from '@/features/connection/ConnectionList';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { Plus, Database } from 'lucide-react';

export function Sidebar() {
  const openForm = useConnectionStore(s => s.openForm);

  return (
    <aside className="w-64 h-full border-r border-border bg-card/30 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-2 border-b border-border shrink-0">
        <div className="w-6 h-6 rounded-md bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Database className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight">DB Studio</span>
      </div>

      {/* New Connection Button */}
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => openForm()}
        >
          <Plus className="h-3.5 w-3.5" />
          New Connection
        </Button>
      </div>

      <Separator />

      {/* Connections Label */}
      <div className="px-4 py-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Connections
        </span>
      </div>

      {/* Connection List */}
      <div className="flex-1 overflow-y-auto">
        <ConnectionList />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground/60">
          DB Studio v0.1.0
        </span>
      </div>
    </aside>
  );
}
