import { useConnectionStore } from '@/features/connection/connectionStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  Timer,
  AlertCircle,
  Rows3,
} from 'lucide-react';

export function ResultTable() {
  const { queryResult, queryError, isExecuting } = useConnectionStore();

  // Loading state
  if (isExecuting) {
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
  if (queryError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">Query Error</p>
          <pre className="text-xs text-destructive/80 bg-destructive/5 border border-destructive/10 rounded-md p-3 text-left whitespace-pre-wrap font-mono">
            {queryError}
          </pre>
        </div>
      </div>
    );
  }

  // Empty state
  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Table className="h-6 w-6 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground/50">
            Run a query to see results
          </p>
        </div>
      </div>
    );
  }

  const { columns, rows, affected_rows, execution_time_ms } = queryResult;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status Bar */}
      <div className="h-8 px-3 flex items-center gap-3 bg-muted/20 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Rows3 className="h-3 w-3" />
          <span>{rows.length} rows</span>
        </div>
        {affected_rows > 0 && (
          <Badge variant="outline" className="text-[10px] h-5">
            {affected_rows} affected
          </Badge>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Timer className="h-3 w-3" />
          {execution_time_ms}ms
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        {columns.length > 0 ? (
          <div className="min-w-full">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-10 border-r border-border/50">
                    #
                  </th>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-3 py-1.5 text-left font-medium text-muted-foreground border-r border-border/50 last:border-r-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-1 text-muted-foreground/50 border-r border-border/50 tabular-nums">
                      {rowIdx + 1}
                    </td>
                    {columns.map((col, colIdx) => {
                      const value = row[col];
                      const isNull = value === null || value === undefined;
                      return (
                        <td
                          key={colIdx}
                          className={`px-3 py-1 border-r border-border/50 last:border-r-0 max-w-xs truncate ${
                            isNull ? 'text-muted-foreground/40 italic' : ''
                          }`}
                        >
                          {isNull ? 'NULL' : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Query executed successfully. {affected_rows} row(s) affected.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
