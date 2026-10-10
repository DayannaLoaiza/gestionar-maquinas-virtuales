# Tareas — <cambio>

| Campo                | Valor                                            |
| -------------------- | ------------------------------------------------ |
| Estado               | borrador · aprobada · cerrada                    |
| Aprobada por / fecha | <persona> — AAAA-MM-DD (puerta G2, o G1+G2 en M) |
| Cerrada              | AAAA-MM-DD, PR #<n> (puerta G4)                  |

<G3 es a pedido: marca con ⏸ las tareas tras las que el agente debe detenerse y mostrar su diff.
Sin marca, implementa todas y se detiene en G4.>

- [ ] T1. <qué> · `<paquete>` · (RF-<slug>-01, RF-<slug>-02) ⏸
      Hecho cuando: <test `RF-<slug>-01 …` en verde (Crítico) / comprobación visible (Estándar)>.
- [ ] T2. Retirar <archivo › test> · motivo: <señal de `docs/testing.md`> (solo si hay; en M reemplaza a la
      tabla de retiros del plan)
