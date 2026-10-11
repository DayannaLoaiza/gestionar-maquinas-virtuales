import { MAIN_NAV_LABEL } from '@/config/navigation';

import { Brand } from './brand';
import { NavLinks } from './nav-links';

/** Barra lateral fija desde 1024 px (RF-app-shell-02, 04). Por debajo, la reemplaza `MobileNav`. */
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <Brand />
      </div>
      <nav aria-label={MAIN_NAV_LABEL} className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </nav>
    </aside>
  );
}
