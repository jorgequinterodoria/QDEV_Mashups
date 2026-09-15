# PHASE 22 — Corrección de lint

El rendimiento ya tenía:

- `typecheck` correcto;
- tests correctos;
- build correcto.

El único bloqueo era ESLint `no-unsafe-finally` en `PerformanceProfiler`, porque los métodos `measure()` y `measureAsync()` lanzaban errores desde un bloque `finally`.

La corrección mueve la finalización de la medición fuera de `finally`:

1. se captura el resultado o la excepción;
2. se registra la métrica;
3. se vuelve a lanzar la excepción original, si existía.

Se añadieron tests específicos para garantizar que una operación que falla conserva su excepción mientras la métrica queda registrada.

Validación requerida:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
