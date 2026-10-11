# Tareas — backend del tiempo real

| Campo                | Valor                                             |
| -------------------- | ------------------------------------------------- |
| Estado               | cerrada                                           |
| Aprobada por / fecha | Dayanna — 2026-10-10 (puerta G2)                  |
| Cerrada              | 2026-10-10, commit `179a83c` (puerta G4, Dayanna) |

Plan: `plan.md` (esta carpeta). Spec: `docs/specs/realtime-vm-status/spec.md`. ⏸ = me detengo y
muestro el diff (G3). Los IDs abreviados (`RF-05`) son `RF-realtime-vm-status-05`.

- [x] T1. Dependencias · `@vm/backend` · (infraestructura: sin ellas no hay RF-realtime-vm-status-01…10) ⏸
      Agrego a `apps/backend/package.json`, en versión exacta: `@nestjs/websockets` 11.2.7,
      `@nestjs/platform-socket.io` 11.2.7, `socket.io` 4.8.3 y `@nestjs/event-emitter` 3.1.0 en
      `dependencies`, y `socket.io-client` 4.8.3 en `devDependencies`. Detención: tú corres
      `pnpm install` en la raíz desde Windows.
      Hecho cuando: confirmas el `pnpm install` sin errores, y en la copia del scratchpad
      `pnpm --filter @vm/backend typecheck` sigue en verde.
- [x] T2. Contrato de tiempo real · `@vm/shared-types` · (RNF-realtime-vm-status-02; contrato de
      RF-realtime-vm-status-03 y RF-realtime-vm-status-05)
      `src/realtime/realtime-events.ts` con `REALTIME_PATH`, `REALTIME_EVENTS`,
      `VmStatusChangedEvent`, `ServerToClientEvents`, `ClientToServerEvents` y
      `RealtimeConnectionErrorData`, exportados en `src/index.ts`. Sin importar `socket.io`.
      Hecho cuando: `pnpm --filter @vm/shared-types build`, `typecheck` y `lint` en verde.
- [x] T3. `auth` y piezas compartidas · `@vm/backend` · (RF-realtime-vm-status-02,
      RF-realtime-vm-status-03, RF-realtime-vm-status-04, RF-realtime-vm-status-08,
      RF-realtime-vm-status-10)
      `AuthService`: `verifySession` (valida sin renovar y comparte la validación con
      `authenticate`), `findEndedSessionIds` y el evento `auth.session-revoked` en `logout`.
      `auth.events.ts`, `SessionRepository.findManyWithUser` y `SessionCookieService.read` con
      `{ cookies?: unknown }`; `AuthModule` exporta `SessionCookieService`. `isOriginAllowed` en
      `shared/utils/origin.util.ts`, usado por `OriginGuard`. `createSecurityHeaders` en
      `app.setup.ts`. `EventEmitterModule.forRoot()` en `AppModule`.
      Hecho cuando: `pnpm --filter @vm/backend typecheck` y `lint` en verde, y los e2e existentes
      de `auth` (`auth`, `auth-throttling`, `roles`, `security-headers`, `users`) siguen en verde
      sin cambios.
- [x] T4. Estado anterior y evento en `virtual-machines` · `@vm/backend` ·
      (RF-realtime-vm-status-05, RF-realtime-vm-status-06)
      `updateById` en una transacción (`pessimistic_write`, `update` y relectura) que devuelve
      `previousStatus`. `virtual-machine.events.ts`. `VirtualMachinesService.update` emite
      `vm.status-changed` con `{ item }` solo si el estado cambió.
      Hecho cuando: `typecheck` y `lint` en verde, y
      `pnpm --filter @vm/backend test:e2e -t "RF-virtual-machines-"` sigue en verde (63 tests) sin
      cambios.
- [x] T5. Módulo `realtime` · `@vm/backend` · (RF-realtime-vm-status-01…10,
      RNF-realtime-vm-status-01, RNF-realtime-vm-status-03, RNF-realtime-vm-status-04)
      `RealtimeIoAdapter` (`cors`, `allowRequest` con `isOriginAllowed`, `helmet` y `cookieParser`
      en Engine.IO), registrado en `configureHttpApp`. `RealtimeGateway`: opciones fijas,
      middleware del handshake en `afterInit`, salas `vms` y `session:<id>`, listeners `@OnEvent`,
      `openSessionIds` y `disconnectSessions`. `handshake-auth.middleware.ts`.
      `RealtimeSessionMonitor` (60 s, `unref`, se limpia al cerrar). Tipos (`SocketData`, servidor
      tipado), constantes y `RealtimeModule` en `AppModule`. Comentario del recorrido del evento en
      el gateway y en el service de VMs.
      Hecho cuando: `pnpm --filter @vm/backend build` (incluida la guarda de alias de `dist/`),
      `typecheck` y `lint` en verde; la API arranca con `node dist/main` contra la base de
      desarrollo, sin errores, y responde `400` a `GET /api/socket.io/?EIO=4&transport=polling`.
