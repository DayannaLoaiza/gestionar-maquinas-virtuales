import { AuthProvider } from '@/components/auth/auth-provider';
import { StandalonePage } from '@/components/layout/standalone-page';
import { ThemeToggle } from '@/components/theme/theme-toggle';

import type { ReactNode } from 'react';

/**
 * Páginas públicas de autenticación, fuera del shell (RF-app-shell-01, RF-auth-17). El estado de
 * autenticación nace vacío: al entrar al panel, su layout monta uno nuevo con el usuario verificado
 * en el servidor.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthProvider initialUser={null}>
      <StandalonePage headerActions={<ThemeToggle />}>{children}</StandalonePage>
    </AuthProvider>
  );
}
