# PHASE 12 — Gestor y Caché Profesional de Stems

## Objetivo

Convertir la caché validada en Phase 11 en un subsistema administrable y seguro.

## Alcance

- Descubrimiento de entradas de caché.
- Inspección individual mediante `cacheKey`.
- Verificación de usabilidad de los cuatro stems.
- Resumen de almacenamiento.
- Eliminación segura de una entrada.
- Limpieza de entradas inválidas.
- Limpieza total controlada.
- Rechazo de claves manipuladas.
- Reutilización de `StemManifest` como contrato.

## Reglas

1. Solo se consideran entradas cuyos directorios tengan una clave SHA-256 hexadecimal de 64 caracteres.
2. Una entrada inválida nunca se presenta como disponible para reproducción.
3. La limpieza de inválidas no elimina entradas válidas.
4. Las rutas de eliminación se construyen desde la raíz de caché y una clave validada.
5. No se modifica la biblioteca musical original.
6. El dominio continúa siendo exclusivamente `vocals`, `drums`, `bass`, `other`.
7. No se introduce soporte para seis stems.

## Archivos

### Crear

- `src/stems/manager.ts`
- `tests/stems/manager.test.ts`
- `docs/PHASE-12-STEMS.md`

### Reemplazar

- `src/stems/index.ts`

## Criterio de cierre

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Todos deben terminar correctamente.
