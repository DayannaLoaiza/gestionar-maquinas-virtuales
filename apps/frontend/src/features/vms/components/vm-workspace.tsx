'use client';

import { VmDialogs } from './vm-dialogs';
import { VmDialogsProvider } from '../store/vm-dialogs-provider';

import type { ReactNode } from 'react';

/** El Panel con sus modales: crear, editar y confirmar la eliminación de una VM. */
export function VmWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <VmDialogsProvider>
      {children}
      <VmDialogs />
    </VmDialogsProvider>
  );
}
