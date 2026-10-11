'use client';

import { createContext, useContext, useState } from 'react';
import { useStore } from 'zustand';

import { createVmDialogsStore } from './vm-dialogs-store';

import type { VmDialogsStore, VmDialogsStoreApi } from './vm-dialogs-store';
import type { ReactNode } from 'react';

const VmDialogsContext = createContext<VmDialogsStoreApi | null>(null);

/** Da a su árbol el store de los modales del Panel, creado una vez por montaje. */
export function VmDialogsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState(createVmDialogsStore);
  return <VmDialogsContext value={store}>{children}</VmDialogsContext>;
}

/**
 * El store sin suscribirse, para leerlo o actuar desde callbacks (p. ej., el `onError` de una
 * mutación).
 */
export function useVmDialogsStoreApi(): VmDialogsStoreApi {
  const store = useContext(VmDialogsContext);
  if (store === null) throw new Error('useVmDialogs se usa dentro de un VmDialogsProvider');
  return store;
}

/** Lee el estado de los modales con un selector, o toma una acción (`open`, `close`). */
export function useVmDialogs<T>(selector: (state: VmDialogsStore) => T): T {
  return useStore(useVmDialogsStoreApi(), selector);
}
