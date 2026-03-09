import { cn } from '@/lib/utils';

export type CellType = 'null' | 'number' | 'boolean' | 'date' | 'json' | 'text';

/**
 * Detect the type of a cell value for styling
 */
export function detectCellType(value: unknown): CellType {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'json';
  if (typeof value === 'string') {
    // Check for date-like strings
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  }
  return 'text';
}

/**
 * Format a cell value for display
 */
export function formatCellValue(value: unknown, type: CellType): string {
  switch (type) {
    case 'null':
      return 'NULL';
    case 'number':
      return String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'json':
      try {
        return JSON.stringify(value, null, 0);
      } catch {
        return String(value);
      }
    case 'date':
      return String(value);
    case 'text':
    default:
      return String(value);
  }
}

interface CellRendererProps {
  value: unknown;
  className?: string;
}

/**
 * Smart cell renderer with type-based styling
 */
export function CellRenderer({ value, className }: CellRendererProps) {
  const type = detectCellType(value);
  const displayValue = formatCellValue(value, type);

  return (
    <span
      className={cn(
        'block truncate',
        {
          'text-muted-foreground/40 italic font-mono text-[10px]': type === 'null',
          'tabular-nums text-amber-400/90': type === 'number',
          'font-mono text-sky-400/90': type === 'boolean',
          'text-emerald-400/80': type === 'date',
          'font-mono text-orange-400/70 text-[10px]': type === 'json',
          '': type === 'text',
        },
        className,
      )}
      title={displayValue}
    >
      {displayValue}
    </span>
  );
}

/**
 * Copy value to clipboard
 */
export async function copyCellValue(value: unknown): Promise<void> {
  const type = detectCellType(value);
  const text = type === 'json'
    ? JSON.stringify(value, null, 2)
    : formatCellValue(value, type);
  await navigator.clipboard.writeText(text);
}
