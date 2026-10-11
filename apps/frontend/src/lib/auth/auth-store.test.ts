import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthStore, selectIsAuthenticated } from './auth-store';
import { SESSION_CHANGED_MESSAGE } from './session-channel';

const CLIENT = { id: 'u-2', email: 'cliente@ejemplo.com', role: 'Cliente' } as const;
const CREDENTIALS = { email: 'cliente@ejemplo.com', password: 'secreto' };

/** Bordes: la red, la navegación del navegador y las demás pestañas. */
const replace = vi.fn();
const otherTab = new BroadcastChannel('vm-session');
const messagesFromThisTab: unknown[] = [];
otherTab.onmessage = (event: MessageEvent<unknown>) => {
  messagesFromThisTab.push(event.data);
};

function apiResponds(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

function nextMessages(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

beforeEach(() => {
  vi.stubGlobal('location', { replace });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(async () => {
  // Los avisos de un test (el login también avisa) no deben llegar durante el siguiente.
  await nextMessages();
  vi.unstubAllGlobals();
  replace.mockClear();
  messagesFromThisTab.length = 0;
});

describe('estado de autenticación (RF-auth-22)', () => {
  it('RF-auth-22 login guarda el usuario de la respuesta, solo en memoria', async () => {
    apiResponds(200, { success: true, data: { user: CLIENT } });
    const store = createAuthStore();

    await store.getState().login(CREDENTIALS);

    expect(store.getState().user).toEqual(CLIENT);
    expect(selectIsAuthenticated(store.getState())).toBe(true);
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });

  it('RF-auth-22 una respuesta con un rol desconocido no da sesión: falla cerrado', async () => {
    apiResponds(200, { success: true, data: { user: { ...CLIENT, role: 'Root' } } });
    const store = createAuthStore();

    await expect(store.getState().login(CREDENTIALS)).rejects.toThrow();

    expect(store.getState().user).toBeNull();
    expect(selectIsAuthenticated(store.getState())).toBe(false);
  });

  it('RF-auth-22 checkSession guarda el usuario de una sesión válida', async () => {
    apiResponds(200, { success: true, data: { user: CLIENT } });
    const store = createAuthStore();

    await expect(store.getState().checkSession()).resolves.toEqual(CLIENT);
    expect(store.getState().user).toEqual(CLIENT);
  });

  it('RF-auth-22 checkSession sin sesión deja el estado sin usuario', async () => {
    apiResponds(401, { success: false, error: { message: 'Sin sesión', code: 'UNAUTHENTICATED' } });
    const store = createAuthStore(CLIENT);

    await expect(store.getState().checkSession({ onUnauthorized: 'ignore' })).resolves.toBeNull();
    expect(selectIsAuthenticated(store.getState())).toBe(false);
  });
});

describe('cierre de sesión (RF-auth-29)', () => {
  it('RF-auth-29 con la respuesta, avisa a las demás pestañas y carga /login con el aviso', async () => {
    apiResponds(200, { success: true, data: null });
    const store = createAuthStore(CLIENT);

    await store.getState().logout();
    await nextMessages();

    expect(replace).toHaveBeenCalledWith('/login?aviso=sesion-cerrada');
    expect(messagesFromThisTab).toEqual([SESSION_CHANGED_MESSAGE]);
  });

  it('RF-auth-29 si falla, lanza y la sesión sigue intacta', async () => {
    apiResponds(503, { success: false, error: { message: 'Error', code: 'INTERNAL_ERROR' } });
    const store = createAuthStore(CLIENT);

    await expect(store.getState().logout()).rejects.toThrow();
    await nextMessages();

    expect(store.getState().user).toEqual(CLIENT);
    expect(replace).not.toHaveBeenCalled();
    expect(messagesFromThisTab).toEqual([]);
  });
});
