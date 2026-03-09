import { useTabStore } from './tabStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  X,
  Loader2,
  FileCode2,
} from 'lucide-react';

export function QueryTabs() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTabStore();

  return (
    <div className="h-8 flex items-center bg-muted/10 border-b border-border/40 shrink-0 overflow-hidden">
      {/* Tab list */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`group relative flex items-center gap-1.5 h-8 px-3 cursor-pointer transition-all duration-150 shrink-0 max-w-44 ${
                isActive
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/20'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/50" />
              )}
              {tab.isExecuting ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              ) : (
                <FileCode2 className="h-3 w-3 shrink-0 opacity-40" />
              )}
              <span className="text-[11px] truncate font-mono">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  className="h-4 w-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-60 hover:opacity-100! hover:bg-muted transition-all shrink-0 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
              {/* Right divider */}
              <div className="absolute right-0 top-1.5 bottom-1.5 w-px bg-border/20" />
            </div>
          );
        })}
      </div>

      {/* Add tab */}
      <Tooltip>
        <TooltipTrigger
          className="h-8 w-8 p-0 shrink-0 inline-flex items-center justify-center border-l border-border/20 hover:bg-muted/30 transition-colors text-muted-foreground/40 hover:text-muted-foreground"
          onClick={addTab}
        >
          <Plus className="h-3 w-3" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          New Query Tab (Ctrl+N)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
