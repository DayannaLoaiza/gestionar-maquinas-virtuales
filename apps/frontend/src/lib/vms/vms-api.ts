import { del, get, post, put } from '@/lib/api/fetch-wrapper';

import type { VmItemResponse, VmListResponse } from '@/types/api';
import type {
  CreateVirtualMachineDTO,
  UpdateVirtualMachineDTO,
  VirtualMachine,
} from '@vm/shared-types';

/**
 * Pedidos del navegador a la API de VMs, por el rewrite `/api/*` (RF-app-shell-14). Lanzan
 * `ApiError` ante un error de la API; un `401` además lleva a `/login` (RF-auth-26).
 */

/** `GET /api/vms` (RF-virtual-machines-01). */
export async function fetchVms(): Promise<VirtualMachine[]> {
  const { items } = await get<VmListResponse>('/api/vms');
  return items;
}

/** `POST /api/vms` (RF-virtual-machines-03). */
export async function createVm(dto: CreateVirtualMachineDTO): Promise<VirtualMachine> {
  const { item } = await post<VmItemResponse>('/api/vms', dto);
  return item;
}

/** `PUT /api/vms/:id` con solo los campos cambiados (RF-virtual-machines-07, 20). */
export async function updateVm(
  id: string,
  changes: UpdateVirtualMachineDTO,
): Promise<VirtualMachine> {
  const { item } = await put<VmItemResponse>(`/api/vms/${encodeURIComponent(id)}`, changes);
  return item;
}

/** `DELETE /api/vms/:id` (RF-virtual-machines-09): `204` sin cuerpo. */
export async function deleteVm(id: string): Promise<void> {
  await del(`/api/vms/${encodeURIComponent(id)}`);
}
