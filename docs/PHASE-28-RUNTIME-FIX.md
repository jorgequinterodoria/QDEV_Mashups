# Phase 28 — Corrección de arranque del motor de stems

Se corrigió `electron/main.ts` para importar explícitamente `MlxDemucsProvider`, `StemSeparationService`, `STEM_CHANNELS` y los tipos `StemChannel`/`StemModelName` antes de instanciar el subsistema de separación.

El error original era:

`ReferenceError: MlxDemucsProvider is not defined`

Después de reemplazar `electron/main.ts`, reconstruir Electron antes de lanzar la aplicación.
