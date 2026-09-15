# PHASE 20 — Biblioteca Inteligente 2.0

## Objetivo

Convertir la biblioteca analizada en una capa de inteligencia local reutilizable por búsqueda, clasificación y relaciones musicales.

## Archivo principal

`src/library/intelligence.ts`

El servicio no reemplaza el motor de análisis existente. Consume sus resultados y los organiza en perfiles inteligentes.

## Capacidades

### Búsqueda avanzada

Permite combinar texto con filtros de:

- BPM mínimo y máximo.
- Energía mínima y máxima.
- Tonalidad.
- Etiquetas.
- Presencia vocal.
- Instrumentalidad.
- Completitud mínima del análisis.

### Perfiles

Cada track genera un perfil normalizado con:

- BPM.
- tonalidad normalizada.
- clase tonal.
- energía.
- duración.
- cobertura de stems.
- completitud del análisis.
- presencia vocal.
- instrumentalidad.
- texto indexable.

### Relaciones musicales

El motor calcula una relación determinista entre dos tracks usando:

- compatibilidad de tempo;
- compatibilidad armónica;
- cercanía de energía;
- comportamiento vocal;
- duración.

El score es reproducible y normalizado entre `0` y `1`.

### Clasificación

Genera etiquetas locales a partir de análisis y metadatos existentes. No depende de servicios cloud ni de un modelo externo.

### Seguridad de datos

- El estado interno se mantiene mediante copias.
- `get()`, `profile()` y `snapshot()` no exponen referencias mutables.
- Los valores de análisis se validan antes de indexarse.
- No se escriben archivos ni se modifican los archivos originales de audio.
- Los stems siguen siendo exclusivamente `vocals`, `drums`, `bass`, `other`.

## Tests

`tests/library/intelligence.test.ts`

La fase queda cerrada únicamente cuando:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

pasen completos.
