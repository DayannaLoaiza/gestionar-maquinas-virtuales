'use client';

import { useState } from 'react';

import { useAuthStore } from '@/components/auth/use-auth-store';
import { Logout } from '@/components/svg/logout';
import { UserCircle } from '@/components/svg/user-circle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notify } from '@/components/ui/toast';
import { selectUser } from '@/lib/auth/auth-store';

/** El texto del toast si el logout falla: la spec lo deja al plan (RF-auth-29). */
const LOGOUT_FAILED_MESSAGE = 'No se pudo cerrar sesión. Revisa tu conexión e intenta de nuevo.';

/**
 * Menú de la persona en la cabecera del panel (RF-auth-28): su correo, su rol y "Cerrar sesión".
 * Si el logout falla, la sesión sigue y se avisa con un toast (RF-auth-29).
 */
export function UserMenu() {
  const user = useAuthStore(selectUser);
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (user === null) return null;

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      notify.error(LOGOUT_FAILED_MESSAGE);
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 px-2 sm:px-3"
          aria-label={`Cuenta de ${user.email}`}
        >
          <UserCircle className="size-5" />
          <span className="hidden max-w-48 truncate sm:inline">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate text-sm font-medium text-foreground">{user.email}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoggingOut}
          onSelect={() => {
            void handleLogout();
          }}
        >
          <Logout />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
