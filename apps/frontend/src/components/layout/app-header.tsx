import { ThemeToggle } from '@/components/theme/theme-toggle';
import { UserMenu } from '@/features/auth/components/user-menu';

import { Brand } from './brand';
import { MobileNav } from './mobile-nav';

/**
 * Cabecera del panel (RF-app-shell-03): selector de tema y menú de la persona (RF-auth-28) a la
 * derecha y, en pantallas angostas, el botón de menú y la marca.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <MobileNav />
      <div className="lg:hidden">
        <Brand />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
