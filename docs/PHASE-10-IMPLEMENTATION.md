# PHASE 10 — Arquitectura Desktop y Español

## Alcance de esta entrega

Esta fase establece dos contratos obligatorios para las siguientes fases:

1. La interfaz de QDEV Mashups se presenta en español (`es-CO`).
2. El dominio de stems queda fijado exclusivamente a cuatro canales: voces, batería, bajo y otros.

## Regla de stems

QDEV no usará el modelo experimental de seis stems. No se implementarán `guitar` ni `piano` como canales de separación.

El contrato único es:

- `vocals`
- `drums`
- `bass`
- `other`

## Criterio de cierre

La fase solo se considera completa después de ejecutar en el repositorio:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Todos deben terminar correctamente.
