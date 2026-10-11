import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { MAIN_CONTENT_ID, SkipLink } from './skip-link';

import type { ReactNode } from 'react';

/**
 * Shell del panel (RF-app-shell-01): enlace para saltar al contenido, barra lateral, cabecera y área
 * de contenido principal con ancho máximo. Lo usa el layout del grupo `(panel)`.
 */
export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      <SkipLink />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-8 lg:py-12"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