- [x] T6. Tests e2e del handshake y del canal · `@vm/backend` · (RF-realtime-vm-status-01,
      RF-realtime-vm-status-02, RF-realtime-vm-status-03, RF-realtime-vm-status-04,
      RF-realtime-vm-status-09, RF-realtime-vm-status-10)
      `test/support/socket-helpers.ts` (conectar, esperar `connect`, `connect_error`, `disconnect`
      o un evento, centinela, upgrade manual con `node:http`) y
      `test/realtime-handshake.e2e-spec.ts`, según la tabla "Pruebas por requisito" del plan. Un
      `describe` por RF con su ID.
      Hecho cuando: `pnpm --filter @vm/backend test:e2e -t "RF-realtime-vm-status-(01|02|03|04|09|10)"`
      en verde, con cada uno de esos 6 IDs presente, y el archivo pasa tres corridas seguidas
      (ningún flaky).
- [x] T7. Tests e2e de difusión y fin de sesión · `@vm/backend` · (RF-realtime-vm-status-05,
      RF-realtime-vm-status-06, RF-realtime-vm-status-07, RF-realtime-vm-status-08)
      `test/realtime.e2e-spec.ts`, según la tabla del plan, con el centinela para los "ningún
      evento".
      Hecho cuando: `test:e2e -t "RF-realtime-vm-status-0[5-8]"` en verde, con los 4 IDs presentes,
      tres corridas seguidas.
- [x] T8. Documentación · raíz, `@vm/backend` · (RNF-realtime-vm-status-05; infraestructura
      documental: mantiene vigentes los mapas de módulos que leen los agentes)
      `README.md`: contrato de tiempo real (ruta, transporte, evento, payload, errores del
      handshake), prueba con Postman (petición Socket.IO), diagrama base cliente ↔ API ↔ tiempo
      real (Mermaid) y requisito de despliegue del upgrade. Módulo `realtime` en
      `apps/backend/CLAUDE.md` (stack y tabla), `nestjs-patterns.md` ("Existing Modules"),
      `.claude/rules/shared-types.md` ("Hoy:"), `CLAUDE.md` raíz (capacidades implementadas) y
      `docs/specs/README.md`.
      Hecho cuando: `pnpm format:check` en verde, y el README ya no dice que el tiempo real llega
      "cuando exista la capacidad".
- [x] T10. Un handshake por conexión · `@vm/backend` · (RF-realtime-vm-status-09; delta aprobado
      por Dayanna el 2026-10-10, tras la revisión local de T9)
      Guarda en `handshake-auth.middleware.ts`: cada conexión Engine.IO entra a un `WeakSet` antes de
      consultar la sesión, y un segundo `CONNECT` por la misma conexión la cierra sin consultar. Test
      e2e en `realtime-handshake.e2e-spec.ts`, dentro del `describe` de RF-09.
      Hecho cuando: `test:e2e -t "RF-realtime-vm-status-09"` en verde, tres corridas seguidas, y el
      test falla si se quita la guarda.
- [x] T11. Ruta sin barra final para pasar por Next · `@vm/shared-types`, `@vm/backend` ·
      (RF-realtime-vm-status-01; delta aprobado por Dayanna el 2026-10-10, tras la verificación
      manual)
      `addTrailingSlash: false` en `REALTIME_GATEWAY_OPTIONS`; `REALTIME_CLIENT_OPTIONS` en
      `@vm/shared-types`; `openSocket` y `rawUpgrade` de los e2e usan la ruta sin barra.
      Hecho cuando: los 37 e2e de tiempo real en verde con la ruta sin barra, y la verificación
      manual a través de Next (login, conexión, evento y desconexión) completa.
- [x] T9. Validación completa y revisión local · todo el repo · (RNF-realtime-vm-status-04;
      infraestructura: cierre antes de G4)
      En la copia del scratchpad: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y
      `pnpm --filter @vm/backend test:e2e` completos. `grep` de `TODO`, `any` y `console.log` en lo
      nuevo. Revisión del diff con contexto nuevo: `code-reviewer`, `api-reviewer` y
      `security-auditor`, contra la spec, la constitución y `docs/testing.md`.
      Hecho cuando: todo en verde sin advertencias, cada hallazgo de la revisión resuelto o
      presentado para aceptar, y la solicitud de G4 lista.
