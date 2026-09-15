# PHASE 17 — Preview Studio Profesional

## Objetivo

Construir la superficie de previsualización que une:

```text
MashupEnginePlan
      ↓
StemMixer
      ↓
Preview Studio
      ↓
Renderer
      ↓
Audio preview
```

## Capacidades

- Reproducción, pausa y detención.
- Línea de tiempo.
- Seek.
- Estado de reproducción.
- Duración.
- Estado de render.
- Ruta de preview generado.
- Render mediante callback desacoplado.
- Integración directa con `StemMixerPanelController`.
- Manejo de errores.
- Interfaz en español.
- Diseño responsive.
- Preparación para conectar `StemRenderer` desde la capa Electron.

## Principio arquitectónico

La interfaz no implementa DSP ni duplica el renderer.

`PreviewStudioController` recibe una función `onRenderPreview` que conecta la UI con el renderer de la aplicación. Así, el componente sigue siendo testeable sin depender de ffmpeg durante la suite de tests.

## Exclusiones

Esta fase no añade:

- masterización final;
- exportación DJ;
- codificación MP3/AAC;
- análisis de loudness final;
- time-stretch avanzado;
- pitch-shift avanzado;
- automatización;
- colas de render persistentes.

## Contrato

El preview recibe un `MashupEnginePlan` y el `StemMixerState`, y devuelve:

```text
outputPath
durationSeconds
```

La siguiente fase puede utilizar ese resultado para el flujo DJ.

## Criterio de cierre

La fase solo se considera completada cuando pasan:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
