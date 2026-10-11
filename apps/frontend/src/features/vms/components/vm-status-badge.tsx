import { VM_STATUSES } from '@vm/shared-types';

import { Power } from '@/components/svg/power';
import { StatusBadge } from '@/components/ui/status-badge';

import type { StatusTone } from '@/components/ui/status-badge';
import type { VmStatus } from '@vm/shared-types';

/** El tono de cada estado de una VM: el único lugar donde se decide. */
const VM_STATUS_TONES: Record<VmStatus, StatusTone> = {
  [VM_STATUSES.ON]: 'success',
  [VM_STATUSES.OFF]: 'neutral',
};

/** El estado de una VM: ícono, texto y color (el color nunca va solo, RF-virtual-machines-13). */
export function VmStatusBadge({ status }: Readonly<{ status: VmStatus }>) {
  return (
    <StatusBadge tone={VM_STATUS_TONES[status]}>
      <Power />
      {status}
    </StatusBadge>
  );
}
