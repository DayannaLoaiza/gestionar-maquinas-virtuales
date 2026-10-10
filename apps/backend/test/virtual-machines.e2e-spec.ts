import request from 'supertest';
import { DataSource } from 'typeorm';

import { ROLES, VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import { loginAs, seedUser } from './support/auth-helpers';
import { createTestApp } from './support/test-app';
import {
  clearVms,
  createVm,
  itemOf,
  listVms,
  NONEXISTENT_VM_ID,
  VM_RESPONSE_KEYS,
  vmBody,
} from './support/vm-helpers';

import type { TestUser } from './support/auth-helpers';
import type { INestApplication } from '@nestjs/common';
import type { ApiSuccess, AuthUser, VirtualMachine } from '@vm/shared-types';
import type { App } from 'supertest/types';

const ADMIN: TestUser = { email: 'admin@example.com', password: 'Admin-e2e-1', role: ROLES.ADMIN };
const CLIENT: TestUser = {
  email: 'cliente@example.com',
  password: 'Cliente-e2e-1',
  role: ROLES.CLIENT,
};

const VM_NAME_TAKEN_BODY = {
  success: false,
  error: { message: 'Ya existe una máquina virtual con ese nombre', code: 'VM_NAME_TAKEN' },
};
const VM_NOT_FOUND_BODY = {
  success: false,
  error: { message: 'La máquina virtual no existe o fue eliminada', code: 'VM_NOT_FOUND' },
};

let app: INestApplication<App>;
let adminCookie: string;
let clientCookie: string;

// Una sola app y un login por rol: el rate limit del login corta en 5 por minuto (RF-auth-04).
beforeAll(async () => {
  app = await createTestApp();
  await seedUser(app, ADMIN);
  await seedUser(app, CLIENT);
  adminCookie = await loginAs(app, ADMIN);
  clientCookie = await loginAs(app, CLIENT);
});

beforeEach(async () => {
  await clearVms(app);
});

afterAll(async () => {
  await app.close();
});

function http(): ReturnType<typeof request> {
  return request(app.getHttpServer());
}

function putVm(id: string, body: object, cookie = adminCookie): request.Test {
  return http().put(`/api/vms/${id}`).set('Cookie', cookie).send(body);
}

function deleteVm(id: string, cookie = adminCookie): request.Test {
  return http().delete(`/api/vms/${id}`).set('Cookie', cookie);
}

/** Petición de escritura sin cookie de sesión. */
function sendWithoutSession(method: string, path: string): request.Test {
  if (method === 'POST') return http().post(path).send(vmBody());
  if (method === 'PUT') return http().put(path).send({ cores: 4 });
  return http().delete(path);
}

describe('RF-virtual-machines-01 — listado completo para los dos roles', () => {
  it('Administrador y Cliente reciben todas las VMs, de la más nueva a la más antigua', async () => {
    await createVm(app, adminCookie, { name: 'vm-a' });
    await createVm(app, adminCookie, { name: 'vm-b' });
    await createVm(app, adminCookie, { name: 'vm-c' });

    for (const cookie of [adminCookie, clientCookie]) {
      const items = await listVms(app, cookie);
      expect(items.map((vm) => vm.name)).toEqual(['vm-c', 'vm-b', 'vm-a']);
    }
  });

  it('sin VMs, items es []', async () => {
    const response = await http().get('/api/vms').set('Cookie', clientCookie).expect(200);

    expect(response.body).toEqual({ success: true, data: { items: [] } });
  });
});

describe('RF-virtual-machines-02 — sesión obligatoria y escritura solo para Administrador', () => {
  it.each([
    ['GET', '/api/vms'],
    ['POST', '/api/vms'],
    ['PUT', `/api/vms/${NONEXISTENT_VM_ID}`],
    ['DELETE', `/api/vms/${NONEXISTENT_VM_ID}`],
  ])('sin sesión, %s %s responde 401 UNAUTHENTICATED', async (method, path) => {
    const call = method === 'GET' ? http().get(path) : sendWithoutSession(method, path);

    const response = await call.expect(401);

    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  });

  it('un Cliente recibe 403 en POST, PUT y DELETE, y las VMs quedan igual', async () => {
    const vm = await createVm(app, adminCookie);

    const responses = [
      await http()
        .post('/api/vms')
        .set('Cookie', clientCookie)
        .send(vmBody({ name: 'otra' })),
      await putVm(vm.id, { cores: 8 }, clientCookie),
      await deleteVm(vm.id, clientCookie),
    ];

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    }
    expect(await listVms(app, adminCookie)).toEqual([vm]);
  });

  it('el 403 llega antes de validar el cuerpo o buscar el id', async () => {
    const responses = [
      await http().post('/api/vms').set('Cookie', clientCookie).send({}),
      await putVm(NONEXISTENT_VM_ID, { cores: -1 }, clientCookie),
      await deleteVm(NONEXISTENT_VM_ID, clientCookie),
      await deleteVm('no-es-un-uuid', clientCookie),
    ];

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403]);
  });
});

