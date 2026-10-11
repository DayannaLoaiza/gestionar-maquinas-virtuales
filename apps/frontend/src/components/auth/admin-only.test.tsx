import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AdminOnly } from './admin-only';
import { AuthProvider } from './auth-provider';

import type { AuthUser } from '@vm/shared-types';

const ADMIN: AuthUser = { id: 'u-1', email: 'admin@ejemplo.com', role: 'Administrador' };
const CLIENT: AuthUser = { id: 'u-2', email: 'cliente@ejemplo.com', role: 'Cliente' };
/** Lo que llegaría si la API devolviera un rol que el frontend no conoce. */
const UNKNOWN_ROLE = { ...ADMIN, role: 'Root' } as unknown as AuthUser;

function ToolbarFor({ user }: { user: AuthUser | null }) {
  return (
    <AuthProvider initialUser={user}>
      <AdminOnly>
        <button type="button">Crear máquina virtual</button>
      </AdminOnly>
    </AuthProvider>
  );
}

describe('AdminOnly (RF-auth-30)', () => {
  it('RF-auth-30 un Administrador ve el control', () => {
    render(<ToolbarFor user={ADMIN} />);

    expect(screen.getByRole('button', { name: 'Crear máquina virtual' })).toBeInTheDocument();
  });

  it.each([
    ['un Cliente', CLIENT],
    ['un rol desconocido', UNKNOWN_ROLE],
    ['sin usuario', null],
  ])('RF-auth-30 para %s el control no existe en el DOM', (_case, user) => {
    const { container } = render(<ToolbarFor user={user} />);

    expect(screen.queryByRole('button', { hidden: true })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('RF-auth-30 para un Cliente el control tampoco está en el HTML del servidor', () => {
    expect(renderToString(<ToolbarFor user={CLIENT} />)).not.toContain('Crear máquina virtual');
    expect(renderToString(<ToolbarFor user={ADMIN} />)).toContain('Crear máquina virtual');
  });
});
