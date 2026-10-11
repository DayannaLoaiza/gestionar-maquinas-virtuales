import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';

import { createRealtimeSocket } from './realtime-socket';

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({})) }));

describe('RF-realtime-vm-status-11 socket al mismo origen, con la sesión solo en la cookie', () => {
  it('se crea sin URL y solo con las opciones del contrato: sin auth, query ni cabeceras', () => {
    createRealtimeSocket();

    expect(io).toHaveBeenCalledTimes(1);
    expect(vi.mocked(io).mock.calls[0]).toEqual([
      {
        path: '/api/socket.io',
        transports: ['websocket'],
        addTrailingSlash: false,
        autoConnect: false,
      },
    ]);
  });
});