describe('RF-virtual-machines-03 — crear una VM', () => {
  it('responde 201 con la VM guardada: id del servidor, nombre recortado y Apagada por omisión', async () => {
    const response = await http()
      .post('/api/vms')
      .set('Cookie', adminCookie)
      .send(vmBody({ name: '  web-01  ' }))
      .expect(201);

    const item = itemOf(response);
    expect(item).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
      name: 'web-01',
      cores: 2,
      ram: 4,
      disk: 50,
      os: VM_OPERATING_SYSTEMS.UBUNTU,
      status: VM_STATUSES.OFF,
    });
    expect(await listVms(app, adminCookie)).toEqual([item]);
  });

  it('respeta el estado enviado y guarda al Administrador como creador', async () => {
    const item = await createVm(app, adminCookie, { status: VM_STATUSES.ON });

    expect(item.status).toBe(VM_STATUSES.ON);
    const me = await http().get('/api/auth/me').set('Cookie', adminCookie).expect(200);
    const adminId = (me.body as ApiSuccess<{ user: AuthUser }>).data.user.id;
    const rows: unknown = await app
      .get(DataSource)
      .query('SELECT created_by FROM virtual_machines WHERE id = $1', [item.id]);
    expect(rows).toEqual([{ created_by: adminId }]);
  });
});

describe('RF-virtual-machines-06 — nombre único sin distinguir mayúsculas', () => {
  it('crear con el nombre de otra VM, en otras mayúsculas: 409 VM_NAME_TAKEN', async () => {
    await createVm(app, adminCookie, { name: 'web-01' });

    const response = await http()
      .post('/api/vms')
      .set('Cookie', adminCookie)
      .send(vmBody({ name: 'WEB-01' }))
      .expect(409);

    expect(response.body).toEqual(VM_NAME_TAKEN_BODY);
    expect(await listVms(app, adminCookie)).toHaveLength(1);
  });

  it('renombrar con el nombre de otra VM: 409 y la VM no cambia', async () => {
    await createVm(app, adminCookie, { name: 'web-01' });
    const other = await createVm(app, adminCookie, { name: 'db-01' });

    const response = await putVm(other.id, { name: 'Web-01', cores: 16 }).expect(409);

    expect(response.body).toEqual(VM_NAME_TAKEN_BODY);
    const items = await listVms(app, adminCookie);
    expect(items.find((vm) => vm.id === other.id)).toEqual(other);
  });

  it('una VM puede cambiar solo las mayúsculas de su propio nombre', async () => {
    const vm = await createVm(app, adminCookie, { name: 'web-01' });

    const response = await putVm(vm.id, { name: 'Web-01' }).expect(200);

    expect(itemOf(response).name).toBe('Web-01');
  });

  it('dos POST simultáneos con el mismo nombre: un 201, un 409 y una sola VM', async () => {
    const send = (): request.Test =>
      http()
        .post('/api/vms')
        .set('Cookie', adminCookie)
        .send(vmBody({ name: 'web-01' }));

    const responses = await Promise.all([send(), send()]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await listVms(app, adminCookie)).toHaveLength(1);
  });
});

