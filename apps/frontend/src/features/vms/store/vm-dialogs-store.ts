import { createStore } from 'zustand/vanilla';

import type { VmFormValues } from '@/schemas/vm-form';

/** Lo que hay que mostrar al reabrir una creación que falló (RF-virtual-machines-21, DF4). */
export interface CreateRetry {
  draft: VmFormValues;
  /** El error del nombre que devolvió la API (`409`), o `null`. */
  nameError: string | null;
}

/** El modal abierto: crear (vacío o con un borrador), editar o confirmar la eliminación. */
export type VmDialog =
  | ({ kind: 'create' } & Partial<CreateRetry>)
  | { kind: 'edit'; vmId: string }
  | { kind: 'delete'; vmId: string };

export interface VmDialogsState {
  current: VmDialog | null;
  /** Una creación fallida que espera a que se cierre el modal abierto para reabrirse. */
  pendingCreateRetry: CreateRetry | null;
}

export const INITIAL_VM_DIALOGS: VmDialogsState = { current: null, pendingCreateRetry: null };

export function dialogOpened(state: VmDialogsState, dialog: VmDialog): VmDialogsState {
  return { ...state, current: dialog };
}

/** Al cerrar un modal, se abre la creación fallida que esperaba, si la hay. */
export function dialogClosed(state: VmDialogsState): VmDialogsState {
  if (state.pendingCreateRetry === null) return { ...state, current: null };
  return { current: { kind: 'create', ...state.pendingCreateRetry }, pendingCreateRetry: null };
}

/**
 * Una creación falló (DF4): el formulario se reabre solo con lo escrito, sin tapar ni reemplazar
 * otro modal. Si hay un formulario de creación abierto, su borrador no se pisa: el fallo se avisa
 * solo con el toast. Si ya había una creación fallida esperando, queda la más reciente.
 */
export function createFailed(state: VmDialogsState, retry: CreateRetry): VmDialogsState {
  if (state.current === null) return { ...state, current: { kind: 'create', ...retry } };
  if (state.current.kind === 'create') return state;
  return { ...state, pendingCreateRetry: retry };
}

export interface VmDialogsActions {
  open: (dialog: VmDialog) => void;
  close: () => void;
  createFailed: (retry: CreateRetry) => void;
}

export type VmDialogsStore = VmDialogsState & VmDialogsActions;

/**
 * Los modales del Panel. Uno por `VmWorkspace`, nunca como módulo global (en el servidor de Next se
 * compartiría entre pedidos, como el store de sesión).
 */
export function createVmDialogsStore() {
  return createStore<VmDialogsStore>()((set) => ({
    ...INITIAL_VM_DIALOGS,
    open: (dialog) => {
      set((state) => dialogOpened(state, dialog));
    },
    close: () => {
      set((state) => dialogClosed(state));
    },
    createFailed: (retry) => {
      set((state) => createFailed(state, retry));
    },
  }));
}

export type VmDialogsStoreApi = ReturnType<typeof createVmDialogsStore>;
