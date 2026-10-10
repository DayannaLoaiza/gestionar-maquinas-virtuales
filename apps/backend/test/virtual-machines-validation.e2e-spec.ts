import request from 'supertest';

import { ROLES, VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import { loginAs, seedUser } from './support/auth-helpers';
import { createTestApp } from './support/test-app';
import {
  clearVms,
  createVm,
  itemOf,
  listVms,
  NONEXISTENT_VM_ID,
  VALID_VM_BODY,
  vmBody,
} from './support/vm-helpers';

import type { TestUser } from './support/auth-helpers';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

const ADMIN: TestUser = { email: 'admin@example.com', password: 'Admin-e2e-1', role: ROLES.ADMIN };

const VALIDATION_ERROR_BODY = {
  success: false,
  error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
};

let app: INestApplication<App>;
let adminCookie: string;

// Una sola app y un solo login: el rate limit del login corta en 5 por minuto (RF-auth-04).
beforeAll(async () => {
  app = await createTestApp();
  await seedUser(app, ADMIN);
  adminCookie = await loginAs(app, ADMIN);
});

beforeEach(async () => {
  await clearVms(app);
});

afterAll(async () => {
  await app.close();
});

function postVm(body: unknown): request.Test {
  return request(app.getHttpServer())
    .post('/api/vms')
    .set('Cookie', adminCookie)
    .send(body as object);
}

function putVm(id: string, body: unknown): request.Test {
  return request(app.getHttpServer())
    .put(`/api/vms/${id}`)
    .set('Cookie', adminCookie)
    .send(body as object);
}

describe('RF-virtual-machines-04 — POST con un cuerpo que no cumple el DTO', () => {
  it.each(['name', 'cores', 'ram', 'disk', 'os'])(
    'sin %s: 400 VALIDATION_ERROR y nada guardado',
    async (field) => {
      const body = Object.fromEntries(Object.entries(vmBody()).filter(([key]) => key !== field));

      const response = await postVm(body).expect(400);

      expect(response.body).toEqual(VALIDATION_ERROR_BODY);
      expect(await listVms(app, adminCookie)).toEqual([]);
    },
  );

  it('los campos ajenos al DTO se ignoran: el servidor fija id y fechas', async () => {
    const response = await postVm(
      vmBody({ id: NONEXISTENT_VM_ID, createdAt: '2000-01-01T00:00:00.000Z', createdBy: 'x' }),
    ).expect(201);

    const item = itemOf(response);
    expect(item.id).not.toBe(NONEXISTENT_VM_ID);
    expect(item.createdAt).not.toBe('2000-01-01T00:00:00.000Z');
  });
});

describe('RF-virtual-machines-05 — reglas de cada campo', () => {
  it.each<[string, Record<string, unknown>]>([
    ['name que empieza con guion', { name: '-web' }],
    ['name que termina con guion', { name: 'web-' }],
    ['name con espacio interno', { name: 'mi servidor' }],
    ['name con tilde', { name: 'número1' }],
    ['name de 64 caracteres', { name: 'a'.repeat(64) }],
    ['name solo con espacios', { name: '   ' }],
    ['name que no es texto', { name: 42 }],
    ['cores decimal', { cores: 2.5 }],
    ['cores como string', { cores: '4' }],
    ['cores en 0', { cores: 0 }],
    ['cores negativo', { cores: -1 }],
    ['cores sobre el máximo', { cores: 129 }],
    ['cores null', { cores: null }],
    ['cores booleano', { cores: true }],
    ['ram en 0', { ram: 0 }],
    ['ram sobre el máximo', { ram: 1025 }],
    ['disk en 0', { disk: 0 }],
    ['disk sobre el máximo', { disk: 65_537 }],
    ['disk enorme', { disk: 1e20 }],
    ['os en minúsculas', { os: 'ubuntu' }],
    ['os fuera del catálogo', { os: 'Windows 11' }],
    ['status en minúsculas', { status: 'encendida' }],
    ['status fuera del conjunto', { status: 'Prendida' }],
  ])('%s: 400 VALIDATION_ERROR y nada guardado', async (_case, overrides) => {
    const response = await postVm(vmBody(overrides)).expect(400);

    expect(response.body).toEqual(VALIDATION_ERROR_BODY);
    expect(await listVms(app, adminCookie)).toEqual([]);
  });

  it.each<[string, Record<string, unknown>]>([
    ['name de un carácter', { name: 'X' }],
    ['name de 63 caracteres', { name: 'a'.repeat(63) }],
    ['name con punto y guion bajo', { name: 'api.prod_2' }],
    ['mínimos', { cores: 1, ram: 1, disk: 1 }],
    ['máximos', { cores: 128, ram: 1024, disk: 65_536 }],
    ['os con espacios en el nombre', { os: VM_OPERATING_SYSTEMS.RHEL }],
    ['status Encendida', { status: VM_STATUSES.ON }],
  ])('%s: se acepta y se guarda tal cual', async (_case, overrides) => {
    const response = await postVm(vmBody(overrides)).expect(201);

    expect(itemOf(response)).toMatchObject(overrides);
  });

  it('cores 4.0 en el JSON es el entero 4', async () => {
    const rawBody = JSON.stringify(vmBody()).replace('"cores":2', '"cores":4.0');

    const response = await request(app.getHttpServer())
      .post('/api/vms')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(201);

    expect(itemOf(response).cores).toBe(4);
  });

  it('un PUT aplica las mismas reglas', async () => {
    const vm = await createVm(app, adminCookie);

    await putVm(vm.id, { ram: 2048 }).expect(400);
    await putVm(vm.id, { name: 'mi servidor' }).expect(400);

    expect(await listVms(app, adminCookie)).toEqual([vm]);
  });
});

describe('RF-virtual-machines-08 — PUT con un cuerpo que no cumple el DTO', () => {
  it.each<[string, unknown]>([
    ['cuerpo vacío', {}],
    ['solo claves ajenas', { foo: 1, id: NONEXISTENT_VM_ID }],
    ['name null', { name: null }],
    ['valor inválido junto a uno válido', { cores: 0, ram: 8 }],
  ])('%s: 400 VALIDATION_ERROR y la VM no cambia', async (_case, body) => {
    const vm = await createVm(app, adminCookie, { name: VALID_VM_BODY.name });

    const response = await putVm(vm.id, body).expect(400);

    expect(response.body).toEqual(VALIDATION_ERROR_BODY);
    expect(await listVms(app, adminCookie)).toEqual([vm]);
  });
});
