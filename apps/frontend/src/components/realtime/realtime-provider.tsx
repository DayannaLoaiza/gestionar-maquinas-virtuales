'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { handleSessionExpired } from '@/lib/auth/session-navigation';
import { createRealtimeConnection } from '@/lib/realtime/realtime-connection';
import { checkRealtimeSession } from '@/lib/realtime/realtime-session';
import { createRealtimeSocket } from '@/lib/realtime/realtime-socket';
import { applyVmEvent } from '@/lib/vms/apply-vm-event';
import { resyncVms } from '@/lib/vms/vm-cache';

import { RealtimeStatusContext, VmHighlightsContext } from './realtime-context';

import type { RealtimeStatus } from '@/lib/realtime/realtime-connection';
import type { VirtualMachine } from '@vm/shared-types';
import type { ReactNode } from 'react';

/** Lo que dura el resalte de una tarjeta (`--animate-vm-flash` en `globals.css`). */
const HIGHLIGHT_MS = 2000;

function scheduleWithTimeout(callback: () => void, delayMs: number): () => void {
  const timeoutId = window.setTimeout(callback, delayMs);
  return () => {
    window.clearTimeout(timeoutId);
  };
}

/** El resalte de las tarjetas que cambiaron por un evento: un contador por VM y su fin. */
function useHighlights() {
  const [highlights, setHighlights] = useState<ReadonlyMap<string, number>>(new Map());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const flash = (id: string): void => {
    setHighlights((current) => new Map(current).set(id, (current.get(id) ?? 0) + 1));
    window.clearTimeout(timers.current.get(id));
    const timeoutId = window.setTimeout(() => {
      timers.current.delete(id);
      setHighlights((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    }, HIGHLIGHT_MS);
    timers.current.set(id, timeoutId);
  };

  return { highlights, flash };
}

/**
 * El texto de la región `role="status"`. Se vacía al terminar el resalte, así el mismo anuncio se
 * vuelve a leer si se repite (RF-realtime-vm-status-13).
 */
function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const announce = (text: string): void => {
    setAnnouncement(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setAnnouncement('');
    }, HIGHLIGHT_MS);
  };

  return { announcement, announce };
}

/**
 * El tiempo real del panel (RF-realtime-vm-status-11…16): una conexión por pestaña mientras dure el
 * layout del panel, así navegar entre sus páginas no reconecta. Aplica cada evento sobre el listado,
 * resalta la tarjeta y anuncia el cambio a los lectores de pantalla.
 */
export function RealtimeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const { announcement, announce } = useAnnouncement();
  const { highlights, flash } = useHighlights();

  const handleVmChanged = useEffectEvent((vm: VirtualMachine) => {
    if (!applyVmEvent(queryClient, vm)) return;
    flash(vm.id);
    announce(`${vm.name} ahora está ${vm.status}`);
  });

  useEffect(() => {
    const connection = createRealtimeConnection({
      createSocket: createRealtimeSocket,
      onVmChanged: (vm) => {
        handleVmChanged(vm);
      },
      onResync: () => {
        resyncVms(queryClient);
      },
      onStatus: setStatus,
      checkSession: checkRealtimeSession,
      onSessionExpired: handleSessionExpired,
      schedule: scheduleWithTimeout,
    });
    return () => {
      connection.close();
    };
  }, [queryClient]);

  return (
    <RealtimeStatusContext value={status}>
      <VmHighlightsContext value={highlights}>
        {children}
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </VmHighlightsContext>
    </RealtimeStatusContext>
  );
}
