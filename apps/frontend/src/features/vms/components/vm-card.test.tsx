import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { VM_STATUSES } from '@vm/shared-types';

import { AuthProvider } from '@/components/auth/auth-provider';
import { createTestQueryClient, VmTestProviders } from '@/test/query-test-utils';
import { makeVm } from '@/test/vm-fixtures';

import { PanelActions } from './panel-actions';
import { VmCard } from './vm-card';
import { VmGrid } from './vm-grid';

import type { AuthUser } from '@vm/shared-types';
import type { ReactNode } from 'react';

const ADMIN: AuthUser = { id: 'u-1', email: 'admin@ejemplo.com', role: 'Administrador' };
const CLIENT: AuthUser = { id: 'u-2', email: 'cliente@ejemplo.com', role: 'Cliente' };
/** Lo que llegaría si la API devolviera un rol que el frontend no conoce. */
const UNKNOWN_ROLE = { ...ADMIN, role: 'Root' } as unknown as AuthUser;

const VM = { ...makeVm({ name: 'web-01', status: VM_STATUSES.ON }), pending: null };

function Panel({ user, children }: { user: AuthUser | null; children: ReactNode }) {
  const [queryClient] = useState(() => createTestQueryClient([]));
  return (
    <AuthProvider initialUser={user}>
      <VmTestProviders queryClient={queryClient}>{children}</VmTestProviders>
    </AuthProvider>
  );
}

function PanelWithVm({ user }: { user: AuthUser | null }) {
  return (
    <Panel user={user}>
      <PanelActions canCreate />
      <VmCard vm={VM} />
    </Panel>
  );
}

describe('RF-virtual-machines-14 controles de escritura solo para el Administrador', () => {
  it('el Administrador ve crear, el interruptor y las acciones de la tarjeta', () => {
    render(<PanelWithVm user={ADMIN} />);

    expect(screen.getByRole('button', { name: 'Crear máquina virtual' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Encender web-01' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Acciones de web-01' })).toBeInTheDocument();
  });

  it.each([
    ['un Cliente', CLIENT],
    ['un rol desconocido', UNKNOWN_ROLE],
    ['sin usuario', null],
  ])('para %s no existe ningún control de escritura, tampoco en el HTML', (_case, user) => {
    render(<PanelWithVm user={user} />);

    expect(screen.queryByRole('switch', { hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByText(VM_STATUSES.ON)).toBeInTheDocument();

    const html = renderToString(<PanelWithVm user={user} />);
    expect(html).not.toContain('Crear máquina virtual');
    expect(html).not.toContain('Encender web-01');
    expect(html).not.toContain('Acciones de web-01');
  });

  it('el estado vacío invita a crear solo al Administrador', () => {
    const { unmount } = render(
      <Panel user={ADMIN}>
        <VmGrid vms={[]} />
      </Panel>,
    );
    expect(screen.getByRole('button', { name: 'Crear máquina virtual' })).toBeInTheDocument();
    unmount();

    render(
      <Panel user={CLIENT}>
        <VmGrid vms={[]} />
      </Panel>,
    );
    expect(screen.queryByRole('button', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByText('Cuando un administrador cree una, vas a verla aquí.')).toBeVisible();
  });
});
