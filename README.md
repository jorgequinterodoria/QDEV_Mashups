# Phase 28 — Corrección de ruta del worker MLX-Demucs

Reemplazar el archivo completo:

- `src/stems/provider-mlx-demucs.ts`

Después ejecutar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm desktop
```

La prueba funcional debe alcanzar el worker local en `tools/mlx-demucs-worker.py` cuando se ejecuta con `pnpm desktop`.
