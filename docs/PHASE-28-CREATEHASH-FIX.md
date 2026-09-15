# PHASE 28 — Corrección de runtime `createHash`

## Problema

La acción IPC `stems:separate` fallaba en runtime con:

```text
ReferenceError: createHash is not defined
```

## Corrección

`electron/main.ts` utiliza `createHash` para construir el identificador estable de la pista y ahora importa explícitamente:

```ts
import { createHash } from "node:crypto";
```

No se cambia el contrato de cuatro stems ni el proveedor MLX-Demucs.

## Validación requerida

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:electron
pnpm desktop
```

La validación funcional definitiva es ejecutar desde la interfaz:

1. Estudio de stems.
2. Elegir canción.
3. Separar.
4. Observar progreso.
5. Confirmar `vocals.wav`, `drums.wav`, `bass.wav`, `other.wav`.
