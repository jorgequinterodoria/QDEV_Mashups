# PHASE 18 — DJ Prep Real

## Objetivo
Preparar el resultado del mashup para flujo DJ mediante BPM, beatgrid, primer beat, confianza y cues.

## Entrega
- `src/dj/prep.ts`
- `src/dj/index.ts`
- `tests/dj/prep.test.ts`

## Cues
Cada track preparado recibe Intro, Entrada, Transición, Salida y Outro. Todas las posiciones quedan dentro de la duración real declarada.

## Integración
`DjPrepService` recibe el `MashupEnginePlan` y dos fuentes de audio preparadas y devuelve un contrato `MashupDjPrep` validable y estable.

## Exclusiones
No escribe bases privadas de djay ni formatos propietarios. La exportación DJ específica se reserva para las siguientes fases.

## Cierre
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
