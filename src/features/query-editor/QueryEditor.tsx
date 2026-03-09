import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { useTabStore } from './tabStore';
import * as api from '@/services/tauri-api';
import {
  Play,
  Loader2,
  Trash2,
} from 'lucide-react';

export function QueryEditor() {
  const { activeConnectionId, connections } = useConnectionStore();
  const {
    tabs,
    activeTabId,
    updateTabQuery,
    updateTabResult,
    updateTabError,
    updateTabExecuting,
  } = useTabStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConnection = connections.find(c => c.id === activeConnectionId);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeTabId]);

  const handleRun = useCallback(async () => {
    if (!activeTab || !activeConnection) return;
    const trimmed = activeTab.query.trim();
    if (!trimmed) return;

    updateTabExecuting(activeTab.id, true);
    updateTabError(activeTab.id, null);
    updateTabResult(activeTab.id, null);

    try {
      const result = await api.executeQuery(activeConnection, trimmed);
      updateTabResult(activeTab.id, result);
    } catch (err) {
      updateTabError(
        activeTab.id,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      updateTabExecuting(activeTab.id, false);
    }
  }, [activeTab, activeConnection, updateTabExecuting, updateTabError, updateTabResult]);

  useEffect(() => {
    if (activeTab) {
      const store = useConnectionStore.getState();
      if (activeTab.result) {
        store.clearQueryResult();
      }
    }
  }, [activeTab?.result]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea && activeTab) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        updateTabQuery(activeTab.id, value.substring(0, start) + '  ' + value.substring(end));
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    }
  };

  const handleClear = () => {
    if (activeTab) {
      updateTabQuery(activeTab.id, '');
      updateTabResult(activeTab.id, null);
      updateTabError(activeTab.id, null);
    }
  };

  if (!activeTab) return null;

  return (
    <div className="shrink-0 border-b border-border/40">
      {/* Toolbar */}
      <div className="h-8 px-2 flex items-center gap-1 bg-muted/10 border-b border-border/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-[11px]"
          onClick={handleRun}
          disabled={activeTab.isExecuting || !activeTab.query.trim()}
        >
          {activeTab.isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Run
        </Button>
        <span className="text-[9px] text-muted-foreground/30 font-mono">Ctrl+Enter</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-[11px] text-muted-foreground/50"
          onClick={handleClear}
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={activeTab.query}
          onChange={e => updateTabQuery(activeTab.id, e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-28 px-4 py-3 bg-transparent resize-y outline-none font-mono text-xs leading-relaxed placeholder:text-muted-foreground/20 min-h-14 max-h-72"
          placeholder={
            activeConnection?.type === 'mongodb'
              ? 'db.collection.find({})  or  db.collection.aggregate([...])'
              : activeConnection?.type === 'redis'
                ? 'GET key  /  SET key value  /  KEYS pattern'
                : 'Write your SQL query here...'
          }
          spellCheck={false}
        />
      </div>
    </div>
  );
}
