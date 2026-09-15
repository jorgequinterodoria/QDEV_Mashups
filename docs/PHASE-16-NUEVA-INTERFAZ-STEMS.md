# PHASE 16 — Nueva interfaz de Stems

## Objetivo

Construir la interfaz profesional visible del mezclador de stems sobre los contratos ya validados en Phase 13, manteniendo exactamente cuatro canales:

- Voces
- Batería
- Bajo
- Otros

## Componentes

- `src/ui/stem-mixer-panel.ts`
- `src/ui/stem-mixer.css`
- `tests/ui/stem-mixer-panel.test.ts`

## Capacidades

- Panel visual de cuatro canales.
- Ganancia independiente.
- Panorama independiente.
- Mute.
- Solo.
- Restablecimiento individual.
- Ganancia master.
- Indicador visual de estado.
- Snapshots.
- Restablecimiento global.
- Estado reproducible.
- Etiquetas en español.
- Responsive para ventanas más estrechas.
- Reutilizable en el renderer de Electron mediante `StemMixerPanelController.mount()`.

## Regla de cuatro stems

No se muestran ni contemplan:

- guitarra;
- piano;
- configuraciones de seis stems;
- canales adicionales.

## Integración

El panel es un componente DOM reutilizable y no crea una segunda lógica de mezcla: delega el estado de audio al `StemMixer` existente.

La integración definitiva dentro de la pantalla concreta del renderer debe conservar la arquitectura de navegación existente y montar el componente en el contenedor correspondiente.

## Criterio de cierre

La fase solo se considera completada cuando pasan:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
