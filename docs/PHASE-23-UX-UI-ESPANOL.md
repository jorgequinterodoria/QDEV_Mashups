# PHASE 23 — UX/UI Completa en Español

## Objetivo

Establecer el contrato final de UX/UI de QDEV Mashups en español de Colombia (`es-CO`) sin introducir traducciones parciales ni estados inconsistentes.

La interfaz histórica ya define `es-CO` como idioma obligatorio y expone las secciones principales como Inicio, Biblioteca, Descubrimiento, Constructor, Estudio de previsualización y Preparación DJ. fileciteturn75file0L19-L36

## Archivos

- `src/ui/ux-spanish.ts`
- `tests/ui/ux-spanish.test.ts`
- `docs/PHASE-23-UX-UI-ESPANOL.md`

## Contrato de interfaz

El módulo centraliza:

- navegación;
- acciones principales;
- estados;
- mensajes de error;
- mensajes de recuperación;
- estados de carga;
- mensajes del flujo;
- atributos ARIA;
- región viva para errores;
- indicación de ocupado;
- tokens visuales comunes;
- formato numérico `es-CO`.

## Accesibilidad

Se establecen contratos para:

- `aria-label`;
- `aria-busy`;
- `aria-live`;
- `aria-current`;
- regiones de estado;
- altura mínima de controles interactivos;
- foco visible;
- ancho legible.

## Consistencia

La fase evita agregar nuevas etiquetas en inglés a la capa de producto. El proyecto debe mantener toda la aplicación en español según el documento de continuidad. fileciteturn74file1L52-L70

## Alcance

Esta fase no modifica la arquitectura de audio, el renderer, el motor de mashups ni el contrato de cuatro stems. El contrato de interfaz queda preparado para ser consumido por las vistas y componentes existentes.

Los cuatro stems siguen siendo exclusivamente `vocals`, `drums`, `bass` y `other`. fileciteturn74file1L67-L69

## Criterio de cierre

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Las cuatro comprobaciones deben pasar antes de cerrar Phase 23.
