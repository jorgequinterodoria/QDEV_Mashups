# PHASE 14 — Mashup Engine basado en Stems

## Objetivo

Crear el motor determinista que convierte dos perfiles musicales con stems en un plan de mashup verificable.

## Alcance

El motor implementa:

- validación de dos tracks;
- validación de los cuatro stems obligatorios;
- compatibilidad BPM configurable;
- relación BPM;
- selección independiente de stems por track;
- ganancia independiente por origen;
- duración máxima;
- transición;
- exclusión de stems;
- validación del plan resultante.

## Cuatro stems obligatorios

La arquitectura admite exclusivamente:

1. Voces (`vocals`)
2. Batería (`drums`)
3. Bajo (`bass`)
4. Otros (`other`)

No se añade soporte para guitarra, piano ni configuraciones de seis stems.

## Límites actuales

Esta fase todavía no realiza:

- time-stretch;
- pitch-shift;
- DSP;
- mezcla PCM;
- renderizado WAV/MP3;
- detección automática de frases;
- automatización de volumen;
- crossfades de audio reales.

Esas capacidades pertenecen a fases posteriores.

## Flujo

```text
Track A + Track B
       ↓
Validación
       ↓
Compatibilidad BPM
       ↓
Selección de stems
       ↓
Ganancias / transición
       ↓
MashupStemEngine
       ↓
MashupEnginePlan
       ↓
Phase 15 — Renderer Profesional
```

## Criterio de cierre

La fase solo puede marcarse como completada cuando pasan:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
