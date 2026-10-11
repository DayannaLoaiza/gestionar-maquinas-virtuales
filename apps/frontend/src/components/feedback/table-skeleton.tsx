import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { SkeletonRegion } from './skeleton-region';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  label?: string | undefined;
  className?: string | undefined;
}

/** Anchos que se alternan por columna, para que la tabla no parezca una grilla de bloques iguales. */
const CELL_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3'] as const;

function cellWidth(column: number): string {
  return CELL_WIDTHS[column % CELL_WIDTHS.length] ?? 'w-1/2';
}

function SkeletonRow({ columns, isHeader }: { columns: number; isHeader: boolean }) {
  return (
    <div
      className={cn(
        'grid gap-4 px-4',
        isHeader ? 'bg-muted/60 py-3' : 'border-t border-border py-4',
      )}
      style={{ gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }, (_, column) => (
        <Skeleton key={column} className={cn(isHeader ? 'h-3' : 'h-4', cellWidth(column))} />
      ))}
    </div>
  );
}

/** Skeleton de una tabla: encabezado y `rows` filas de `columns` columnas (RF-app-shell-08). */
export function TableSkeleton({ rows = 5, columns = 4, label, className }: TableSkeletonProps) {
  return (
    <SkeletonRegion
      label={label}
      className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}
    >
      <SkeletonRow columns={columns} isHeader />
      {Array.from({ length: rows }, (_, row) => (
        <SkeletonRow key={row} columns={columns} isHeader={false} />
      ))}
    </SkeletonRegion>
  );
}
