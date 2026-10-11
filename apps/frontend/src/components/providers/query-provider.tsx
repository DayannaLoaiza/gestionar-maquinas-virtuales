'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query/query-client';

import type { ReactNode } from 'react';

/** Da a las páginas del panel el `QueryClient` de la pestaña (`getQueryClient`). */
export function QueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
