import type { VirtualMachine } from '@vm/shared-types';

/** `data` de `GET /api/vms` (RF-virtual-machines-01). */
export interface VmListResponse {
  items: VirtualMachine[];
}

/** `data` de `POST /api/vms` y `PUT /api/vms/:id` (RF-virtual-machines-03, 07). */
export interface VmItemResponse {
  item: VirtualMachine;
}
