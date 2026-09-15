# PHASE 11 — Implementación

## Archivos

### Crear

- `src/stems/cache.ts`
- `src/stems/provider-mlx-demucs.ts`
- `src/stems/service.ts`
- `tests/stems/service.test.ts`
- `tests/stems/cache.test.ts`
- `tests/stems/provider-mlx-demucs.test.ts`
- `docs/PHASE-11-STEMS.md`

### Reemplazar

- `src/stems/types.ts`
- `src/stems/index.ts`

## Contrato de cuatro stems

```text
vocals
 drums
 bass
 other
```

Los valores son deliberadamente cerrados y forman parte del contrato del producto.

## Modelo

`htdemucs_ft`

No se admite `htdemucs_6s`.

## Validación local

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Estado de la fase

La fase no debe marcarse como completada hasta que el repositorio del usuario pase las cuatro validaciones anteriores y se haya probado al menos una separación real con `mlx-demucs`.
