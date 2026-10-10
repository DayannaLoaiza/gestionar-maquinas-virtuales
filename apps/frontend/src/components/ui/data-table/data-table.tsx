'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import type { ColumnDef, SortingState } from '@tanstack/react-table';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
}

const SORT_ICONS = { asc: '▲', desc: '▼' } as const;

/** Tabla genérica con ordenamiento, búsqueda global y paginación en cliente. */
export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Buscar…',
  pageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 no es compatible con React Compiler.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const { pageIndex } = table.getState().pagination;
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={globalFilter}
        onChange={(event) => {
          setGlobalFilter(event.target.value);
        }}
        placeholder={searchPlaceholder}
        className="w-full max-w-xs rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs tracking-wide text-muted-foreground uppercase">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} scope="col" className="px-4 py-2 font-medium">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!header.column.getCanSort()}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1',
                            header.column.getCanSort() && 'cursor-pointer select-none',
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted ? <span aria-hidden>{SORT_ICONS[sorted]}</span> : null}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {pageIndex + 1} de {Math.max(1, table.getPageCount())} ·{' '}
          {table.getFilteredRowModel().rows.length} resultados
        </span>
        <div className="flex gap-2">
          <PagerButton
            onClick={() => {
              table.previousPage();
            }}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </PagerButton>
          <PagerButton
            onClick={() => {
              table.nextPage();
            }}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </PagerButton>
        </div>
      </div>
    </div>
  );
}

function PagerButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-md border border-border px-3 py-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
