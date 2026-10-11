/**
 * Eventos internos de `virtual-machines` (`EventEmitter2`). El módulo solo anuncia lo que pasó; los
 * escucha `realtime`, sin que `virtual-machines` sepa que existen los sockets. El payload es
 * `VmStatusChangedEvent` de `@vm/shared-types`: el mismo que recibe el cliente.
 */
export const VM_EVENTS = {
  STATUS_CHANGED: 'vm.status-changed',
} as const;
