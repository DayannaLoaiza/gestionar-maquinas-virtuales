import type { PaginationMeta } from '@vm/shared-types';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Convierte los strings de query `page`/`pageSize` en números (en el controller).
 *
 * Tolerante a propósito: un valor ilegible cae al default en vez de responder 400 (`'2abc'` se lee
 * como 2; `'0'` y `'abc'`, como el default), y `pageSize` se recorta a `MAX_PAGE_SIZE`.
 */
export function normalizePagination(page?: string, pageSize?: string): Pagination {
  return {
    page: Math.max(1, parseInt(page ?? '1', 10) || 1),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    ),
  };
}

/** Metadatos de la página (en el service), con el total de elementos. */
export function buildPaginationMeta({ page, pageSize }: Pagination, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
