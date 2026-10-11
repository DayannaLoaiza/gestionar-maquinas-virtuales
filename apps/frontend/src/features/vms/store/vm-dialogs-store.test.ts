import { describe, expect, it } from 'vitest';

import { EMPTY_VM_FORM } from '@/schemas/vm-form';

import { createFailed, dialogClosed, INITIAL_VM_DIALOGS } from './vm-dialogs-store';

import type { CreateRetry, VmDialogsState } from './vm-dialogs-store';

const RETRY: CreateRetry = { draft: { ...EMPTY_VM_FORM, name: 'web-09' }, nameError: null };

describe('RF-virtual-machines-21 el formulario de creación se reabre tras un fallo (DF4)', () => {
  it('sin otro modal abierto, se abre con el borrador', () => {
    expect(createFailed(INITIAL_VM_DIALOGS, RETRY).current).toEqual({ kind: 'create', ...RETRY });
  });

  it('con otro modal abierto, espera a que se cierre y no lo reemplaza', () => {
    const editing: VmDialogsState = { ...INITIAL_VM_DIALOGS, current: { kind: 'edit', vmId: 'a' } };

    const waiting = createFailed(editing, RETRY);

    expect(waiting.current).toEqual({ kind: 'edit', vmId: 'a' });
    expect(dialogClosed(waiting)).toEqual({
      current: { kind: 'create', ...RETRY },
      pendingCreateRetry: null,
    });
  });

  it('con un formulario de creación abierto, no pisa su borrador', () => {
    const creating: VmDialogsState = {
      ...INITIAL_VM_DIALOGS,
      current: { kind: 'create', draft: { ...EMPTY_VM_FORM, name: 'otra' }, nameError: null },
    };

    expect(createFailed(creating, RETRY)).toBe(creating);
  });
});
