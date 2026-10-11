import { Brand } from './brand';

import type { ReactNode } from 'react';

/**
 * Marco de las páginas fuera del shell (404, error, login): la marca arriba, acciones opcionales a
 * la derecha y el contenido centrado.
 */
export function StandalonePage({
  children,
  headerActions,
}: Readonly<{ children: ReactNode; headerActions?: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4 sm:px-6 lg:px-8">
        <Brand />
        {headerActions}
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
