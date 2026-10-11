import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { selectUser } from '@/lib/auth/auth-store';

import { AuthProvider } from './auth-provider';
import { useAuthStore } from './use-auth-store';

const ADMIN = { id: 'u-1', email: 'admin@ejemplo.com', role: 'Administrador' } as const;
const CLIENT = { id: 'u-2', email: 'cliente@ejemplo.com', role: 'Cliente' } as const;

function CurrentEmail() {
  const user = useAuthStore(selectUser);
  return <p>{user?.email ?? 'sin sesión'}</p>;
}

function LoginButton() {
  const login = useAuthStore((state) => state.login);
  return (
    <button type="button" onClick={() => void login({ email: CLIENT.email, password: 'secreto' })}>
      Entrar
    </button>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthProvider (RF-auth-23)', () => {
  it('RF-auth-23 dos proveedores no comparten estado: cada árbol tiene su usuario', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true, data: { user: CLIENT } }))),
      ),
    );
    render(
      <>
        <section aria-label="pedido A">
          <AuthProvider initialUser={null}>
            <CurrentEmail />
            <LoginButton />
          </AuthProvider>
        </section>
        <section aria-label="pedido B">
          <AuthProvider initialUser={ADMIN}>
            <CurrentEmail />
          </AuthProvider>
        </section>
      </>,
    );
    const requestA = within(screen.getByRole('region', { name: 'pedido A' }));
    const requestB = within(screen.getByRole('region', { name: 'pedido B' }));

    await act(async () => {
      requestA.getByRole('button', { name: 'Entrar' }).click();
      await Promise.resolve();
    });

    expect(await requestA.findByText(CLIENT.email)).toBeInTheDocument();
    expect(requestB.getByText(ADMIN.email)).toBeInTheDocument();
    expect(requestB.queryByText(CLIENT.email)).not.toBeInTheDocument();
  });
});
