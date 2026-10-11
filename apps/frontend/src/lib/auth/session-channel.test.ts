import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SESSION_CHANGED_MESSAGE,
  announceSessionChange,
  subscribeSessionChange,
} from './session-channel';

/** Otra pestaña del mismo navegador: otra instancia del canal (borde: `BroadcastChannel`). */
const otherTab = new BroadcastChannel('vm-session');

/** Los mensajes de `BroadcastChannel` llegan en una tarea posterior. */
function nextMessages(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

afterEach(() => {
  otherTab.onmessage = null;
});

describe('sincronización de la sesión entre pestañas (RF-auth-33)', () => {
  it('RF-auth-33 el aviso de otra pestaña llega a esta', async () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeSessionChange(onChange);

    otherTab.postMessage(SESSION_CHANGED_MESSAGE);
    await nextMessages();
    unsubscribe();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('RF-auth-33 el aviso propio llega a las otras pestañas, sin datos, y no a esta', async () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeSessionChange(onChange);
    const received: unknown[] = [];
    otherTab.onmessage = (event: MessageEvent<unknown>) => {
      received.push(event.data);
    };

    announceSessionChange();
    await nextMessages();
    unsubscribe();

    expect(received).toEqual([SESSION_CHANGED_MESSAGE]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('RF-auth-33 ignora cualquier otro mensaje', async () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeSessionChange(onChange);

    otherTab.postMessage({ user: 'admin@ejemplo.com' });
    await nextMessages();
    unsubscribe();

    expect(onChange).not.toHaveBeenCalled();
  });
});
