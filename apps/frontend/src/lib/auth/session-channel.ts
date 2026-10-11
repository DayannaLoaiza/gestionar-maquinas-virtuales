const SESSION_CHANNEL_NAME = 'vm-session';

/** Lo único que viaja entre pestañas: que la sesión cambió. Sin usuario, rol ni token (RF-auth-33). */
export const SESSION_CHANGED_MESSAGE = 'session-changed';

const NOOP = (): void => undefined;

/** `undefined`: todavía no se creó; `null`: el navegador no tiene `BroadcastChannel`. */
let channel: BroadcastChannel | null | undefined;

/**
 * Una sola instancia por pestaña, compartida por quien avisa y quien escucha: un `BroadcastChannel`
 * no se entrega a sí mismo los mensajes que manda (MDN), así que la pestaña que inició o cerró
 * sesión no se recarga.
 */
function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(SESSION_CHANNEL_NAME);
  }
  return channel;
}

/** Avisa a las demás pestañas de la aplicación en este navegador que la sesión cambió. */
export function announceSessionChange(): void {
  getChannel()?.postMessage(SESSION_CHANGED_MESSAGE);
}

/** Escucha los avisos de las demás pestañas; ignora cualquier otro mensaje. */
export function subscribeSessionChange(onChange: () => void): () => void {
  const current = getChannel();
  if (current === null) return NOOP;

  const onMessage = (event: MessageEvent<unknown>): void => {
    if (event.data === SESSION_CHANGED_MESSAGE) onChange();
  };
  current.addEventListener('message', onMessage);
  return () => {
    current.removeEventListener('message', onMessage);
  };
}
