# PHASE 13 — Stem Mixer Profesional

## Objetivo

Crear el núcleo de mezcla profesional para los cuatro stems obligatorios:

- Voces
- Batería
- Bajo
- Otros

Esta fase implementa el **estado y la lógica de mezcla**, no el procesamiento DSP ni la interfaz gráfica. El DSP y el motor de mashups se construirán en fases posteriores.

## Capacidades

- Ganancia independiente por stem.
- Panorama independiente por stem.
- Mute independiente.
- Solo lógico mediante `getEffectiveChannels`.
- Ganancia master.
- Restauración individual.
- Restauración global.
- Snapshots del estado del mezclador.
- Restauración y eliminación de snapshots.
- Validación estricta del estado.
- Protección contra mutaciones externas.
- Límites de ganancia de -60 dB a +12 dB.
- Panorama de -1 a +1.
- Exactamente cuatro canales.

## Arquitectura

```text
StemManifest
    ↓
Stem Mixer State
    ├── Vocals
    ├── Drums
    ├── Bass
    └── Other
         ↓
   Effective Mix State
         ↓
   Phase 14 — Mashup Engine
```

## Exclusiones

Esta fase no añade:

- stems adicionales;
- guitarra;
- piano;
- arquitectura de 6 stems;
- procesamiento DSP destructivo;
- renderizado final;
- interfaz de usuario;
- automatización;
- integración de controles físicos.

## Criterio de cierre

La fase solo se considera completada cuando pasan:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Además, los tests específicos de `StemMixer` deben validar los cuatro canales, controles, límites, mute/solo, snapshots, reset y protección del estado.
