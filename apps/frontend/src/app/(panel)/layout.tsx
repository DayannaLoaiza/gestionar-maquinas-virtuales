import { AuthProvider } from '@/components/auth/auth-provider';
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/components/providers/query-provider';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import { requireUser } from '@/lib/auth/session';

import type { ReactNode } from 'react';

/**
 * Páginas del panel: privadas y dentro del shell (RF-app-shell-01). En la carga completa verifica la
 * sesión con la API (RF-auth-24) y le da al estado de autenticación el usuario ya verificado. Al
 * navegar, el layout no se vuelve a renderizar: cada página llama además a `requireUser()`
 * (RF-auth-25). `QueryProvider` da el estado de las VMs a todas las páginas del panel, y
 * `RealtimeProvider` mantiene una conexión de tiempo real por pestaña (RF-realtime-vm-status-11).
 */
export default async function PanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();
  return (
    <AuthProvider initialUser={user}>
      <QueryProvider>
        <RealtimeProvider>
          <AppShell>{children}</AppShell>
        </RealtimeProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
