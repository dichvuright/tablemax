import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useConnectionStore } from '@/features/connection/connectionStore';
import {
  Play,
  Loader2,
  Trash2,
} from 'lucide-react';

export function QueryEditor() {
  const { executeQuery, isExecuting, clearQueryResult } = useConnectionStore();
  const [query, setQuery] = useState('SELECT 1;');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleRun = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    executeQuery(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
    // Tab key inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        setQuery(value.substring(0, start) + '  ' + value.substring(end));
        // Restore cursor position
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    }
  };

  return (
    <div className="shrink-0 border-b border-border">
      {/* Toolbar */}
      <div className="h-9 px-3 flex items-center gap-1.5 bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-xs"
          onClick={handleRun}
          disabled={isExecuting || !query.trim()}
        >
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Run
        </Button>
        <span className="text-[10px] text-muted-foreground/60">Ctrl+Enter</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-xs text-muted-foreground"
          onClick={() => {
            setQuery('');
            clearQueryResult();
          }}
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
      </div>
      <Separator />

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-32 px-4 py-3 bg-background resize-none outline-none font-mono text-sm leading-relaxed placeholder:text-muted-foreground/40"
          placeholder="Write your SQL query here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
