import { useState, useMemo, useCallback } from 'react';
import type { QueryResult } from '../../../shared/types/connection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Rows3,
  Timer,
  AlertCircle,
  Clipboard,
  Copy,
  ChevronRight,
  ChevronDown,
  Table as TableIcon,
  FileJson,
  Loader2,
} from 'lucide-react';

interface MongoDocumentViewProps {
  result: QueryResult | null;
  error: string | null;
  isLoading: boolean;
}

// Format a value for display with colors
function ValueRenderer({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/40 italic">null</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-sky-400">{String(value)}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-amber-400 tabular-nums">{value}</span>;
  }

  if (typeof value === 'string') {
    // Truncate very long strings
    const display = value.length > 200 ? value.slice(0, 200) + '…' : value;
    return <span className="text-emerald-400">"{display}"</span>;
  }

  if (Array.isArray(value)) {
    return <ArrayRenderer items={value} depth={depth} />;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // MongoDB extended JSON: ObjectId
    if ('$oid' in obj && typeof obj['$oid'] === 'string') {
      return (
        <span className="text-violet-400 font-mono text-[10px]">
          ObjectId("{obj['$oid']}")
        </span>
      );
    }

    // MongoDB extended JSON: Date
    if ('$date' in obj) {
      const dateVal = obj['$date'];
      const dateStr = typeof dateVal === 'string'
        ? dateVal
        : typeof dateVal === 'object' && dateVal !== null && '$numberLong' in (dateVal as Record<string, unknown>)
          ? new Date(parseInt((dateVal as Record<string, unknown>)['$numberLong'] as string)).toISOString()
          : JSON.stringify(dateVal);
      return (
        <span className="text-teal-400 font-mono text-[10px]">
          ISODate("{dateStr}")
        </span>
      );
    }

    // MongoDB extended JSON: NumberLong
    if ('$numberLong' in obj) {
      return <span className="text-amber-400 tabular-nums">NumberLong({obj['$numberLong'] as string})</span>;
    }

    // MongoDB extended JSON: NumberDouble
    if ('$numberDouble' in obj) {
      return <span className="text-amber-400 tabular-nums">{obj['$numberDouble'] as string}</span>;
    }

    // Regular nested object
    return <ObjectRenderer obj={obj} depth={depth} />;
  }

  return <span>{String(value)}</span>;
}

function ArrayRenderer({ items, depth }: { items: unknown[]; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1 && items.length <= 5);

  if (items.length === 0) {
    return <span className="text-muted-foreground/50">[ ]</span>;
  }

  if (!expanded) {
    return (
      <button
        className="inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <ChevronRight className="h-3 w-3" />
        <span className="text-[10px]">Array({items.length})</span>
      </button>
    );
  }

  return (
    <div className="pl-4 border-l border-border/20">
      <button
        className="inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        onClick={() => setExpanded(false)}
      >
        <ChevronDown className="h-3 w-3" />
        <span className="text-[10px]">Array({items.length})</span>
      </button>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1 py-0.5">
          <span className="text-muted-foreground/30 text-[10px] tabular-nums shrink-0 select-none w-4 text-right">
            {i}
          </span>
          <span className="text-muted-foreground/30">:</span>
          <ValueRenderer value={item} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function ObjectRenderer({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const keys = Object.keys(obj);

  if (keys.length === 0) {
    return <span className="text-muted-foreground/50">{'{ }'}</span>;
  }

  if (!expanded) {
    return (
      <button
        className="inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <ChevronRight className="h-3 w-3" />
        <span className="text-[10px]">{`{${keys.length} fields}`}</span>
      </button>
    );
  }

  return (
    <div className="pl-4 border-l border-border/20">
      <button
        className="inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors"
        onClick={() => setExpanded(false)}
      >
        <ChevronDown className="h-3 w-3" />
        <span className="text-[10px]">{`{${keys.length} fields}`}</span>
      </button>
      {keys.map(key => (
        <div key={key} className="flex gap-1 py-0.5 items-start">
          <span className="text-foreground/70 text-[11px] shrink-0 font-medium">{key}</span>
          <span className="text-muted-foreground/30">:</span>
          <div className="min-w-0">
            <ValueRenderer value={obj[key]} depth={depth + 1} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentCard({ doc, index }: { doc: Record<string, unknown>; index: number }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    toast.success('Document copied');
  };

  return (
    <div className="group bg-card/40 border border-border/30 rounded-lg hover:border-border/60 transition-colors">
      {/* Document header */}
      <div className="px-3 py-1.5 border-b border-border/20 flex items-center gap-2">
        <FileJson className="h-3 w-3 text-muted-foreground/40" />
        <span className="text-[10px] text-muted-foreground/50 tabular-nums">#{index + 1}</span>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-5 w-5 p-0 inline-flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/40"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3 text-muted-foreground/50" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Copy JSON
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Document body */}
      <div className="px-3 py-2 space-y-0.5 text-[11px] font-mono">
        {Object.entries(doc).map(([key, value]) => (
          <div key={key} className="flex gap-1.5 items-start leading-relaxed">
            <span className="text-foreground/70 shrink-0 font-semibold">{key}</span>
            <span className="text-muted-foreground/30">:</span>
            <div className="min-w-0 break-all">
              <ValueRenderer value={value} depth={0} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MongoDocumentView({ result, error, isLoading }: MongoDocumentViewProps) {
  const docs = useMemo(() => (result?.rows ?? []) as Record<string, unknown>[], [result?.rows]);

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    const text = JSON.stringify(result.rows, null, 2);
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${result.rows.length} documents`);
  }, [result]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">Query Error</p>
          <pre className="text-xs text-destructive/80 bg-destructive/5 border border-destructive/10 rounded-md p-3 text-left whitespace-pre-wrap font-mono max-h-48 overflow-auto">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <TableIcon className="h-6 w-6 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground/50">
            Click a collection to view documents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-8 px-3 flex items-center gap-2 bg-muted/20 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Rows3 className="h-3 w-3" />
          <span>{docs.length.toLocaleString()} documents</span>
        </div>

        <div className="flex-1" />

        {/* Copy all */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-5 w-5 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              onClick={handleCopyAll}
            >
              <Clipboard className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Copy all (JSON)
          </TooltipContent>
        </Tooltip>

        {/* Execution time */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Timer className="h-3 w-3" />
          {result.execution_time_ms}ms
        </div>
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            No documents found
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
          {docs.map((doc, i) => (
            <DocumentCard key={i} doc={doc} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