describe('RF-virtual-machines-07 — actualizar solo los campos enviados', () => {
  it('cambia lo enviado, conserva el resto y avanza updatedAt', async () => {
    const vm = await createVm(app, adminCookie);

    const response = await putVm(vm.id, { cores: 8, os: VM_OPERATING_SYSTEMS.DEBIAN }).expect(200);

    const updated = itemOf(response);
    expect(updated).toEqual({
      ...vm,
      cores: 8,
      os: VM_OPERATING_SYSTEMS.DEBIAN,
      updatedAt: expect.any(String) as unknown,
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(vm.updatedAt));
    expect(await listVms(app, adminCookie)).toEqual([updated]);
  });
});

describe('RF-virtual-machines-09 — eliminar una VM', () => {
  it('responde 204 sin cuerpo y la VM deja de listarse', async () => {
    const vm = await createVm(app, adminCookie);

    const response = await deleteVm(vm.id).expect(204);

    expect(response.text).toBe('');
    expect(await listVms(app, adminCookie)).toEqual([]);
  });
});

describe('RF-virtual-machines-10 — id inexistente o inválido', () => {
  it('PUT y DELETE de un id que no existe: 404 VM_NOT_FOUND', async () => {
    const putResponse = await putVm(NONEXISTENT_VM_ID, { cores: 4 }).expect(404);
    const deleteResponse = await deleteVm(NONEXISTENT_VM_ID).expect(404);

    expect(putResponse.body).toEqual(VM_NOT_FOUND_BODY);
    expect(deleteResponse.body).toEqual(VM_NOT_FOUND_BODY);
  });

  it('tras eliminarla, un segundo DELETE y un PUT responden 404 y la VM no reaparece', async () => {
    const vm = await createVm(app, adminCookie);
    await deleteVm(vm.id).expect(204);

    await deleteVm(vm.id).expect(404);
    await putVm(vm.id, { cores: 4 }).expect(404);

    expect(await listVms(app, adminCookie)).toEqual([]);
  });

  it('un id que no es UUID: 400 VALIDATION_ERROR', async () => {
    const putResponse = await putVm('abc', { cores: 4 }).expect(400);
    const deleteResponse = await deleteVm('abc').expect(400);

    for (const response of [putResponse, deleteResponse]) {
      expect(response.body).toEqual({
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
      });
    }
  });
});

describe('RF-virtual-machines-11 — forma de una VM en la API', () => {
  function expectVmShape(vm: VirtualMachine): void {
    expect(Object.keys(vm).sort()).toEqual(VM_RESPONSE_KEYS);
    expect(new Date(vm.createdAt).toISOString()).toBe(vm.createdAt);
    expect(new Date(vm.updatedAt).toISOString()).toBe(vm.updatedAt);
  }

  it('POST, PUT y GET devuelven exactamente los 9 campos, sin el creador', async () => {
    const created = await createVm(app, adminCookie);
    const updated = itemOf(await putVm(created.id, { ram: 8 }).expect(200));
    const [listed] = await listVms(app, clientCookie);

    for (const vm of [created, updated, listed]) {
      if (!vm) throw new Error('La VM no se listó');
      expectVmShape(vm);
    }
  });
});

describe('RF-virtual-machines-12 — cambiar el estado', () => {
  it('pasa de Apagada a Encendida y vuelve; reenviar el mismo estado no es error', async () => {
    const vm = await createVm(app, adminCookie);
    expect(vm.status).toBe(VM_STATUSES.OFF);

    const statuses: string[] = [];
    for (const status of [VM_STATUSES.ON, VM_STATUSES.ON, VM_STATUSES.OFF]) {
      const response = await putVm(vm.id, { status }).expect(200);
      statuses.push(itemOf(response).status);
    }

    expect(statuses).toEqual([VM_STATUSES.ON, VM_STATUSES.ON, VM_STATUSES.OFF]);
  });
});
