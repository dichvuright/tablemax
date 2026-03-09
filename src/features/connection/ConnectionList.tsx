import { useConnectionStore } from './connectionStore';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { DB_LABELS } from '../../../shared/types/connection';
import {
  Plug,
  Unplug,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import { DatabaseIcon } from '@/components/icons/database-icons';
import { generateId } from '@/services/tauri-api';
import { toast } from 'sonner';

export function ConnectionList() {
  const {
    connections,
    activeConnectionId,
    connectToDatabase,
    disconnectFromDatabase,
    openForm,
    removeConnection,
    addConnection,
  } = useConnectionStore();

  const handleConnect = async (id: string) => {
    try {
      await connectToDatabase(id);
      toast.success('Connected');
    } catch (err) {
      toast.error('Connection failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDisconnect = async (id: string) => {
    await disconnectFromDatabase(id);
    toast.info('Disconnected');
  };

  const handleDuplicate = async (id: string) => {
    const conn = connections.find(c => c.id === id);
    if (conn) {
      await addConnection({
        ...conn,
        id: generateId(),
        name: `${conn.name} (copy)`,
      });
      toast.success('Connection duplicated');
    }
  };

  const handleDelete = async (id: string) => {
    await removeConnection(id);
    toast.success('Connection deleted');
  };

  if (connections.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[11px] text-muted-foreground/40">
          No connections yet
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-px">
      {connections.map(conn => {
        const isActive = conn.id === activeConnectionId;

        return (
          <ContextMenu key={conn.id}>
            <ContextMenuTrigger
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all duration-150 group cursor-default ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted/40 text-foreground/80'
              }`}
              onClick={() => handleConnect(conn.id)}
            >
              {/* DB Icon */}
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${conn.color}15`, border: `1px solid ${conn.color}25` }}
              >
                <DatabaseIcon type={conn.type} className="size-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate leading-tight">
                  {conn.name}
                </div>
                <div className="text-[10px] text-muted-foreground/60 truncate leading-tight">
                  {DB_LABELS[conn.type]}
                  {conn.type !== 'sqlite' && ` · ${conn.host}:${conn.port}`}
                </div>
              </div>

              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              )}
            </ContextMenuTrigger>
            <ContextMenuContent>
              {isActive ? (
                <ContextMenuItem onClick={() => handleDisconnect(conn.id)}>
                  <Unplug className="h-3.5 w-3.5 mr-2" />
                  Disconnect
                </ContextMenuItem>
              ) : (
                <ContextMenuItem onClick={() => handleConnect(conn.id)}>
                  <Plug className="h-3.5 w-3.5 mr-2" />
                  Connect
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => openForm(conn)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleDuplicate(conn.id)}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => handleDelete(conn.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
