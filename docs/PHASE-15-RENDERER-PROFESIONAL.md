# PHASE 15 — Renderer Profesional

## Objetivo

Crear el primer renderer de audio basado en el plan de mashup y los cuatro stems separados.

## Capacidades

- Validación estricta del plan.
- Uso exclusivo de stems incluidos.
- Verificación de archivos de entrada.
- Construcción determinista del grafo `ffmpeg`.
- Ganancia por stem.
- Panorama por stem.
- Offset temporal.
- Recorte por inicio y duración.
- Mezcla multifuente mediante `amix`.
- Salida WAV PCM16.
- Frecuencia de muestreo configurable.
- 1 o 2 canales.
- Protección contra sobrescritura cuando se solicita.
- Cancelación mediante `AbortSignal`.
- Progreso básico.
- Verificación posterior del archivo generado.

## Arquitectura

```text
MashupEnginePlan
      ↓
StemRenderer
      ↓
validación
      ↓
ffmpeg filter graph
      ↓
WAV PCM16
      ↓
Preview / DJ Prep
```

## Alcance de esta fase

Esta implementación establece el renderer profesional inicial.

Todavía quedan para fases posteriores:

- time-stretch musical avanzado;
- pitch shifting;
- beat-aware alignment;
- crossfades musicales avanzados;
- normalización LUFS;
- metadatos finales;
- MP3/AAC;
- colas de render;
- render paralelo;
- UI del renderer.

## Criterio de cierre

La fase solo se considera completada cuando pasan:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
