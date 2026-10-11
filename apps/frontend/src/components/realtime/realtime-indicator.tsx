'use client';

import { Loader2 } from '@/components/svg/loader-2';
import { Wifi } from '@/components/svg/wifi';
import { WifiOff } from '@/components/svg/wifi-off';
import { StatusBadge } from '@/components/ui/status-badge';

import { useRealtimeStatus } from './realtime-context';

import type { StatusTone } from '@/components/ui/status-badge';
import type { RealtimeStatus } from '@/lib/realtime/realtime-connection';
import type { ComponentType, SVGProps } from 'react';

const STATUS_VIEW: Record<
  RealtimeStatus,
  { label: string; tone: StatusTone; icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  live: { label: 'En vivo', tone: 'success', icon: Wifi },
  connecting: { label: 'Conectando…', tone: 'neutral', icon: Loader2 },
  offline: { label: 'Sin conexión en tiempo real', tone: 'warning', icon: WifiOff },
};

/**
 * El estado del tiempo real, con ícono y texto (RF-realtime-vm-status-16). Sin conexión, el panel
 * sigue funcionando por REST; un cambio de estado no muestra toasts, solo se anuncia acá.
 */
export function RealtimeIndicator() {
  const status = useRealtimeStatus();
  const { label, tone, icon: Icon } = STATUS_VIEW[status];
  return (
    <StatusBadge tone={tone} role="status" className="text-sm">
      <Icon className={status === 'connecting' ? 'animate-spin' : undefined} />
      {label}
    </StatusBadge>
  );
}
