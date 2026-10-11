import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/components/auth/auth-provider';

import { LoginForm } from './login-form';

/** Borde: la navegación de Next. */
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const CLIENT = { id: 'u-2', email: 'cliente@ejemplo.com', role: 'Cliente' };

function renderLoginForm() {
  return render(
    <AuthProvider initialUser={null}>
      <LoginForm />
    </AuthProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockClear();
});

describe('LoginForm', () => {
  it('RF-auth-19 un doble clic envía un solo login, con la cookie, y lleva al Panel', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true, data: { user: CLIENT } }))),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderLoginForm();
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: ' Cliente@Ejemplo.com ' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' });

    await act(async () => {
      fireEvent.click(submit);
      fireEvent.click(submit);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cliente@ejemplo.com', password: 'secreto' }),
    });
  });

  it('RF-auth-32 el HTML del servidor no puede enviar las credenciales por la URL', () => {
    const html = renderToString(
      <AuthProvider initialUser={null}>
        <LoginForm />
      </AuthProvider>,
    );
    const container = document.createElement('div');
    container.innerHTML = html;

    expect(container.querySelector('form')?.getAttribute('method')).toBe('post');
    expect(container.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
  });
});
