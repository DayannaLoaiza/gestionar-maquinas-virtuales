import 'server-only';

import { serverFetchResult } from '@/lib/api/server-fetch';

import type { VmListResponse } from '@/types/api';
import type { VirtualMachine } from '@vm/shared-types';

/**
 * `GET /api/vms` desde el servidor de Next, con la sesión del pedido de la página
 * (RF-app-shell-15). Lanza ante cualquier falla: la precarga no se guarda y el navegador vuelve a
 * pedir el listado (D3 del plan).
 */
export async function fetchVmsOnServer(): Promise<VirtualMachine[]> {
  const result = await serverFetchResult<VmListResponse>('/api/vms');
  if (!result.ok) throw new Error(`No se pudo cargar el listado de VMs (${String(result.status)})`);
  return result.data.items;
}
