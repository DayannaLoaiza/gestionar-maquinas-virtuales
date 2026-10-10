import request from 'supertest';
import { DataSource } from 'typeorm';

import { VM_OPERATING_SYSTEMS } from '@vm/shared-types';

import type { INestApplication } from '@nestjs/common';
import type { ApiSuccess, VirtualMachine } from '@vm/shared-types';
import type { App } from 'supertest/types';

/** Un cuerpo de `POST /api/vms` válido, sin `status`. */
export const VALID_VM_BODY = {
  name: 'web-01',
  cores: 2,
  ram: 4,
  disk: 50,
  os: VM_OPERATING_SYSTEMS.UBUNTU,
} as const;

/** UUID bien formado que no corresponde a ninguna VM. */
export const NONEXISTENT_VM_ID = '00000000-0000-4000-8000-000000000000';

/** Las claves exactas de una VM en la API (RF-virtual-machines-11). */
export const VM_RESPONSE_KEYS = [
  'cores',
  'createdAt',
  'disk',
  'id',
  'name',
  'os',
  'ram',
  'status',
  'updatedAt',
];

export function vmBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...VALID_VM_BODY, ...overrides };
}

export function itemOf(response: request.Response): VirtualMachine {
  return (response.body as ApiSuccess<{ item: VirtualMachine }>).data.item;
}

/** Crea la VM como Administrador y devuelve lo que respondió la API. */
export async function createVm(
  app: INestApplication<App>,
  adminCookie: string,
  overrides: Record<string, unknown> = {},
): Promise<VirtualMachine> {
  const response = await request(app.getHttpServer())
    .post('/api/vms')
    .set('Cookie', adminCookie)
    .send(vmBody(overrides))
    .expect(201);
  return itemOf(response);
}

export async function listVms(
  app: INestApplication<App>,
  cookie: string,
): Promise<VirtualMachine[]> {
  const response = await request(app.getHttpServer())
    .get('/api/vms')
    .set('Cookie', cookie)
    .expect(200);
  return (response.body as ApiSuccess<{ items: VirtualMachine[] }>).data.items;
}

/** Vacía solo las VMs: los usuarios y sus sesiones siguen sirviendo entre tests. */
export async function clearVms(app: INestApplication<App>): Promise<void> {
  await app.get(DataSource).query('TRUNCATE TABLE "virtual_machines"');
}
