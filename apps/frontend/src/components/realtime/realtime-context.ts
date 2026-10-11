'use client';

import { createContext, useContext } from 'react';

import type { RealtimeStatus } from '@/lib/realtime/realtime-connection';

/** El estado de la conexión de tiempo real de la pestaña (RF-realtime-vm-status-16). */
export const RealtimeStatusContext = createContext<RealtimeStatus>('connecting');

/**
 * Las VMs cuyo estado acaba de cambiar por un evento, cada una con un contador que reinicia su
 * resalte (RF-realtime-vm-status-13). Una VM sale del mapa cuando termina su resalte.
 */
export const VmHighlightsContext = createContext<ReadonlyMap<string, number>>(new Map());

export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeStatusContext);
}

/** El contador del resalte de la VM `id`, o `undefined` si no hay que resaltarla. */
export function useVmHighlight(id: string): number | undefined {
  return useContext(VmHighlightsContext).get(id);
}
