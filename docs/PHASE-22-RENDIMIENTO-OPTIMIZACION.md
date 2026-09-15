# PHASE 22 — Rendimiento y Optimización

## Objetivo

Incorporar utilidades de rendimiento reutilizables para que el pipeline de QDEV pueda reducir trabajo repetido y controlar operaciones costosas sin modificar la semántica musical.

## Componentes

### `PerformanceCache`

Caché MRU con:

- límite de entradas;
- TTL opcional;
- estadísticas de hits/misses;
- hit rate;
- expulsiones;
- limpieza de elementos caducados.

### `PerformanceProfiler`

Medición determinista de:

- duración;
- agregación;
- promedio;
- mínimo;
- máximo;
- p95;
- metadatos.

Soporta operaciones síncronas y asíncronas.

### `runBatched`

Ejecutor limitado por concurrencia para operaciones independientes.

Permite:

- controlar concurrencia;
- acumular errores;
- detener nuevas tareas ante un error;
- medir duración total.

## Principios

La fase no altera:

- el análisis musical;
- la lógica de compatibilidad;
- el renderer;
- el formato DJ;
- los 4 stems;
- los archivos originales.

Las optimizaciones son infraestructurales y reutilizables por fases posteriores.

## Criterio de cierre

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Las cuatro comprobaciones deben quedar verdes.
