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
    <div className="h-8 flex items-center bg-muted/20 border-b border-border shrink-0 overflow-hidden">
      {/* Tab list */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-1.5 h-8 px-3 border-r border-border/40 cursor-pointer transition-colors shrink-0 max-w-48 ${
                isActive
                  ? 'bg-background text-foreground border-b-2 border-b-primary'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.isExecuting ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              ) : (
                <FileCode2 className="h-3 w-3 shrink-0 opacity-60" />
              )}
              <span className="text-xs truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  className="h-4 w-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add tab button */}
      <Tooltip>
        <TooltipTrigger
          className="h-8 w-8 p-0 shrink-0 inline-flex items-center justify-center rounded-none border-l border-border/40 hover:bg-muted transition-colors"
          onClick={addTab}
        >
          <Plus className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          New Query Tab (Ctrl+N)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
