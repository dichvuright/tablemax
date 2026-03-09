import { useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  type VisibilityState,
  type RowSelectionState,
  type HeaderGroup,
  type Header,
  type Row,
  type Cell,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useRef, useMemo, useCallback } from 'react';
import { CellRenderer, copyCellValue } from './CellRenderer';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Columns3,
  Rows3,
  Timer,
  AlertCircle,
  Table as TableIcon,
  Eye,
  EyeOff,
  Clipboard,
} from 'lucide-react';
import type { QueryResult } from '../../../shared/types/connection';

type DataRow = Record<string, unknown>;

interface VirtualDataGridProps {
  result: QueryResult | null;
  error: string | null;
  isLoading: boolean;
}

const ROW_HEIGHT = 28;
const OVERSCAN = 15;

export function VirtualDataGrid({ result, error, isLoading }: VirtualDataGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Build column definitions from result
  const columns = useMemo<ColumnDef<DataRow>[]>(() => {
    if (!result?.columns.length) return [];

    // Row number column
    const rowNumCol: ColumnDef<DataRow> = {
      id: '__row_num',
      header: '#',
      size: 50,
      minSize: 40,
      maxSize: 80,
      enableSorting: false,
      enableResizing: false,
      cell: ({ row }: { row: Row<DataRow> }) => (
        <span className="text-muted-foreground/40 tabular-nums text-[10px]">
          {row.index + 1}
        </span>
      ),
    };

    const dataCols: ColumnDef<DataRow>[] = result.columns.map(col => ({
      accessorKey: col,
      header: col,
      size: Math.max(100, Math.min(300, col.length * 10 + 40)),
      minSize: 60,
      maxSize: 800,
      cell: ({ getValue }: { getValue: () => unknown }) => <CellRenderer value={getValue()} />,
    }));

    return [rowNumCol, ...dataCols];
  }, [result?.columns]);

  const data = useMemo(() => (result?.rows ?? []) as DataRow[], [result?.rows]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnSizing,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableRowSelection: true,
  });

  const { rows: tableRows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const handleCopyRow = useCallback(async (rowIndex: number) => {
    const row = data[rowIndex];
    if (!row) return;
    const text = JSON.stringify(row, null, 2);
    await navigator.clipboard.writeText(text);
    toast.success('Row copied to clipboard');
  }, [data]);

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    const header = result.columns.join('\t');
    const rows = result.rows.map(row =>
      result.columns.map(col => {
        const val = row[col];
        return val === null || val === undefined ? 'NULL' : String(val);
      }).join('\t')
    );
    await navigator.clipboard.writeText([header, ...rows].join('\n'));
    toast.success(`Copied ${result.rows.length} rows to clipboard`);
  }, [result]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Executing query...
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
            Run a query to see results
          </p>
        </div>
      </div>
    );
  }

  const totalWidth = table.getTotalSize();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-8 px-3 flex items-center gap-2 bg-muted/20 border-b border-border shrink-0">
        {/* Row count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Rows3 className="h-3 w-3" />
          <span>{data.length.toLocaleString()} rows</span>
        </div>

        {/* Columns count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Columns3 className="h-3 w-3" />
          <span>{result.columns.length} cols</span>
        </div>

        {/* Affected rows */}
        {result.affected_rows > 0 && (
          <Badge variant="outline" className="text-[10px] h-5">
            {result.affected_rows} affected
          </Badge>
        )}

        {/* Selected rows */}
        {Object.keys(rowSelection).length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {Object.keys(rowSelection).length} selected
          </Badge>
        )}

        <div className="flex-1" />

        {/* Column visibility toggle */}
        <Tooltip>
          <TooltipTrigger
            className="h-5 w-5 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            onClick={() => setShowColumnPicker(!showColumnPicker)}
          >
            {showColumnPicker ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Toggle columns
          </TooltipContent>
        </Tooltip>

        {/* Copy all */}
        <Tooltip>
          <TooltipTrigger
            className="h-5 w-5 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            onClick={handleCopyAll}
          >
            <Clipboard className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Copy all rows (TSV)
          </TooltipContent>
        </Tooltip>

        {/* Execution time */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Timer className="h-3 w-3" />
          {result.execution_time_ms}ms
        </div>
      </div>

      {/* Column Picker */}
      {showColumnPicker && (
        <div className="px-3 py-2 border-b border-border bg-muted/10 flex flex-wrap gap-1.5 shrink-0">
          {result.columns.map(col => {
            const isVisible = columnVisibility[col] !== false;
            return (
              <button
                key={col}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                  isVisible
                    ? 'bg-accent/50 border-accent text-accent-foreground'
                    : 'bg-muted/30 border-border/50 text-muted-foreground/50 line-through'
                }`}
                onClick={() =>
                  setColumnVisibility((prev: VisibilityState) => ({ ...prev, [col]: !isVisible }))
                }
              >
                {col}
              </button>
            );
          })}
        </div>
      )}

      {/* If no columns (write query), show affected message */}
      {result.columns.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            Query executed successfully. {result.affected_rows} row(s) affected.
          </div>
        </div>
      ) : (
        /* Virtualized Table */
        <div
          ref={parentRef}
          className="flex-1 overflow-auto"
        >
          <div style={{ minWidth: totalWidth }}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm border-b border-border">
              {table.getHeaderGroups().map((headerGroup: HeaderGroup<DataRow>) => (
                <div key={headerGroup.id} className="flex">
                  {headerGroup.headers.map((header: Header<DataRow, unknown>) => (
                    <div
                      key={header.id}
                      className="relative flex items-center border-r border-border/40 last:border-r-0 select-none"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={`flex-1 flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left truncate ${
                            header.column.getCanSort() ? 'cursor-pointer' : 'cursor-default'
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                          title={header.column.id}
                        >
                          <span className="truncate">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getIsSorted() === 'asc' && (
                            <ArrowUp className="h-3 w-3 shrink-0 text-primary" />
                          )}
                          {header.column.getIsSorted() === 'desc' && (
                            <ArrowDown className="h-3 w-3 shrink-0 text-primary" />
                          )}
                          {header.column.getCanSort() && !header.column.getIsSorted() && (
                            <ArrowUpDown className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-30" />
                          )}
                        </button>
                      )}

                      {/* Column resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-colors ${
                            header.column.getIsResizing()
                              ? 'bg-primary'
                              : 'hover:bg-primary/50'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Virtualized rows */}
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                const row = tableRows[virtualRow.index];
                const isSelected = row.getIsSelected();

                return (
                  <div
                    key={row.id}
                    data-index={virtualRow.index}
                    className={`absolute left-0 w-full flex border-b border-border/20 transition-colors ${
                      isSelected
                        ? 'bg-primary/10'
                        : virtualRow.index % 2 === 0
                          ? 'hover:bg-muted/20'
                          : 'bg-muted/5 hover:bg-muted/20'
                    }`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        row.toggleSelected();
                      } else {
                        setRowSelection({ [row.id]: true });
                      }
                    }}
                    onDoubleClick={() => handleCopyRow(virtualRow.index)}
                  >
                    {row.getVisibleCells().map((cell: Cell<DataRow, unknown>) => (
                      <div
                        key={cell.id}
                        className="flex items-center px-2 border-r border-border/20 last:border-r-0 overflow-hidden"
                        style={{ width: cell.column.getSize() }}
                        onDoubleClick={async (e) => {
                          e.stopPropagation();
                          const value = cell.getValue();
                          await copyCellValue(value);
                          toast.success('Cell value copied');
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
