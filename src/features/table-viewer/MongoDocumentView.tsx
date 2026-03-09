import { useState, useMemo, useCallback } from 'react';
import type { QueryResult } from '../../../shared/types/connection';
import { useConnectionStore } from '@/features/connection/connectionStore';
import { useTabStore } from '@/features/query-editor/tabStore';
import * as api from '@/services/tauri-api';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Rows3,
  Timer,
  AlertCircle,
  Clipboard,
  Copy,
  ChevronRight,
  ChevronDown,

  FileJson,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Download,
  Upload,
  List,
  Code2,
  LayoutGrid,
  RotateCcw,
  X,
  Check,
  CopyPlus,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
type ViewMode = 'list' | 'json' | 'table';

interface MongoDocumentViewProps {
  result: QueryResult | null;
  error: string | null;
  isLoading: boolean;
}

// ─── BSON Value Renderer ─────────────────────────────────────────
function ValueRenderer({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-rose-400/60 italic">null</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-cyan-400 font-semibold">{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-amber-300 tabular-nums font-medium">{value}</span>;
  }
  if (typeof value === 'string') {
    const display = value.length > 300 ? value.slice(0, 300) + '…' : value;
    return <span className="text-emerald-400/90">&quot;{display}&quot;</span>;
  }
  if (Array.isArray(value)) {
    return <CollapsibleArray items={value} depth={depth} />;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('$oid' in obj && typeof obj['$oid'] === 'string') {
      return <span className="text-fuchsia-400/90 font-mono text-[10px]">ObjectId(&quot;{obj['$oid']}&quot;)</span>;
    }
    if ('$date' in obj) {
      const d = obj['$date'];
      const str = typeof d === 'string' ? d
        : typeof d === 'object' && d !== null && '$numberLong' in (d as Record<string, unknown>)
          ? new Date(parseInt((d as Record<string, unknown>)['$numberLong'] as string)).toISOString()
          : JSON.stringify(d);
      return <span className="text-teal-400/90 font-mono text-[10px]">ISODate(&quot;{str}&quot;)</span>;
    }
    if ('$numberLong' in obj) {
      return <span className="text-amber-300 tabular-nums">NumberLong({obj['$numberLong'] as string})</span>;
    }
    if ('$numberDouble' in obj) {
      return <span className="text-amber-300 tabular-nums">{obj['$numberDouble'] as string}</span>;
    }
    return <CollapsibleObject obj={obj} depth={depth} />;
  }
  return <span className="text-foreground/70">{String(value)}</span>;
}

function CollapsibleArray({ items, depth }: { items: unknown[]; depth: number }) {
  const [open, setOpen] = useState(depth < 1 && items.length <= 5);
  if (items.length === 0) return <span className="text-muted-foreground/40">[ ]</span>;
  if (!open) {
    return (
      <button className="inline-flex items-center gap-0.5 text-blue-400/60 hover:text-blue-400 transition-colors" onClick={() => setOpen(true)}>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[10px] font-mono">Array({items.length})</span>
      </button>
    );
  }
  return (
    <div className="pl-3 ml-1 border-l-2 border-blue-500/10">
      <button className="inline-flex items-center gap-0.5 text-blue-400/60 hover:text-blue-400 transition-colors" onClick={() => setOpen(false)}>
        <ChevronDown className="h-3 w-3" />
        <span className="text-[10px] font-mono">Array({items.length})</span>
      </button>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5 py-px">
          <span className="text-muted-foreground/25 text-[10px] tabular-nums shrink-0 w-3 text-right select-none">{i}</span>
          <span className="text-muted-foreground/20">:</span>
          <ValueRenderer value={item} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function CollapsibleObject({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const keys = Object.keys(obj);
  if (keys.length === 0) return <span className="text-muted-foreground/40">{'{}'}</span>;
  if (!open) {
    return (
      <button className="inline-flex items-center gap-0.5 text-orange-400/60 hover:text-orange-400 transition-colors" onClick={() => setOpen(true)}>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[10px] font-mono">{`{${keys.length} fields}`}</span>
      </button>
    );
  }
  return (
    <div className="pl-3 ml-1 border-l-2 border-orange-500/10">
      <button className="inline-flex items-center gap-0.5 text-orange-400/60 hover:text-orange-400 transition-colors" onClick={() => setOpen(false)}>
        <ChevronDown className="h-3 w-3" />
        <span className="text-[10px] font-mono">{`{${keys.length} fields}`}</span>
      </button>
      {keys.map(key => (
        <div key={key} className="flex gap-1.5 py-px items-start">
          <span className="text-sky-300/80 text-[11px] shrink-0 font-semibold">{key}</span>
          <span className="text-muted-foreground/20">:</span>
          <div className="min-w-0"><ValueRenderer value={obj[key]} depth={depth + 1} /></div>
        </div>
      ))}
    </div>
  );
}

// ─── Document Card (List View) ──────────────────────────────────
function DocumentCard({
  doc,
  index,
  onEdit,
  onDelete,
  onClone,
}: {
  doc: Record<string, unknown>;
  index: number;
  onEdit: (doc: Record<string, unknown>) => void;
  onDelete: (doc: Record<string, unknown>) => void;
  onClone: (doc: Record<string, unknown>) => void;
}) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    toast.success('Document copied');
  };

  return (
    <div className="group relative bg-card/30 border border-border/30 rounded-lg hover:border-border/50 transition-all hover:shadow-lg hover:shadow-primary/5">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border/15 flex items-center gap-2 bg-muted/5 rounded-t-lg">
        <FileJson className="h-3 w-3 text-emerald-500/50" />
        <span className="text-[10px] text-muted-foreground/40 tabular-nums font-mono">#{index + 1}</span>
        {!!doc._id && (
          <span className="text-[9px] text-fuchsia-400/40 font-mono truncate max-w-[200px]">
            {typeof doc._id === 'object' && doc._id !== null && '$oid' in (doc._id as Record<string, unknown>)
              ? String((doc._id as Record<string, unknown>)['$oid'])
              : String(doc._id)}
          </span>
        )}
        <div className="flex-1" />
        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger className="h-5 w-5 p-0 inline-flex items-center justify-center rounded hover:bg-muted/40 text-muted-foreground/50 hover:text-foreground" onClick={() => onEdit(doc)}>
              <Pencil className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="h-5 w-5 p-0 inline-flex items-center justify-center rounded hover:bg-muted/40 text-muted-foreground/50 hover:text-foreground" onClick={() => onClone(doc)}>
              <CopyPlus className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Clone</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="h-5 w-5 p-0 inline-flex items-center justify-center rounded hover:bg-muted/40 text-muted-foreground/50 hover:text-foreground" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Copy JSON</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="h-5 w-5 p-0 inline-flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground/50 hover:text-destructive" onClick={() => onDelete(doc)}>
              <Trash2 className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {/* Body */}
      <div className="px-3 py-2 space-y-px text-[11px] font-mono leading-relaxed">
        {Object.entries(doc).map(([key, value]) => (
          <div key={key} className="flex gap-1.5 items-start">
            <span className="text-sky-300/80 shrink-0 font-semibold">{key}</span>
            <span className="text-muted-foreground/20">:</span>
            <div className="min-w-0 break-all"><ValueRenderer value={value} depth={0} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── JSON View ──────────────────────────────────────────────────
function JsonView({ docs }: { docs: Record<string, unknown>[] }) {
  const json = useMemo(() => JSON.stringify(docs, null, 2), [docs]);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    toast.success('JSON copied');
  };

  return (
    <div className="flex-1 overflow-auto relative">
      <button
        className="absolute top-2 right-4 z-10 h-6 px-2 inline-flex items-center gap-1 rounded bg-muted/50 border border-border/30 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        onClick={handleCopy}
      >
        <Clipboard className="h-3 w-3" /> Copy
      </button>
      <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed text-foreground/80 whitespace-pre">
        {json}
      </pre>
    </div>
  );
}

// ─── Table View ──────────────────────────────────────────────────
function TableView({ docs }: { docs: Record<string, unknown>[] }) {
  const columns = useMemo(() => {
    const colSet = new Set<string>();
    docs.forEach(doc => Object.keys(doc).forEach(k => colSet.add(k)));
    // Put _id first
    const cols = Array.from(colSet);
    const idIndex = cols.indexOf('_id');
    if (idIndex > 0) {
      cols.splice(idIndex, 1);
      cols.unshift('_id');
    }
    return cols;
  }, [docs]);

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if ('$oid' in obj) return obj['$oid'] as string;
      if ('$date' in obj) {
        const d = obj['$date'];
        return typeof d === 'string' ? d : JSON.stringify(d);
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-[11px] font-mono">
        <thead className="sticky top-0 bg-muted/70 backdrop-blur-sm z-10">
          <tr className="border-b border-border/40">
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground/60 w-10">#</th>
            {columns.map(col => (
              <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground/60 max-w-[250px]">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map((doc, i) => (
            <tr key={i} className={`border-b border-border/10 hover:bg-muted/15 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
              <td className="px-2 py-1 text-muted-foreground/25 tabular-nums">{i + 1}</td>
              {columns.map(col => {
                const val = doc[col];
                const isOid = typeof val === 'object' && val !== null && '$oid' in (val as Record<string, unknown>);
                return (
                  <td key={col} className={`px-2 py-1 truncate max-w-[250px] ${
                    val === null || val === undefined ? 'text-rose-400/40 italic' :
                    typeof val === 'number' ? 'text-amber-300 tabular-nums' :
                    typeof val === 'boolean' ? 'text-cyan-400' :
                    isOid ? 'text-fuchsia-400/70' :
                    typeof val === 'object' ? 'text-orange-400/60' :
                    'text-foreground/70'
                  }`}>
                    {formatCell(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Insert / Edit Dialog ───────────────────────────────────────
function DocumentDialog({
  open,
  onClose,
  onSubmit,
  initialDoc,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (json: string) => Promise<void>;
  initialDoc?: string;
  title: string;
}) {
  const [json, setJson] = useState(initialDoc || '{\n  \n}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      JSON.parse(json); // validate
    } catch {
      setError('Invalid JSON');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(json);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileJson className="h-4 w-4 text-emerald-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <textarea
            value={json}
            onChange={e => setJson(e.target.value)}
            className="w-full h-64 px-3 py-2 bg-muted/20 border border-border/40 rounded-lg font-mono text-xs leading-relaxed resize-y outline-none focus:border-primary/50 transition-colors"
            spellCheck={false}
          />
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-md">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              {title.includes('Edit') ? 'Update' : 'Insert'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export function MongoDocumentView({ result, error, isLoading }: MongoDocumentViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [insertOpen, setInsertOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Record<string, unknown> | null>(null);
  const activeConnection = useConnectionStore(s => s.connections.find(c => c.id === s.activeConnectionId));

  const docs = useMemo(() => (result?.rows ?? []) as Record<string, unknown>[], [result?.rows]);

  const getCollectionFromQuery = useCallback((): string => {
    try {
      const { tabs, activeTabId } = useTabStore.getState();
      const tab = tabs.find(t => t.id === activeTabId);
      if (!tab) return '';
      const match = tab.query.match(/db\.(\w+)\./);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }, []);

  const refreshDocs = useCallback(() => {
    const coll = getCollectionFromQuery();
    if (!coll || !activeConnection) return;
    useConnectionStore.getState().executeQuery(`db.${coll}.find({})`);
  }, [activeConnection, getCollectionFromQuery]);

  const handleInsert = useCallback(async (json: string) => {
    const coll = getCollectionFromQuery();
    if (!coll || !activeConnection) throw new Error('No collection selected');
    await api.mongoInsertOne(activeConnection, coll, json);
    toast.success('Document inserted');
    refreshDocs();
  }, [activeConnection, getCollectionFromQuery, refreshDocs]);

  const handleEdit = useCallback((doc: Record<string, unknown>) => {
    setEditDoc(doc);
  }, []);

  const handleEditSubmit = useCallback(async (json: string) => {
    const coll = getCollectionFromQuery();
    if (!coll || !activeConnection || !editDoc) throw new Error('No document to update');

    // Build filter from _id
    const id = editDoc._id;
    const filterObj = id ? { _id: id } : {};
    const filter = JSON.stringify(filterObj);

    await api.mongoUpdateOne(activeConnection, coll, filter, json);
    toast.success('Document updated');
    setEditDoc(null);
    refreshDocs();
  }, [activeConnection, editDoc, getCollectionFromQuery, refreshDocs]);

  const handleDelete = useCallback(async (doc: Record<string, unknown>) => {
    const coll = getCollectionFromQuery();
    if (!coll || !activeConnection) return;

    const id = doc._id;
    if (!id) {
      toast.error('Cannot delete document without _id');
      return;
    }
    const filter = JSON.stringify({ _id: id });

    try {
      await api.mongoDeleteOne(activeConnection, coll, filter);
      toast.success('Document deleted');
      refreshDocs();
    } catch (err) {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : String(err) });
    }
  }, [activeConnection, getCollectionFromQuery, refreshDocs]);

  const handleClone = useCallback(async (doc: Record<string, unknown>) => {
    const coll = getCollectionFromQuery();
    if (!coll || !activeConnection) return;

    // Remove _id for insert
    const { _id, ...rest } = doc;
    void _id;
    try {
      await api.mongoInsertOne(activeConnection, coll, JSON.stringify(rest));
      toast.success('Document cloned');
      refreshDocs();
    } catch (err) {
      toast.error('Clone failed', { description: err instanceof Error ? err.message : String(err) });
    }
  }, [activeConnection, getCollectionFromQuery, refreshDocs]);

  const handleExport = useCallback(async () => {
    if (!result) return;
    const json = JSON.stringify(result.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCollectionFromQuery() || 'collection'}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${result.rows.length} documents`);
  }, [result, getCollectionFromQuery]);

  const handleImport = useCallback(async () => {
    const coll = getCollectionFromQuery();
    if (!coll || !activeConnection) {
      toast.error('No collection selected');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const docs = Array.isArray(data) ? data : [data];
        let inserted = 0;
        for (const doc of docs) {
          const { _id, ...rest } = doc;
          void _id;
          await api.mongoInsertOne(activeConnection, coll, JSON.stringify(rest));
          inserted++;
        }
        toast.success(`Imported ${inserted} documents`);
        refreshDocs();
      } catch (err) {
        toast.error('Import failed', { description: err instanceof Error ? err.message : String(err) });
      }
    };
    input.click();
  }, [activeConnection, getCollectionFromQuery, refreshDocs]);

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2));
    toast.success(`Copied ${result.rows.length} documents`);
  }, [result]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          <span>Loading documents...</span>
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
          <pre className="text-xs text-destructive/80 bg-destructive/5 border border-destructive/10 rounded-md p-3 text-left whitespace-pre-wrap font-mono max-h-48 overflow-auto">{error}</pre>
        </div>
      </div>
    );
  }

  // Empty / no-query state
  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
            <FileJson className="h-5 w-5 text-emerald-500/30" />
          </div>
          <p className="text-xs text-muted-foreground/50">Click a collection to view documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ─── Toolbar ─── */}
      <div className="h-9 px-3 flex items-center gap-1.5 bg-muted/15 border-b border-border/40 shrink-0">
        {/* View mode toggle */}
        <div className="flex items-center bg-muted/30 rounded-md p-0.5 gap-px">
          {[
            { mode: 'list' as ViewMode, icon: List, label: 'List' },
            { mode: 'json' as ViewMode, icon: Code2, label: 'JSON' },
            { mode: 'table' as ViewMode, icon: LayoutGrid, label: 'Table' },
          ].map(({ mode, icon: Icon, label }) => (
            <Tooltip key={mode}>
              <TooltipTrigger
                className={`h-6 w-6 p-0 inline-flex items-center justify-center rounded transition-all ${
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/50'
                }`}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{label} View</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-4 bg-border/30" />

        {/* Doc count */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Rows3 className="h-3 w-3" />
          <span className="tabular-nums">{docs.length}</span>
          <span className="text-muted-foreground/50">docs</span>
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <Tooltip>
          <TooltipTrigger
            className="h-6 px-1.5 inline-flex items-center gap-1 rounded text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            onClick={() => setInsertOpen(true)}
          >
            <Plus className="h-3 w-3" /> ADD DATA
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Insert Document</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className="h-6 px-1.5 inline-flex items-center gap-1 rounded text-[10px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={handleExport}
          >
            <Download className="h-3 w-3" /> Export
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Export JSON</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className="h-6 px-1.5 inline-flex items-center gap-1 rounded text-[10px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={handleImport}
          >
            <Upload className="h-3 w-3" /> Import
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Import JSON</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border/30" />

        <Tooltip>
          <TooltipTrigger
            className="h-5 w-5 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground/50"
            onClick={refreshDocs}
          >
            <RotateCcw className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Refresh</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className="h-5 w-5 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground/50"
            onClick={handleCopyAll}
          >
            <Clipboard className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Copy all</TooltipContent>
        </Tooltip>

        {/* Execution time */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 ml-1">
          <Timer className="h-3 w-3" />
          {result.execution_time_ms}ms
        </div>
      </div>

      {/* ─── Content ─── */}
      {docs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground/40">No documents found</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
          {docs.map((doc, i) => (
            <DocumentCard key={i} doc={doc} index={i} onEdit={handleEdit} onDelete={handleDelete} onClone={handleClone} />
          ))}
        </div>
      ) : viewMode === 'json' ? (
        <JsonView docs={docs} />
      ) : (
        <TableView docs={docs} />
      )}

      {/* ─── Dialogs ─── */}
      <DocumentDialog
        open={insertOpen}
        onClose={() => setInsertOpen(false)}
        onSubmit={handleInsert}
        title="Insert Document"
      />

      {editDoc && (
        <DocumentDialog
          open={true}
          onClose={() => setEditDoc(null)}
          onSubmit={handleEditSubmit}
          initialDoc={JSON.stringify(editDoc, null, 2)}
          title="Edit Document"
        />
      )}
    </div>
  );
}
